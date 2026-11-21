const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');
const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
  'gemini-3.5-flash',
  'gemini-3.8-flash'
];

async function testAll() {
  for (const m of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('ping');
      console.log(`[PASS] ${m}:`, res.response.text().trim().slice(0, 30));
    } catch (e) {
      console.log(`[FAIL] ${m}:`, e.message.slice(0, 100));
    }
  }
}

testAll();
