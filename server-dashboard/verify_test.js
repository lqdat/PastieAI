const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
    ? { rejectUnauthorized: false }
    : false
});

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');
  const testSessionId = 'test-uuid-closed-session-12345';
  
  try {
    // 1. Insert a test session with status 'closed'
    await pool.query('DELETE FROM sessions WHERE id = $1', [testSessionId]);
    await pool.query(
      `INSERT INTO sessions (id, project_id, visitor_name, visitor_email, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [testSessionId, 'pastie-landingpage', 'Test Visitor', 'test@visitor.com', 'closed']
    );
    console.log('Inserted closed test session in database.');

    // 2. Query GET /api/chats/:sessionId/messages
    console.log('Testing GET message history for closed session...');
    let res = await fetch(`http://localhost:3000/api/chats/${testSessionId}/messages`);
    console.log(`Status: ${res.status}`);
    let body = await res.json();
    console.log('Body:', body);
    if (res.status !== 410) {
      throw new Error(`Expected status 410, got ${res.status}`);
    }

    // 3. Query POST /api/chats/message
    console.log('Testing POST message for closed session...');
    res = await fetch('http://localhost:3000/api/chats/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        sender: 'visitor',
        text: 'hello',
        targetLang: 'vi'
      })
    });
    console.log(`Status: ${res.status}`);
    body = await res.json();

    console.log('Body:', body);
    if (res.status !== 410) {
      throw new Error(`Expected status 410, got ${res.status}`);
    }

    // 4. Query GET with non-existent session
    console.log('Testing GET message history for non-existent session...');
    res = await fetch(`http://localhost:3000/api/chats/non-existent-session-id/messages`);
    console.log(`Status: ${res.status}`);
    body = await res.json();
    console.log('Body:', body);
    if (res.status !== 404) {
      throw new Error(`Expected status 404, got ${res.status}`);
    }

    console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('--- TEST FAILED: ---', error);
  } finally {
    // Cleanup
    await pool.query('DELETE FROM sessions WHERE id = $1', [testSessionId]);
    await pool.end();
  }
}

runTests();
