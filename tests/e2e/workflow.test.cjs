const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
const { once } = require('node:events');
const { resolve } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const sharp = require('sharp');

function fixturePhoto() {
  return sharp({ create: { width: 80, height: 60, channels: 3, background: '#dc253b' } }).jpeg().toBuffer();
}

async function openPort() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function startApp(t, overrides = {}) {
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
        GOOGLE_CLIENT_ID: 'fixture.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'test-google-secret',
        ...overrides,
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
  const unconfirmed = await request('/api/auth/login', { status: 403, json: { email: 'unconfirmed@test.invalid', password: 'fixture-password' } });
  assert.match((await unconfirmed.json()).error, /confirm your email/i);
  const google = await request('/api/auth/google', { status: 307 });
  const googleConsent = new URL(google.headers.get('location'));
  assert.equal(googleConsent.searchParams.get('redirect_uri'), origin + '/api/auth/google/callback');
  const callback = await request('/api/auth/google/callback?' + new URLSearchParams({
    code: 'fixture-google-code', state: googleConsent.searchParams.get('state'),
  }), { status: 307, headers: { Cookie: google.headers.get('set-cookie').split(';')[0] } });
  assert.equal(callback.headers.get('location'), origin + '/dashboard');
  assert.ok(callback.headers.getSetCookie().some((value) => value.startsWith('socialsync_session=')));
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
  assert.match(await studio.text(), /Create a post/);

  const picture = await fixturePhoto();
  const form = new FormData();
  form.append('file', new Blob([picture], { type: 'image/jpeg' }), 'fixture.jpg');
  const upload = await (await request('/api/media/upload', { method: 'POST', body: form, status: 201 })).json();
  assert.equal(upload.asset.width, 80);
  assert.equal(upload.asset.height, 60);
  const duplicate = await (await request('/api/media/upload', { method: 'POST', body: form })).json();
  assert.equal(duplicate.asset.id, upload.asset.id);
  assert.equal(duplicate.duplicate, true);
  const invalid = new FormData();
  invalid.append('file', new Blob([Buffer.from([255, 216, 255, 0])], { type: 'image/jpeg' }), 'corrupt.jpg');
  await request('/api/media/upload', { method: 'POST', body: invalid, status: 415 });
  const generated = await (await request('/api/ai/generate', { json: {
    mediaBase64: picture.toString('base64'), mimeType: 'image/jpeg', targetPlatforms: ['facebook'], alternatives: true,
  } })).json();
  assert.equal(generated.source, 'Gemini');
  assert.equal(generated.variants.facebook.alternatives.length, 2);
  const unreadable = await (await request('/api/ai/generate', { status: 422, json: {
    mediaBase64: picture.toString('base64'), mimeType: 'image/jpeg', prompt: 'unreadable fixture', targetPlatforms: ['facebook'],
  } })).json();
  assert.match(unreadable.error, /clearer photo or video/);
  await request('/api/ai/generate', { status: 400, json: {
    mediaBase64: picture.toString('base64'), mimeType: 'image/jpeg', isMediaVideo: true, prompt: 'Do not fall back to this text',
  } });

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

test('placeholder credentials report a configuration error on both sign-in methods', async (t) => {
  const { origin } = await startApp(t, {
    SUPABASE_URL: 'https://your-project.supabase.co', GOOGLE_CLIENT_ID: 'your_google_client_id.apps.googleusercontent.com',
  });
  const login = await fetch(origin + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fixture@test.invalid', password: 'fixture-password' }),
  });
  assert.equal(login.status, 503);
  assert.match((await login.json()).error, /valid Supabase project URL and server key/);
  assert.equal(login.headers.get('set-cookie'), null);
  const google = await fetch(origin + '/api/auth/google', { redirect: 'manual' });
  assert.equal(google.status, 307);
  assert.equal(new URL(google.headers.get('location'), origin).href, origin + '/login?error=google_configuration');
});

