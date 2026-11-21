const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');
const genAI = new GoogleGenerativeAI(apiKey);

async function testModelWithImage(modelName) {
  console.log(`\n--- TESTING ${modelName} ---`);
  try {
    const buffer = fs.readFileSync('public/logo.png');
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
    const prompt = `Return a JSON object with keys:
    {
      "summary": "Short description of the image",
      "platforms": {
        "linkedin": { "caption": "LinkedIn post", "hashtags": ["#AI", "#SaaS"] },
        "instagram": { "caption": "Insta post", "hashtags": ["#SocialSync"] },
        "facebook": { "caption": "Facebook post", "hashtags": ["#Community"] },
        "youtube": { "title": "YT Video Title", "caption": "YT description", "hashtags": ["#Tutorial"] }
      }
    }`;
    const start = Date.now();
    const res = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'image/png'
        }
      }
    ]);
    const duration = Date.now() - start;
    console.log(`SUCCESS in ${duration}ms:`, res.response.text());
  } catch (e) {
    console.log(`FAIL ${modelName}:`, e.message);
  }
}

async function run() {
  await testModelWithImage('gemini-3.5-flash-lite');
  await testModelWithImage('gemini-3-flash-preview');
  await testModelWithImage('gemini-flash-lite-latest');
}

run();
