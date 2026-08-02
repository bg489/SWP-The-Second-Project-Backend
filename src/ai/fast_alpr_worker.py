#!/usr/bin/env python3
"""Long-lived FastALPR worker using newline-delimited JSON over stdio."""

# Luồng chính: nhận ảnh base64 từ Node.js -> FastALPR phát hiện và OCR -> xếp hạng ứng viên -> trả JSON.
# Các chú thích dưới đây mô tả cấu hình, dữ liệu trung gian và trách nhiệm của từng hàm.

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import statistics
import sys
import traceback
from pathlib import Path
from typing import Any

# Giới hạn số luồng của các thư viện tính toán để worker dùng tài nguyên ổn định trên máy chủ.
os.environ.setdefault("OMP_NUM_THREADS", os.getenv("FAST_ALPR_THREADS", "1"))
os.environ.setdefault("OPENBLAS_NUM_THREADS", os.getenv("FAST_ALPR_THREADS", "1"))
os.environ.setdefault("MKL_NUM_THREADS", os.getenv("FAST_ALPR_THREADS", "1"))

import cv2  # noqa: E402
import numpy as np  # noqa: E402
import onnxruntime as ort  # noqa: E402
from fast_alpr import ALPR  # noqa: E402
from fast_plate_ocr.inference import hub as ocr_hub  # noqa: E402
from open_image_models.detection.core import hub as detector_hub  # noqa: E402


# DETECTOR_MODEL: Tên mô hình mặc định, có thể thay thế bằng biến môi trường khi triển khai.
DETECTOR_MODEL = os.getenv(
    "FAST_ALPR_DETECTOR_MODEL",
    "yolo-v9-t-384-license-plate-end2end",
)
# OCR_MODEL: Tên mô hình mặc định, có thể thay thế bằng biến môi trường khi triển khai.
OCR_MODEL = os.getenv("FAST_ALPR_OCR_MODEL", "cct-xs-v2-global-model")
# DETECTOR_CONFIDENCE: Ngưỡng tin cậy tối thiểu để mô hình giữ lại vùng biển số phát hiện được.
DETECTOR_CONFIDENCE = float(os.getenv("FAST_ALPR_DETECTOR_CONFIDENCE", "0.4"))
# THREAD_COUNT: Số luồng CPU tối đa dành cho ONNX Runtime.
THREAD_COUNT = max(1, int(os.getenv("FAST_ALPR_THREADS", "1")))
# VIETNAMESE_PLATE_PATTERNS: Tập biểu thức chính quy dùng để ưu tiên các ứng viên có hình thức giống biển số Việt Nam.
VIETNAMESE_PLATE_PATTERNS = (
    re.compile(r"^\d{2}[A-Z]\d{4,6}$"),
    re.compile(r"^\d{2}[A-Z]\d[A-Z0-9]{4,6}$"),
    re.compile(r"^\d{2}[A-Z]{2}\d{4,6}$"),
)


# Hàm emit: Chuyển payload thành một dòng JSON, ghi ra stdout và flush ngay để tiến trình Node.js nhận phản hồi.
def emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=True, separators=(",", ":")) + "\n")
    sys.stdout.flush()


# Hàm configure_model_cache: Tạo thư mục cache mô hình và trỏ hai thư viện nhận diện về cùng vị trí lưu trữ.
def configure_model_cache() -> Path:
    configured = os.getenv("FAST_ALPR_MODEL_CACHE")
    cache_root = Path(configured or ".fast-alpr-models").expanduser().resolve()
    cache_root.mkdir(parents=True, exist_ok=True)
    detector_hub.MODEL_CACHE_DIR = cache_root / "open-image-models"
    ocr_hub.MODEL_CACHE_DIR = cache_root / "fast-plate-ocr"
    return cache_root


# Hàm create_session_options: Cấu hình ONNX Runtime chạy tuần tự với số luồng CPU đã giới hạn.
def create_session_options() -> ort.SessionOptions:
    options = ort.SessionOptions()
    options.intra_op_num_threads = THREAD_COUNT
    options.inter_op_num_threads = 1
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    return options


# Hàm create_model: Khởi tạo FastALPR bằng mô hình phát hiện biển số, OCR và bộ thực thi CPU đã cấu hình.
def create_model() -> ALPR:
    configure_model_cache()
    return ALPR(
        detector_model=DETECTOR_MODEL,
        detector_conf_thresh=DETECTOR_CONFIDENCE,
        detector_providers=["CPUExecutionProvider"],
        detector_sess_options=create_session_options(),
        ocr_model=OCR_MODEL,
        ocr_device="cpu",
        ocr_providers=["CPUExecutionProvider"],
        ocr_sess_options=create_session_options(),
    )


# Hàm normalize_plate_text: Loại ký tự phân cách và chuẩn hóa kết quả OCR thành chuỗi chữ-số viết hoa.
def normalize_plate_text(value: Any) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


# Hàm mean_confidence: Quy đổi một hoặc nhiều điểm tin cậy OCR thành giá trị trung bình duy nhất.
def mean_confidence(value: Any) -> float:
    if isinstance(value, (list, tuple, np.ndarray)):
        numbers = [float(item) for item in value if item is not None]
        return statistics.fmean(numbers) if numbers else 0.0
    return float(value or 0.0)


# Hàm is_vietnamese_plate: Kiểm tra chuỗi OCR có khớp một trong các cấu trúc biển số Việt Nam được hỗ trợ hay không.
def is_vietnamese_plate(value: str) -> bool:
    return any(pattern.fullmatch(value) for pattern in VIETNAMESE_PLATE_PATTERNS)


