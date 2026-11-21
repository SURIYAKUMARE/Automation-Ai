const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');

const candidateModels = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

async function check(m) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with OK' }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (res.ok) {
      console.log(`[PASS 200] ${m}:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.slice(0, 30));
    } else {
      console.log(`[FAIL ${res.status}] ${m}:`, data.error?.message?.slice(0, 70));
    }
  } catch (e) {
    console.log(`[ERR] ${m}:`, e.message);
  }
}

async function main() {
  for (const m of candidateModels) {
    await check(m);
  }
}

main();
