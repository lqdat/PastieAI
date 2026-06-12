const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;

// Verify token
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'pastie_verify_token_2026';
const APP_SECRET = process.env.META_APP_SECRET || 'meta_app_secret_placeholder_2026';

async function runWebhookTests() {
  console.log('--- STARTING WEBHOOK VERIFICATION TESTS ---');

  try {
    // 1. Test GET handshake verify token matching env
    console.log('1. Testing GET handshake verify token matching env...');
    const handshakeUrl = `${baseUrl}/api/multichannel/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=chal_12345`;
    const handshakeRes = await fetch(handshakeUrl);
    console.log(`Response Status: ${handshakeRes.status}`);
    const handshakeBody = await handshakeRes.text();
    console.log(`Response Body: ${handshakeBody}`);
    if (handshakeRes.status !== 200 || handshakeBody !== 'chal_12345') {
      throw new Error(`GET Handshake failed: expected status 200 and body 'chal_12345', got ${handshakeRes.status} and '${handshakeBody}'`);
    }
    console.log('GET Handshake test passed!');

    // 2. Test GET handshake mismatch
    console.log('2. Testing GET handshake verify token mismatch...');
    const mismatchUrl = `${baseUrl}/api/multichannel/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=chal_12345`;
    const mismatchRes = await fetch(mismatchUrl);
    console.log(`Response Status: ${mismatchRes.status}`);
    if (mismatchRes.status !== 403) {
      throw new Error(`GET Handshake mismatch test failed: expected status 403, got ${mismatchRes.status}`);
    }
    console.log('GET Handshake mismatch test passed!');

    // 3. Test POST Webhook Payload with signature validation
    console.log('3. Testing POST Webhook Payload...');
    
    // We mock a WhatsApp business payload
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'waba_id_123',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '123456789',
              phone_number_id: 'test_phone_id_999'
            },
            contacts: [{
              profile: { name: 'Test Customer' },
              wa_id: '84999999999'
            }],
            messages: [{
              from: '84999999999',
              id: 'wamid.HBgLODQ5ODg4ODg4ODgVAgASGBQzQTdDNEMwQzRDNUMwQzRDNUMwQzRDMDMxAA==',
              timestamp: '1600000000',
              text: { body: 'Xin chào, tôi muốn hỏi giá vé du lịch' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const payloadString = JSON.stringify(payload);
    
    // Calculate signature
    const signature = 'sha256=' + crypto
      .createHmac('sha256', APP_SECRET)
      .update(payloadString)
      .digest('hex');

    console.log(`Generated Signature Header: ${signature}`);

    const postUrl = `${baseUrl}/api/multichannel/webhook`;
    const postRes = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature
      },
      body: payloadString
    });

    console.log(`POST Webhook Response Status: ${postRes.status}`);
    if (postRes.status !== 200) {
      throw new Error(`POST Webhook failed: expected status 200, got ${postRes.status}`);
    }
    console.log('POST Webhook test passed!');

    // 4. Test POST Webhook Payload with invalid signature
    console.log('4. Testing POST Webhook with invalid signature...');
    const invalidPostRes = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid_hash_value'
      },
      body: payloadString
    });

    console.log(`POST Webhook (Invalid Signature) Response Status: ${invalidPostRes.status}`);
    if (invalidPostRes.status !== 401) {
      throw new Error(`POST Webhook (Invalid Signature) test failed: expected status 401, got ${invalidPostRes.status}`);
    }
    console.log('POST Webhook (Invalid Signature) test passed!');

    console.log('--- ALL WEBHOOK TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('--- TEST FAILED: ---', error);
  }
}

runWebhookTests();
