const db = require('../server-dashboard/database');

async function updateWhatsAppPhones() {
  try {
    const res = await db.query(`
      UPDATE sessions 
      SET visitor_phone = platform_sender_id,
          browser = 'WhatsApp',
          device = 'WhatsApp Mobile'
      WHERE platform = 'whatsapp' AND (visitor_phone IS NULL OR browser IS NULL);
    `);
    console.log('Updated rows:', res.rowCount);

    const check = await db.query(`
      SELECT id, visitor_name, visitor_phone, platform_sender_id, platform, browser, device 
      FROM sessions 
      WHERE platform = 'whatsapp';
    `);
    console.log('WhatsApp sessions in DB:', JSON.stringify(check.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

updateWhatsAppPhones();
