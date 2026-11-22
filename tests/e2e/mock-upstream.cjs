// Test-only transport. Reject every unrelated external request.
const { createCipheriv, randomBytes, randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const fetchReal = globalThis.fetch;
const owner = '10000000-0000-4000-8000-000000000000';
const secondOwner = '10000000-0000-4000-8000-000000000001';
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
const linkedAccounts = [];

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const path = url.pathname;
  const body = () => JSON.parse(init.body);
  const json = (data, status = 200) => Response.json(data, { status });
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return fetchReal(input, init);
  if (url.hostname === 'oauth2.googleapis.com') {
    const code = new URLSearchParams(init.body).get('code');
    if (code === 'fixture-youtube-code') return json({ access_token: 'fixture-youtube-token', refresh_token: 'fixture-youtube-refresh',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly' });
    assert.equal(code, 'fixture-google-code');
    return json({ access_token: 'fixture-google-access-token' });
  }
  if (url.hostname === 'www.googleapis.com' && path === '/oauth2/v2/userinfo') {
    return json({ id: '123456', email: 'google@test.invalid', verified_email: true, name: 'Google Fixture' });
  }
  if (url.hostname === 'www.googleapis.com' && path === '/youtube/v3/channels') {
    return json({ items: [{ id: 'fixture-channel', snippet: { title: 'Fixture Channel' } }] });
  }
  if (url.hostname === 'www.linkedin.com' && path === '/oauth/v2/accessToken') {
    assert.equal(new URLSearchParams(init.body).get('code'), 'fixture-linkedin-code');
    return json({ access_token: 'fixture-linkedin-token', scope: 'openid profile email w_member_social' });
  }
  if (url.hostname === 'api.linkedin.com' && path === '/v2/userinfo') {
    return json({ sub: 'fixture-linkedin-member', name: 'Fixture LinkedIn Member' });
  }
  if (url.hostname === 'generativelanguage.googleapis.com') {
    if (process.env.TEST_GEMINI_UNAVAILABLE === '1') return json({ error: { message: 'Fixture quota exceeded' } }, 429);
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
    if (process.env.TEST_PHOTO_CAPTIONS === '1') {
      assert.doesNotMatch(parts[0].text, /enterprise software launch/i);
      const pixels = await require('sharp')(Buffer.from(images[0].inlineData.data, 'base64')).stats();
      const color = pixels.channels[0].mean > pixels.channels[2].mean ? 'red' : 'blue';
      const summary = 'A ' + color + ' poster';
      const platforms = Object.fromEntries(request.generationConfig.responseSchema.properties.platforms.required.map((platform) => [
        platform, { caption: summary + ' fills the ' + platform + ' post.', title: summary, hashtags: [],
          alternatives: [summary + ' stands out.', 'The frame shows ' + summary.toLowerCase() + '.'] },
      ]));
      return json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({
        summary, media_review: { readable: true, observations: [summary] }, platforms,
      }) }] }, finishReason: 'STOP' }] });
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
  if (url.hostname === 'api.openai.com' && path === '/v1/responses') {
    const request = body();
    assert.equal(request.store, false);
    assert.equal(request.text.format.type, 'json_object');
    const content = request.input[0].content;
    assert.match(content[0].text, /attached visuals are the primary source/);
    assert.equal(content[1].type, 'input_image');
    assert.match(content[1].image_url, /^data:image\/jpeg;base64,/);
    const result = {
      summary: 'A red poster',
      media_review: { readable: true, observations: ['A red poster fills the frame'] },
      platforms: { facebook: { title: 'A bold red poster', caption: 'A bold red poster fills the frame.', hashtags: [], alternatives: [] } },
    };
    return json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  }
  if (url.hostname === 'graph.facebook.com') {
    if (path.endsWith('/oauth/access_token')) return json({ access_token: 'fixture-meta-user-token', expires_in: 3600 });
    if (path.endsWith('/me/permissions')) {
      return json({ data: ['pages_show_list','pages_read_engagement','pages_manage_posts','instagram_basic','instagram_content_publish']
        .map((permission) => ({ permission, status: 'granted' })) });
    }
    if (path.endsWith('/me/accounts')) return json({ data: [{ id: 'fixture-meta-page', name: 'Fixture Meta Page',
      tasks: ['CREATE_CONTENT'], access_token: 'fixture-meta-page-token',
      instagram_business_account: { id: 'fixture-instagram-account', username: 'fixture_instagram' } }] });
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
    if (url.searchParams.get('grant_type') === 'pkce') {
      assert.equal(credentials.auth_code, 'fixture-supabase-code');
      assert.match(credentials.code_verifier, /^[a-f\d]{56,128}$/);
      return json({ access_token: 'session-fixture', refresh_token: 'refresh-fixture', expires_in: 3600,
        token_type: 'bearer', user: { id: secondOwner, email: 'second@test.invalid', email_confirmed_at: new Date().toISOString(),
          identities: [{ id: '987654', provider: 'google' }], user_metadata: {}, created_at: new Date().toISOString() } });
    }
    if (credentials.password !== 'fixture-password') return json({ code: 'invalid_credentials', msg: 'Invalid credentials' }, 400);
    if (credentials.email === 'unconfirmed@test.invalid') return json({ error_code: 'email_not_confirmed', msg: 'Email not confirmed' }, 400);
    return json({ access_token: 'session-fixture', refresh_token: 'refresh-fixture', expires_in: 3600,
      token_type: 'bearer', user: { id: credentials.email === 'second@test.invalid' ? secondOwner : owner, email: credentials.email,
        user_metadata: { full_name: 'Fixture Owner' }, created_at: new Date().toISOString() } });
  }
  if (path === '/rest/v1/profiles' && method === 'POST') return new Response(null, { status: 201 });
  if (path === '/rest/v1/profiles' && method === 'GET') {
    assert.equal(url.searchParams.has('email') && url.searchParams.get('email').startsWith('ilike.'), false);
    return json([]);
  }
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
    const collection = url.searchParams.get('collection_name');
    const name = url.searchParams.get('file_name');
    if (media && method === 'PATCH') Object.assign(media, body());
    const items = media && (!checksum || checksum === 'eq.' + media.checksum_sha256) &&
      (!collection || collection === 'eq.' + media.collection_name) &&
      (!url.searchParams.has('user_id') || url.searchParams.get('user_id') === 'eq.' + media.user_id || (url.searchParams.get('user_id').startsWith('in.(') && url.searchParams.get('user_id').includes(media.user_id))) &&
      (!name || media.file_name.toLowerCase().includes(name.replace(/^ilike\.%|%$/g, '').toLowerCase())) ? [media] : [];
    const response = json(items);
    response.headers.set('Content-Range', items.length ? '0-0/1' : '*/0');
    return response;
  }
  if (path === '/rest/v1/upload_automation') {
    if (method !== 'POST') return json(automation ? [automation] : []);
    automation = body();
    return json(automation);
  }
  if (path === '/rest/v1/brand_profiles') return json([]);
  if (path === '/rest/v1/notifications' || path === '/rest/v1/publishing_jobs') return json([]);
  if (path === '/rest/v1/social_accounts') {
    if (method === 'POST') {
      const row = body();
      assert.ok([owner, secondOwner].includes(row.user_id));
      assert.match(row.encrypted_access_token, /^[a-f\d]+:[a-f\d]+:[a-f\d]+$/);
      linkedAccounts.push({ ...row, id: randomUUID() });
      return new Response(null, { status: 201 });
    }
    const filter = url.searchParams.get('user_id');
    const id = url.searchParams.get('id');
    const rows = [{ ...account, account_name: 'Fixture Page' }, ...linkedAccounts]
      .filter((row) => (!filter || filter === 'eq.' + row.user_id || (filter.startsWith('in.(') && filter.includes(row.user_id))) &&
        (!id || id === 'eq.' + row.id || (id.startsWith('in.(') && id.includes(row.id))));
    if (method === 'PATCH') for (const row of rows) Object.assign(row, body());
    const select = url.searchParams.get('select') || '';
    return json(rows.map((row) => {
      if (select.includes('encrypted_access_token')) return row;
      const { encrypted_access_token, encrypted_refresh_token, ...safe } = row;
      return safe;
    }));
  }
  if (path === '/rest/v1/rpc/consume_ai_request') return json(true);
  if (path === '/rest/v1/rpc/create_campaign' || path === '/rest/v1/rpc/create_automatic_campaign' || path === '/rest/v1/rpc/create_queued_campaign') {
    const input = body();
    assert.equal(input.owner_id, owner);
    if (path.endsWith('create_automatic_campaign')) {
      assert.equal(input.consent_revision, automation.revision);
      assert.deepEqual(input.destinations.map((account) => account.id), automation.account_ids);
      queued = true;
    }
    if (!post) {
      post = { ...input.campaign, user_id: owner, created_at: new Date().toISOString() };
      if (path.endsWith('create_queued_campaign')) {
        post.status = 'scheduled';
        post.scheduled_for = new Date(Date.now() + 3600_000).toISOString();
      }
      variants = input.variants.map((variant) => ({ ...variant, id: '70000000-0000-4000-8000-000000000000', is_approved: false }));
      targets = [{ id: targetId, platform: 'facebook', status: 'pending_approval' }];
    }
    return json(post);
  }
  if (path === '/rest/v1/rpc/manage_campaign') {
    const input = body();
    assert.equal(input.owner_id, owner);
    assert.equal(input.campaign_id, post.id);
    if (input.operation === 'queue' && input.run_time) {
      post.scheduled_for = input.run_time;
      post.status = 'scheduled';
      return json(post);
    }
    assert.equal(input.operation, 'approved');
    variants[0].caption = Object.values(input.edits)[0];
    variants[0].is_approved = true;
    post.status = 'approved';
    queued = true;
    return json(post);
  }
  if (path === '/rest/v1/rpc/claim_publishing_job' || path === '/rest/v1/rpc/claim_campaign_publishing_job') {
    if (path.endsWith('/claim_campaign_publishing_job')) {
      assert.equal(body().campaign_id, post.id);
      assert.equal(body().owner_id, owner);
    }
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
    const filter = url.searchParams.get('status');
    if (!post || (filter && filter !== 'eq.' + post.status && !(filter.startsWith('in.(') && filter.includes(post.status)))) return json([]);
    const select = url.searchParams.get('select') || '';
    if (select.includes('variants:')) return json({ ...post, media, variants, targets: targets.map((target) => ({ ...target, account })) });
    return json([{ ...post, post_targets: targets, post_variants: variants }]);
  }
  throw new Error('Unhandled mock ' + method + ' ' + path);
};