test('approved upload automation analyzes original bytes and queues only once', { timeout: 55_000 }, async (t) => {
  const { origin, workerSecret } = await startApp(t);
  const login = await fetch(origin + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fixture@test.invalid', password: 'fixture-password' }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  async function json(path, body, expected, method = 'POST') {
    const response = await fetch(origin + path, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    assert.equal(response.status, expected, JSON.stringify(data));
    return data;
  }
  const form = new FormData();
  form.append('file', new Blob([await fixturePhoto()], { type: 'image/jpeg' }), 'red.jpg');
  const response = await fetch(origin + '/api/media/upload', { method: 'POST', headers: { Cookie: cookie }, body: form });
  assert.equal(response.status, 201);
  const { asset } = await response.json();
  await json('/api/automation/uploads', { mediaAssetId: asset.id }, 403);
  const settings = { enabled: true, accountIds: ['20000000-0000-4000-8000-000000000000'] };
  await json('/api/automation/upload-settings', settings, 400, 'PUT');
  await json('/api/automation/upload-settings', { ...settings, acknowledged: true }, 200, 'PUT');
  const queued = await json('/api/automation/uploads', { mediaAssetId: asset.id }, 202);
  assert.equal(queued.post.status, 'approved');
  const duplicate = await json('/api/automation/uploads', { mediaAssetId: asset.id }, 200);
  assert.equal(duplicate.post.id, queued.post.id);
  assert.equal(duplicate.duplicate, true);
  const worker = async () => (await fetch(origin + '/api/scheduler/execute', { headers: { Authorization: 'Bearer ' + workerSecret } })).json();
  assert.equal((await worker()).executedCount, 1);
  assert.equal((await worker()).executedCount, 0);
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
  await page.getByRole('heading', { name: 'Publishing overview' }).waitFor();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Create post' }).click();
  await page.waitForURL('**/dashboard/create-post');
  await page.getByRole('checkbox', { name: 'Fixture Page' }).waitFor();
  const video = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const finished = new Promise((resolve) => { recorder.onstop = resolve; });
    recorder.start();
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = '#151515';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#40f5ec';
      ctx.fillRect(i * 5, 20, 14, 14);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    recorder.stop();
    await finished;
    stream.getTracks().forEach((track) => track.stop());
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'moving-square.webm', mimeType: 'video/webm', buffer: Buffer.from(video) });
  await page.getByText('A square moves across the frame', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  assert.equal(await page.getByText('A square moves across the frame', { exact: true }).count(), 0);
  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 12;
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'poster.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
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

test('desktop organizes media and reschedules a queued post by dragging it', { timeout: 90_000 }, async (t) => {
  const { chromium } = require('playwright');
  const { origin } = await startApp(t);
  const browser = await chromium.launch({ channel: process.env.SOCIALFLOW_BROWSER_CHANNEL || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin + '/login');
  await page.locator('input[type=email]').fill('fixture@test.invalid');
  await page.locator('input[type=password]').fill('fixture-password');
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: 'Publishing overview' }).waitFor();
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Media library' }).click();
  await page.getByText('No media matches this view.').waitFor();
  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 12;
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  await page.getByLabel('Upload media').setInputFiles({ name: 'campaign.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
  await page.getByText('campaign.jpg', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  await page.getByRole('textbox', { name: 'Collection for campaign.jpg' }).fill('Launch');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Collection updated', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'File name' }).fill('nothing');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByText('No media matches this view.').waitFor();
  await page.getByRole('textbox', { name: 'File name' }).fill('campaign');
  await page.getByRole('textbox', { name: 'Collection filter' }).fill('Launch');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('link', { name: 'Use in post' }).click();
  await page.getByText('Saved media', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Fixture Page' }).waitFor();
  await page.locator('input[type=file]').setInputFiles({ name: 'campaign.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
  await page.getByText('A test poster', { exact: true }).waitFor();
  const created = page.waitForResponse((response) => response.url().endsWith('/api/posts/create') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add to queue', exact: true }).click();
  const response = await created;
  assert.equal(response.status(), 201);
  const { post } = await response.json();
  await page.waitForURL('**/dashboard/queue');
  await page.getByRole('cell', { name: post.title }).waitFor();
  await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Calendar', exact: true }).click();
  const chip = page.getByRole('button', { name: post.title, exact: true });
  await chip.waitFor();
  const date = new Date(post.scheduled_for);
  date.setDate(date.getDate() + 1);
  const localKey = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  let target = page.locator('[data-date="' + localKey + '"]');
  if (!(await target.count())) {
    date.setDate(date.getDate() - 2);
    const prior = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    target = page.locator('[data-date="' + prior + '"]');
  }
  const moved = page.waitForResponse((entry) => entry.url().endsWith('/api/posts/schedule') && entry.request().method() === 'POST');
  await chip.dragTo(target);
  assert.equal((await moved).status(), 200);
  await target.getByRole('button', { name: post.title, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await page.getByRole('button', { name: 'Next week' }).waitFor();
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await page.getByRole('button', { name: 'Next day' }).waitFor();
  assert.deepEqual(errors, []);
});
