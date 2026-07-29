# Gửi email bằng Gmail API trên Render

Backend ưu tiên Gmail API qua HTTPS khi đủ các biến `GMAIL_*`. Cách này phù
hợp với Render free vì không cần kết nối đến cổng SMTP. SMTP cũ vẫn được giữ
để chạy ở máy cá nhân.

## 1. Tạo quyền gửi thư trên Google

1. Mở [Google Cloud Console](https://console.cloud.google.com/) và tạo hoặc
   chọn một dự án.
2. Trong **APIs & Services**, bật
   [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com).
3. Cấu hình **OAuth consent screen**. Khi ứng dụng còn ở trạng thái thử nghiệm,
   thêm Gmail dùng để gửi thư vào danh sách người dùng thử.
4. Tạo **OAuth client ID**. Có thể dùng OAuth Playground để lấy refresh token;
   khi đó thêm `https://developers.google.com/oauthplayground` vào redirect URI.
5. Mở [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/),
   bật **Use your own OAuth credentials**, nhập client ID và client secret.
6. Chọn quyền `https://www.googleapis.com/auth/gmail.send`, đăng nhập đúng tài
   khoản gửi thư, cấp quyền rồi đổi authorization code lấy refresh token.

Google có thể làm refresh token của ứng dụng thử nghiệm hết hạn. Trước khi demo
lâu dài, chuyển OAuth consent screen sang trạng thái phát hành phù hợp hoặc tạo
lại refresh token.

## 2. Khai báo trên Render

Trong **Environment** của web service backend, thêm:

```text
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_FROM_EMAIL=your-sender@gmail.com
GMAIL_FROM_NAME=Sunrise Parking
FRONTEND_URL=https://your-frontend.vercel.app
```

`GMAIL_FROM_EMAIL` phải là tài khoản đã cấp quyền cho refresh token. Không commit
giá trị thật vào Git.

## 3. Kiểm tra

Khởi động lại dịch vụ sau khi thêm biến. Thử chức năng quên mật khẩu hoặc cập
nhật hồ sơ cần xác minh. Khi gửi thành công, service trả provider
`GMAIL_API`. Nếu chưa cấu hình Gmail API lẫn SMTP, backend chỉ ghi
`[mail:preview]` trong log và không gửi thư thật.

Tài liệu Google:

- [Gmail API - Send email](https://developers.google.com/gmail/api/guides/sending)
- [OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
