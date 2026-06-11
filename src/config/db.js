const mysql = require("mysql2/promise");
require("dotenv").config({ override: true });

const sslConfig =
    process.env.DB_SSL === "true"
        ? {
              rejectUnauthorized: false,
          }
        : undefined;

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
