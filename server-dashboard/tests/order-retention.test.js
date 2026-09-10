const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');

assert.match(source, /WHERE status = 'superseded' AND payment_method IS NOT NULL/);
assert.match(source, /WHERE status IN \('pending_confirm', 'awaiting_payment'\)\s+AND payment_method IS NULL/);
console.log('✓ Giữ lại hóa đơn cũ sau khi khách đã chọn phương thức thanh toán.');
