-- Tổng quan tệp: Nâng cấp có kiểm soát dữ liệu hoặc cấu trúc đã tồn tại cho phiên bản ghi trong tên tệp.
-- Luồng thực thi: chọn cơ sở dữ liệu -> kiểm tra trạng thái hiện tại -> áp dụng từng thay đổi theo thứ tự.

-- Giải thích: Chọn cơ sở dữ liệu đích trước khi tạo hoặc nâng cấp cấu trúc.
USE apartment_parking_db;

-- Giải thích: Nâng cấp cấu trúc hoặc ràng buộc của bảng violations.
ALTER TABLE violations
    MODIFY evidence_url MEDIUMTEXT NULL;
