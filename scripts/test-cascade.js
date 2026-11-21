const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');
const genAI = new GoogleGenerativeAI(apiKey);

const CANDIDATE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
];

async function generateWithFallback(prompt, buffer) {
  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.8,
          maxOutputTokens: 4096,
        },
      });

      const parts = [prompt];
      if (buffer) {
        parts.push({
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/png',
          },
        });
      }

      const res = await model.generateContent(parts);
      const text = res.response.text();
      console.log(`[Gemini] Model ${modelName} SUCCEEDED! Response length: ${text.length}`);
      return JSON.parse(text);
    } catch (err) {
      console.warn(`[Gemini] Model ${modelName} failed: ${err.message?.slice(0, 80)}`);
      lastError = err;
    }
  }

  throw lastError;
}

async function test() {
  const buf = fs.readFileSync('public/logo.png');
  const res = await generateWithFallback('Return JSON with summary and topics', buf);
  console.log('Result topics:', res.topics);
}

test();
