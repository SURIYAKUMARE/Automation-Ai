const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');

async function testSingle(m) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    console.log(`[${res.status}] ${m}:`, res.ok ? data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.slice(0, 30) : data.error?.message?.slice(0, 80));
  } catch (e) {
    console.log(`[ERR] ${m}:`, e.message);
  }
}

async function run() {
  await testSingle('gemini-2.5-flash');
  await testSingle('gemini-2.5-flash-lite');
  await testSingle('gemini-3.8-flash');
  await testSingle('gemini-3.5-flash');
}

run();
