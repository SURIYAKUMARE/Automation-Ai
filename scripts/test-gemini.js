const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  console.log('Testing gemini-2.5-flash with JSON config...');
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.85,
        maxOutputTokens: 4096,
      },
    });
    const res = await model.generateContent('Return JSON: {"message": "hello world"}');
    console.log('SUCCESS JSON:', res.response.text());
  } catch (e) {
    console.log('ERROR JSON:', e.message);
  }

  console.log('Testing model with image...');
  try {
    const fs = require('fs');
    const imagePath = 'public/logo.png';
    if (fs.existsSync(imagePath)) {
      const buffer = fs.readFileSync(imagePath);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });
      const res = await model.generateContent([
        'Analyze this logo and return JSON with keys summary and topics',
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/png'
          }
        }
      ]);
      console.log('SUCCESS IMAGE:', res.response.text());
    }
  } catch (e) {
    console.log('ERROR IMAGE:', e.message);
  }
}

test();
