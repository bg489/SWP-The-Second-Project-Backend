# SWP The Second Project Backend

Backend Node.js/Express/MySQL cho hệ thống quản lý giữ xe chung cư.

## Setup local

1. Copy `.env.example` thành `.env`.
2. Điền thông tin database MySQL/Aiven. Nếu dùng Aiven, giữ `DB_SSL=true`.
3. Cài thư viện:

```bash
npm.cmd install
npm.cmd run setup:fast-alpr
```

4. Chạy server:

```bash
npm.cmd run dev
```

5. Mở Swagger:

```txt
http://localhost:5000/api-docs
```

## Nhận diện biển số bằng FastALPR

Backend dùng FastALPR chạy trực tiếp bằng CPU, không cần API key và không gửi
ảnh biển số sang dịch vụ bên thứ ba. Xem hướng dẫn cài local, kiểm thử và cấu
hình Render tại:

```txt
docs/fast_alpr_setup.md
```

## Migration cho database Aiven hiện tại

Nếu database đã có bảng sẵn, backup trước rồi chạy:

```txt
db/migration_20260611_aiven_rbac_parking_floors.sql
```

## API chính đã gộp

- Auth/Register/Login/JWT
- Users + Admin User Management
- RBAC roles: `ADMIN`, `MANAGER`, `STAFF`, `USER`
- User status: `ACTIVE`, `LOCKED`, `INACTIVE`
- Buildings
- Parking floors + parking slots
- Vehicles
- Slot registrations
- Monthly passes
- Parking sessions
- Payments/VNPay
