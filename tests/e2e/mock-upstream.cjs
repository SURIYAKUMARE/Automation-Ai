// Test-only transport. Reject every unrelated external request.
const { createCipheriv, randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const fetchReal = globalThis.fetch;
const owner = '10000000-0000-4000-8000-000000000000';
const accountId = '20000000-0000-4000-8000-000000000000';
const assetId = '30000000-0000-4000-8000-000000000000';
const targetId = '40000000-0000-4000-8000-000000000000';
const jobId = '50000000-0000-4000-8000-000000000000';
const token = 'mock-facebook-token';
const iv = randomBytes(16);
const cipher = createCipheriv('aes-256-gcm', Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex'), iv);
const encrypted = cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
const account = {
  id: accountId, user_id: owner, platform: 'facebook', status: 'active',
  external_account_id: 'test-page',
  encrypted_access_token: [iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted].join(':'),
};

let media;
let original;
let automation;
let post;
let targets = [];
let variants = [];
let queued = false;
let publishes = 0;

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const path = url.pathname;
  const body = () => JSON.parse(init.body);
  const json = (data, status = 200) => Response.json(data, { status });
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return fetchReal(input, init);
  if (url.hostname === 'oauth2.googleapis.com') {
    assert.equal(new URLSearchParams(init.body).get('code'), 'fixture-google-code');
    return json({ access_token: 'fixture-google-access-token' });
  }
  if (url.hostname === 'www.googleapis.com' && path === '/oauth2/v2/userinfo') {
    return json({ id: '123456', email: 'google@test.invalid', verified_email: true, name: 'Google Fixture' });
  }
  if (url.hostname === 'generativelanguage.googleapis.com') {
    const request = body();
    const parts = request.contents[0].parts;
    const images = parts.filter((part) => part.inlineData?.mimeType.startsWith('image/'));
    assert.ok(parts[0].text.includes('attached visuals are the primary source'));
    const isVideo = parts[0].text.includes('Chronological still frames');
    if (isVideo) {
      assert.equal(images.length, 6);
      assert.ok(new Set(images.map((image) => image.inlineData.data)).size > 1);
    } else {
      assert.equal(images.length, 1);
    }
    const unreadable = parts[0].text.includes('unreadable fixture');
    return json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({
      summary: isVideo ? 'A square moves across the frame' : 'A test poster',
      detected_objects: [isVideo ? 'moving square' : 'poster'], sentiment: 'neutral',
      media_review: { readable: !unreadable, observations: unreadable ? [] : [isVideo ? 'A square moves' : 'A visible poster'] },
      platforms: { facebook: { caption: isVideo ? 'Watch the square move.' : 'A generated fixture caption.', hashtags: ['community'],
        alternatives: ['Fixture alternative one.', 'Fixture alternative two.'] } },
    }) }] }, finishReason: 'STOP' }] });
  }
  if (url.hostname === 'graph.facebook.com') {
    assert.equal(method, 'POST');
    assert.match(path, /\/test-page\/photos$/);
    const form = new URLSearchParams(init.body);
    assert.equal(form.get('access_token'), token);
    assert.match(form.get('caption'), post.publishing_mode === 'automatic' ? /^A generated fixture caption\./ : /^Human-edited caption\./);
    assert.match(form.get('url'), /^https:\/\/fixture\.supabase\.co\/storage\/v1\/object\/sign\//);
    assert.equal(++publishes, 1);
    return json({ id: 'provider-photo-id', post_id: 'provider-post-id' });
  }
  assert.equal(url.hostname, 'fixture.supabase.co', 'Unexpected external network request');
  if (path === '/auth/v1/token') {
    const credentials = body();
    if (credentials.password !== 'fixture-password') return json({ code: 'invalid_credentials', msg: 'Invalid credentials' }, 400);
    if (credentials.email === 'unconfirmed@test.invalid') return json({ error_code: 'email_not_confirmed', msg: 'Email not confirmed' }, 400);
    return json({ access_token: 'session-fixture', refresh_token: 'refresh-fixture', expires_in: 3600,
      token_type: 'bearer', user: { id: owner, email: credentials.email, user_metadata: { full_name: 'Fixture Owner' }, created_at: new Date().toISOString() } });
  }
  if (path === '/rest/v1/profiles' && method === 'POST') return new Response(null, { status: 201 });
  if (path.startsWith('/storage/v1/object/sign/')) return json({ signedURL: path.replace('/storage/v1', '') + '?token=fixture' });
  if (/^\/storage\/v1\/object\/(?:authenticated\/)?media-assets\//.test(path)) {
    if (method === 'GET') return new Response(original, { headers: { 'Content-Type': 'image/jpeg' } });
    if (!path.endsWith('.thumb.jpg')) original = init.body;
    return json({ Key: path.split('/object/')[1] });
  }
  if (path === '/rest/v1/media_assets' && method === 'POST') {
    media = { ...body(), id: assetId };
    return json(media, 201);
  }
  if (path === '/rest/v1/media_assets') {
    const checksum = url.searchParams.get('checksum_sha256');
    return json(media && (!checksum || checksum === 'eq.' + media.checksum_sha256) ? [media] : []);
  }
  if (path === '/rest/v1/upload_automation') {
    if (method !== 'POST') return json(automation ? [automation] : []);
    automation = body();
    return json(automation);
  }
  if (path === '/rest/v1/brand_profiles') return json([]);
  if (path === '/rest/v1/social_accounts') return json([{ id: accountId, platform: 'facebook', status: 'active', account_name: 'Fixture Page' }]);
  if (path === '/rest/v1/rpc/consume_ai_request') return json(true);
  if (path === '/rest/v1/rpc/create_campaign' || path === '/rest/v1/rpc/create_automatic_campaign') {
    const input = body();
    assert.equal(input.owner_id, owner);
    if (path.endsWith('create_automatic_campaign')) {
      assert.equal(input.consent_revision, automation.revision);
      assert.deepEqual(input.destinations.map((account) => account.id), automation.account_ids);
      queued = true;
    }
    if (!post) {
      post = { ...input.campaign, user_id: owner, created_at: new Date().toISOString() };
      variants = input.variants.map((variant) => ({ ...variant, id: '70000000-0000-4000-8000-000000000000', is_approved: false }));
      targets = [{ id: targetId, platform: 'facebook', status: 'pending_approval' }];
    }
    return json(post);
  }
  if (path === '/rest/v1/rpc/manage_campaign') {
    const input = body();
    assert.equal(input.owner_id, owner);
    assert.equal(input.campaign_id, post.id);
    assert.equal(input.operation, 'approved');
    variants[0].caption = Object.values(input.edits)[0];
    variants[0].is_approved = true;
    post.status = 'approved';
    queued = true;
    return json(post);
  }
  if (path === '/rest/v1/rpc/claim_publishing_job') {
    if (!queued) return json([]);
    queued = false;
    post.status = 'publishing';
    return json([{ id: jobId, post_id: post.id, user_id: owner, retry_count: 0, max_retries: 3 }]);
  }
  if (path === '/rest/v1/post_targets' && method === 'PATCH') {
    targets[0].status = 'publishing';
    return json([targets[0]]);
  }
  if (path === '/rest/v1/post_targets') return json([]);
  if (path === '/rest/v1/rpc/record_publishing_result') {
    const { result, target_id } = body();
    assert.equal(target_id, targetId);
    assert.equal(result.status, 'published');
    assert.ok(result.external_post_id?.startsWith('provider-'));
    Object.assign(targets[0], result);
    return json(null);
  }
  if (path === '/rest/v1/rpc/finish_publishing_job') {
    assert.equal(publishes, 1);
    post.status = 'published';
    return json('published');
  }
  if (path === '/rest/v1/posts') {
    if (!post || (url.searchParams.has('status') && url.searchParams.get('status') !== 'eq.' + post.status)) return json([]);
    const select = url.searchParams.get('select') || '';
    if (select.includes('variants:')) return json({ ...post, media, variants, targets: targets.map((target) => ({ ...target, account })) });
    return json([{ ...post, post_targets: targets, post_variants: variants }]);
  }
  throw new Error('Unhandled mock ' + method + ' ' + path);
};
