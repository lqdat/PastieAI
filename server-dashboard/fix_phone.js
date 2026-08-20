const db = require('./database');

async function run() {
  try {
    const res = await db.query(`
      UPDATE sessions 
      SET claimed_by_admin_id = NULL, 
          requested_agent = FALSE 
      WHERE platform = 'whatsapp'
    `);
    console.log('Reset WhatsApp sessions:', res.rowCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
