# Cài đặt FastALPR

FastALPR chạy trực tiếp trong backend bằng CPU. Ảnh từ camera được frontend gửi
đến `POST /api/parking-sessions/recognize-plate`; backend phát hiện vùng biển số,
đọc ký tự và chỉ trả kết quả đủ độ tin cậy. Không cần API key và không cần thay
đổi database.

## 1. Cài trên máy cá nhân

Yêu cầu:

- Node.js theo cấu hình hiện tại của backend.
- Python 3.10 trở lên.
- Khoảng 300 MB dung lượng trống cho thư viện và mô hình.

Tại thư mục backend, chạy:

```powershell
npm install
npm run setup:fast-alpr
```

Lệnh cài đặt sẽ:

1. Cài thư viện Python vào `.python-packages`.
2. Tải mô hình vào `.fast-alpr-models`.
3. Khởi động thử mô hình để lần quét đầu tiên không phải chờ tải.

Hai thư mục trên đã được bỏ qua trong Git.

## 2. Kiểm tra bằng một ảnh

```powershell
npm run test:fast-alpr -- "C:\duong-dan\anh-bien-so.jpg"
```

Kết quả thành công có `engine: "FAST_ALPR"`, `plateNumber` và các mức tin cậy.
Sau đó chạy backend như bình thường:

```powershell
npm run dev
```

Đăng nhập bằng tài khoản nhân viên và mở màn hình xe vào. Camera sẽ đọc liên tục
và chỉ tự điền sau khi cùng một biển số khớp ba lần.

## 3. Cấu hình trên Render

Trong dịch vụ backend trên Render:

1. Mở `Settings`.
2. Đặt `Build Command`:

```bash
npm ci && npm run setup:fast-alpr
```

3. Giữ `Start Command`:

```bash
npm start
```

4. Trong `Environment`, thêm:

```txt
FAST_ALPR_MIN_CONFIDENCE=72
FAST_ALPR_TIMEOUT_MS=60000
FAST_ALPR_THREADS=1
FAST_ALPR_DETECTOR_CONFIDENCE=0.4
```

Các biến tên mô hình đã có giá trị mặc định, chỉ cần thêm khi muốn ghi đè:

```txt
FAST_ALPR_DETECTOR_MODEL=yolo-v9-t-384-license-plate-end2end
FAST_ALPR_OCR_MODEL=cct-xs-v2-global-model
```

5. Chọn `Manual Deploy` rồi `Deploy latest commit`.
6. Trong log build, kiểm tra có dòng `[FastALPR] Cài đặt hoàn tất.`

Render có `python3` và `pip` trong môi trường native. Nếu dịch vụ cũ dùng một
Python quá thấp, thêm biến `PYTHON_VERSION` với một bản Python 3.10 trở lên.

## 4. Điều chỉnh khi nhận diện

- `FAST_ALPR_MIN_CONFIDENCE`: ngưỡng chấp nhận kết quả, mặc định `72`.
- `FAST_ALPR_DETECTOR_CONFIDENCE`: ngưỡng tìm vùng biển số, mặc định `0.4`.
- `FAST_ALPR_TIMEOUT_MS`: thời gian tối đa cho một lần đọc, mặc định 60 giây.
- `FAST_ALPR_THREADS`: số luồng CPU, mặc định `1` để phù hợp Render free.
- `FAST_ALPR_PYTHON_BIN`: đường dẫn Python tùy chỉnh; thường không cần đặt.
- `FAST_ALPR_MODEL_CACHE`: thư mục lưu mô hình tùy chỉnh; thường không cần đặt.

Không có mô hình nào chính xác 100% trong mọi điều kiện. Camera nên nhìn thẳng
biển số, đủ sáng, không rung và biển số chiếm phần lớn khung quét. Giao diện vẫn
cho phép nhân viên sửa thủ công trước khi xác nhận.
