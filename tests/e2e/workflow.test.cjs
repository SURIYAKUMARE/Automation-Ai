const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { once } = require('node:events');
const { resolve } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

async function openPort() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function startApp(t) {
  const port = await openPort();
  const origin = 'http://127.0.0.1:' + port;
  const workerSecret = 'test-worker-secret-fixture-at-least-32';
  const app = spawn(process.execPath, ['--require', resolve('tests/e2e/mock-upstream.cjs'),
    require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
      env: {
        ...process.env, NODE_OPTIONS: '', APP_URL: origin, SUPABASE_URL: 'https://fixture.supabase.co',
        SUPABASE_SECRET_KEY: 'test-supabase-key', SUPABASE_SERVICE_ROLE_KEY: 'test-supabase-key',
        TOKEN_ENCRYPTION_KEY: 'a'.repeat(64), SESSION_SECRET: 'b'.repeat(64), CRON_SECRET: workerSecret,
        GEMINI_API_KEY: 'test-gemini-key', GEMINI_MODELS: 'gemini-fixture',
        META_APP_ID: 'test-meta-app-id', META_APP_SECRET: 'test-meta-app-secret',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  let logs = '';
  app.stdout.on('data', (chunk) => { logs += chunk; });
  app.stderr.on('data', (chunk) => { logs += chunk; });
  t.after(() => { if (app.exitCode === null) app.kill(); });
  let ready = false;
  for (let attempt = 0; attempt < 80 && app.exitCode === null; attempt++) {
    const response = await fetch(origin + '/login').catch(() => null);
    if (response?.ok) { ready = true; break; }
    await delay(250);
  }
  assert.ok(ready, logs);
  return { origin, workerSecret, diagnostics: () => logs };
}

test('production HTTP workflow with mocked providers', { timeout: 55_000 }, async (t) => {
  const { origin, workerSecret, diagnostics } = await startApp(t);
  let cookie = '';
  async function request(path, { status = 200, json, headers = {}, ...options } = {}) {
    const response = await fetch(origin + path, {
      ...options, redirect: 'manual', headers: { ...(cookie ? { Cookie: cookie } : {}),
        ...(json ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(json ? { body: JSON.stringify(json), method: options.method || 'POST' } : {}),
    });
    assert.equal(response.status, status, path + ' ' + (response.status !== status ? await response.clone().text() : '') + '\n' + diagnostics());
    return response;
  }

  await request('/dashboard', { status: 307 });
  await request('/api/posts', { status: 401 });
  await request('/api/auth/login', { status: 401, json: { email: 'fixture@test.invalid', password: 'bad-password' } });
  const login = await request('/api/auth/login', { json: { email: 'fixture@test.invalid', password: 'fixture-password' } });
  cookie = login.headers.get('set-cookie').split(';')[0];
  const oauth = await request('/api/oauth/facebook', { status: 307 });
  const consent = new URL(oauth.headers.get('location'));
  assert.ok(consent.searchParams.get('state'));
  const binding = oauth.headers.get('set-cookie').split(';')[0];
  const rejected = await request('/api/oauth/facebook/callback?state=invalid&code=fixture', { status: 307, headers: {
    Cookie: cookie + '; ' + binding,
  } });
  assert.ok(new URL(rejected.headers.get('location')).searchParams.has('error'));
  await request('/api/ai/generate', { status: 401, json: { prompt: 'test' }, headers: { Origin: 'https://different.test' } });
  const studio = await request('/dashboard/create-post');
  assert.match(await studio.text(), /Publish Now/);

  const picture = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
  const form = new FormData();
  form.append('file', new Blob([picture], { type: 'image/jpeg' }), 'fixture.jpg');
  const upload = await (await request('/api/media/upload', { method: 'POST', body: form, status: 201 })).json();
  const generated = await (await request('/api/ai/generate', { json: {
    mediaBase64: picture.toString('base64'), mimeType: 'image/jpeg', targetPlatforms: ['facebook'], alternatives: true,
  } })).json();
  assert.equal(generated.source, 'Gemini');
  assert.equal(generated.variants.facebook.alternatives.length, 2);

  const id = '60000000-0000-4000-8000-000000000000';
  const post = await (await request('/api/posts/create', { status: 201, json: {
    requestId: id, mediaAssetId: upload.asset.id, publishingMode: 'manual_approval', targetPlatforms: ['facebook'],
    variants: [{ platform: 'facebook', caption: generated.variants.facebook.caption, hashtags: generated.variants.facebook.hashtags }],
  } })).json();
  assert.equal(post.post.status, 'pending_approval');
  const workerHeaders = { Authorization: 'Bearer ' + workerSecret };
  assert.equal((await (await request('/api/scheduler/execute', { headers: workerHeaders })).json()).executedCount, 0);
  await request('/api/scheduler/execute', { status: 401 });
  await request('/api/posts/' + id + '/approve', { json: {
    action: 'approved', publishImmediately: true,
    captions: { '70000000-0000-4000-8000-000000000000': 'Human-edited caption.' },
  } });
  assert.equal((await (await request('/api/scheduler/execute', { headers: workerHeaders })).json()).executedCount, 1);
  assert.equal((await (await request('/api/scheduler/execute', { headers: workerHeaders })).json()).executedCount, 0);
  const status = await (await request('/api/posts/status?postId=' + id)).json();
  assert.equal(status.post.status, 'published');
  assert.equal(status.post.post_targets[0].status, 'published');
});

test('mobile browser reviews, approves and tracks an uploaded post', { timeout: 150_000 }, async (t) => {
  const { chromium } = require('playwright');
  const { origin, workerSecret } = await startApp(t);
  const browser = await chromium.launch({ channel: process.env.SOCIALFLOW_BROWSER_CHANNEL || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(20_000);
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto(origin + '/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=email]').fill('fixture@test.invalid');
  await page.locator('input[type=password]').fill('fixture-password');
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
  await page.goto(origin + '/dashboard/create-post', { waitUntil: 'domcontentloaded' });
  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 12;
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'poster.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
  await page.getByRole('button', { name: 'Generate with Gemini AI' }).click();
  await page.getByText('A test poster', { exact: true }).waitFor();
  await page.getByLabel('Send to Approval Center before publishing').check();
  await page.getByRole('button', { name: 'Publish Now', exact: true }).click();
  await page.waitForURL('**/dashboard/approvals');
  await page.locator('textarea').fill('Human-edited caption.');
  await page.getByRole('button', { name: 'Approve & Publish Now' }).click();
  await page.getByText('Post approved and queued', { exact: true }).waitFor();
  const worker = await fetch(origin + '/api/scheduler/execute', {
    headers: { Authorization: 'Bearer ' + workerSecret },
  });
  assert.equal(worker.status, 200, worker.status !== 200 ? await worker.text() : '');
  assert.equal((await worker.json()).executedCount, 1);
  await page.goto(origin + '/dashboard/history', { waitUntil: 'domcontentloaded' });
  await page.getByRole('cell').getByText(/^published$/i).filter({ visible: true }).first().waitFor();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.equal(fits, true, 'mobile history must not overflow the viewport');
  assert.deepEqual(failures, []);
});
