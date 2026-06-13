const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenerativeAI(key);
  
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest'
  ];

  for (const modelName of modelsToTest) {
    console.log(`\nTesting model: ${modelName}...`);
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Reply with exactly: OK');
      console.log(`[${modelName}] RESULT:`, result.response.text().trim());
      console.log(`[${modelName}] STATUS: SUCCESS!`);
    } catch (e) {
      console.log(`[${modelName}] ERROR:`, e.message);
    }
  }
}

testModels();

