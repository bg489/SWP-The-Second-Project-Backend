# Thiết lập đăng nhập Google và OTP đăng ký

## 1. Chạy migration

Chạy đúng một lần trên cơ sở dữ liệu đang dùng:

```sql
SOURCE db/migration_20260730_google_auth_email_verification.sql;
```

Migration bổ sung thông tin liên kết Google, trạng thái xác minh email, trạng
thái chọn tòa lần đầu và bảng lưu OTP. Tài khoản đã tồn tại được giữ quyền đăng
nhập như trước.

## 2. Tạo OAuth client cho đăng nhập Google

1. Mở Google Cloud Console và chọn dự án.
2. Vào **Google Auth Platform**.
3. Hoàn tất **Branding** và **Audience**. Trong giai đoạn thử nghiệm, thêm các
   Gmail dùng để demo vào danh sách người dùng thử nghiệm.
4. Vào **Clients**, chọn **Create client**.
5. Chọn loại **Web application**.
6. Thêm **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - địa chỉ frontend đã triển khai, ví dụ
     `https://swp-the-second-project-frontend-sooty.vercel.app`
7. Luồng hiện tại dùng nút Google trả kết quả về JavaScript nên không cần khai
   báo redirect URI.
8. Sao chép **Client ID** có đuôi
   `.apps.googleusercontent.com`.

Không đặt đường dẫn như `/login` trong JavaScript origin. Origin chỉ gồm giao
thức, tên miền và cổng.

## 3. Khai báo biến môi trường

Frontend local, tạo hoặc cập nhật `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Frontend trên Vercel, thêm:

```env
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Backend local và Render, thêm cùng Client ID:

```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
REGISTRATION_OTP_EXPIRES_MINUTES=15
```

Frontend và backend phải dùng cùng một Web Client ID. Đăng nhập Google theo
luồng này không cần Client Secret.

## 4. Cấu hình Gmail gửi OTP

OTP đăng ký dùng lại Gmail API của backend. Giữ các biến sau trên local và
Render:

```env
GMAIL_CLIENT_ID=your-gmail-oauth-client-id
GMAIL_CLIENT_SECRET=your-gmail-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
GMAIL_FROM_EMAIL=your-sender@gmail.com
GMAIL_FROM_NAME=Sunrise Parking
```

OAuth client dùng để cấp quyền gửi Gmail có thể trùng hoặc khác client đăng nhập
Google. `GMAIL_REFRESH_TOKEN` phải được cấp với quyền
`https://www.googleapis.com/auth/gmail.send`.

## 5. Triển khai và kiểm tra

1. Redeploy backend sau khi thêm biến môi trường và chạy migration.
2. Redeploy frontend sau khi thêm `VITE_GOOGLE_CLIENT_ID`.
3. Mở trang đăng nhập bằng cửa sổ ẩn danh.
4. Thử đăng ký thường, nhập OTP Gmail rồi đăng nhập.
5. Thử đăng nhập Google bằng email chưa có trong hệ thống. Hệ thống phải chuyển
   sang trang chọn tòa, sau đó mới mở trang cư dân.
6. Đăng xuất rồi đăng nhập Google lần nữa. Hệ thống phải vào thẳng trang cư dân
   và không hỏi lại tòa.
