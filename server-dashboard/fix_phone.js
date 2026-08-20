const db = require('./database');

async function run() {
  try {
    await db.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_by_admin_id INT REFERENCES admins(id) ON DELETE SET NULL;`);
    console.log('Added created_by_admin_id column to admins table successfully.');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
