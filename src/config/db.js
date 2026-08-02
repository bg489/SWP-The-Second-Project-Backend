/**
 * @fileoverview Khởi tạo và xuất cấu hình dùng chung của backend trong db.
 *
 * Luồng chính: Dữ liệu đầu vào -> xử lý theo trách nhiệm của module -> xuất kết quả cho lớp gọi.
 * Các chú thích bên dưới mô tả trách nhiệm của từng hàm và khối cấu hình quan trọng.
 */
/**
 * Khai báo `mysql` để nạp module phụ thuộc để sử dụng dịch vụ, hằng số hoặc hàm hỗ trợ mà tệp này cần.
 * Phạm vi sử dụng: src/config/db.js.
 */
const mysql = require("mysql2/promise");
require("dotenv").config({ override: true });

/**
 * Khai báo `sslConfig` để đọc cấu hình môi trường và cung cấp giá trị mặc định an toàn.
 * Phạm vi sử dụng: src/config/db.js.
 */
const sslConfig =
    process.env.DB_SSL === "true"
        ? {
              rejectUnauthorized: false,
          }
        : undefined;

/**
 * Khai báo `pool` để đọc cấu hình môi trường và cung cấp giá trị mặc định an toàn.
 * Phạm vi sử dụng: src/config/db.js.
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000,
    ssl: sslConfig,
});

module.exports = pool;
