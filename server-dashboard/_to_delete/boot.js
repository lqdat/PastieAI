// Smoke test: nạp server.js với DB tạm để bắt lỗi tham chiếu hàm không tồn tại.
process.env.DATABASE_URL = process.env.SMOKE_DB;
process.env.PORT = '54999';
process.env.NODE_ENV = 'test';
require('./server.js');
setTimeout(() => { console.log('BOOT OK'); process.exit(0); }, 4000);