# Hàm build_candidates: Lọc, chấm điểm và sắp xếp các biển số ứng viên từ kết quả phát hiện cùng OCR.
def build_candidates(results: list[Any]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []

    for result in results:
        ocr = getattr(result, "ocr", None)
        raw_text = normalize_plate_text(getattr(ocr, "text", ""))
        if not raw_text or len(raw_text) < 4 or len(raw_text) > 12:
            continue

        digit_count = sum(character.isdigit() for character in raw_text)
        letter_count = sum(character.isalpha() for character in raw_text)
        if digit_count < 2 or letter_count < 1:
            continue

        detection = getattr(result, "detection", None)
        detector_confidence = float(getattr(detection, "confidence", 0.0) or 0.0)
        ocr_confidence = mean_confidence(getattr(ocr, "confidence", 0.0))
        combined_confidence = (ocr_confidence * 0.65) + (detector_confidence * 0.35)
        vietnamese_format = is_vietnamese_plate(raw_text)
        rank_score = combined_confidence + (0.08 if vietnamese_format else 0.0)
        bounding_box = getattr(detection, "bounding_box", None)

        candidates.append(
            {
                "rawText": raw_text,
                "confidence": round(combined_confidence * 100, 2),
                "ocrConfidence": round(ocr_confidence * 100, 2),
                "detectionConfidence": round(detector_confidence * 100, 2),
                "rankScore": round(rank_score, 6),
                "vietnameseFormat": vietnamese_format,
                "region": getattr(ocr, "region", None),
                "regionConfidence": (
                    round(float(getattr(ocr, "region_confidence", 0.0)) * 100, 2)
                    if getattr(ocr, "region_confidence", None) is not None
                    else None
                ),
                "boundingBox": (
                    {
                        "x1": int(getattr(bounding_box, "x1", 0)),
                        "y1": int(getattr(bounding_box, "y1", 0)),
                        "x2": int(getattr(bounding_box, "x2", 0)),
                        "y2": int(getattr(bounding_box, "y2", 0)),
                    }
                    if bounding_box is not None
                    else None
                ),
            }
        )

    candidates.sort(
        key=lambda item: (
            item["rankScore"],
            item["ocrConfidence"],
            item["detectionConfidence"],
        ),
        reverse=True,
    )
    return candidates


# Hàm decode_image: Giải mã ảnh base64 thành ma trận OpenCV và báo lỗi nếu dữ liệu ảnh không hợp lệ.
def decode_image(encoded_image: str) -> np.ndarray:
    try:
        image_bytes = base64.b64decode(encoded_image, validate=True)
    except (ValueError, TypeError) as error:
        raise ValueError("Invalid base64 image.") from error

    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise ValueError("FastALPR could not decode the image.")
    return image


# Hàm recognize: Chạy mô hình trên ảnh, chọn ứng viên tốt nhất và tạo dữ liệu nhận diện trả về backend.
def recognize(model: ALPR, encoded_image: str) -> dict[str, Any]:
    image = decode_image(encoded_image)
    candidates = build_candidates(model.predict(image))
    selected = candidates[0] if candidates else None

    return {
        "engine": "FAST_ALPR",
        "rawText": selected["rawText"] if selected else "",
        "confidence": selected["confidence"] if selected else 0,
        "ocrConfidence": selected["ocrConfidence"] if selected else 0,
        "detectionConfidence": selected["detectionConfidence"] if selected else 0,
        "region": selected["region"] if selected else None,
        "candidates": candidates[:5],
    }


# Hàm run_worker: Duy trì vòng lặp đọc từng yêu cầu JSON từ stdin và gửi kết quả hoặc lỗi tương ứng.
def run_worker(model: ALPR) -> None:
    emit(
        {
            "type": "ready",
            "engine": "FAST_ALPR",
            "detectorModel": DETECTOR_MODEL,
            "ocrModel": OCR_MODEL,
        }
    )

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        request_id = None
        try:
            payload = json.loads(line)
            request_id = payload.get("id")
            if payload.get("type") == "shutdown":
                return

            result = recognize(model, payload.get("image", ""))
            emit({"id": request_id, "ok": True, "result": result})
        except Exception as error:  # noqa: BLE001
            traceback.print_exc(file=sys.stderr)
            emit(
                {
                    "id": request_id,
                    "ok": False,
                    "error": str(error) or error.__class__.__name__,
                }
            )


# Hàm main: Đọc tham số dòng lệnh, khởi tạo mô hình, chạy warmup hoặc bắt đầu worker nhận diện lâu dài.
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--warmup",
        action="store_true",
        help="Download and initialize the configured models, then exit.",
    )
    args = parser.parse_args()

    try:
        model = create_model()
        if args.warmup:
            emit(
                {
                    "type": "ready",
                    "engine": "FAST_ALPR",
                    "detectorModel": DETECTOR_MODEL,
                    "ocrModel": OCR_MODEL,
                }
            )
            return 0

        run_worker(model)
        return 0
    except Exception as error:  # noqa: BLE001
        traceback.print_exc(file=sys.stderr)
        emit({"type": "fatal", "error": str(error) or error.__class__.__name__})
        return 1


# Chỉ khởi chạy main khi tệp được thực thi trực tiếp bởi tiến trình Python.
if __name__ == "__main__":
    raise SystemExit(main())
