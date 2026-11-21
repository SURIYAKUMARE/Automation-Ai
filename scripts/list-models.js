const https = require('https');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Available models:');
      if (parsed.models) {
        parsed.models.forEach(m => {
          if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
            console.log(m.name, m.displayName, m.supportedGenerationMethods);
          }
        });
      } else {
        console.log(parsed);
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  });
}).on('error', err => console.log('HTTP error:', err.message));
