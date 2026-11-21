const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');

const models = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash'
];

async function checkModels() {
  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[PASS 200] ${m}:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.slice(0, 30));
      } else {
        console.log(`[FAIL ${res.status}] ${m}:`, data.error?.message?.slice(0, 80));
      }
    } catch (e) {
      console.log(`[ERROR] ${m}:`, e.message);
    }
  }
}

checkModels();
