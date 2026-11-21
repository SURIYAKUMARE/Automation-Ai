const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LinkedInAdapter } = require('../../integrations/linkedin/linkedin.adapter.ts');

const fixture = { accessToken: 'fixture', accountId: 'example', text: 'Reviewed caption' };

test('a server error during LinkedIn submission is not followed by another submission', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    return Response.json({ message: 'Temporary server error' }, { status: 503 });
  });
  const result = await new LinkedInAdapter().publish(fixture);
  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'LINKEDIN_API_503');
  assert.deepEqual(calls, ['https://api.linkedin.com/v2/ugcPosts']);
});

test('LinkedIn never publishes a text-only substitute for an unavailable attachment', async (t) => {
  const attachment = 'https://fixture.test/image.jpg';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(String(url));
    return new Response(null, { status: 404 });
  });
  const result = await new LinkedInAdapter().publish({ ...fixture, mediaUrl: attachment, mediaType: 'image' });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'MEDIA_DOWNLOAD_FAILED');
  assert.deepEqual(calls, [attachment]);
});

test('LinkedIn accepts a publish receipt with the provider post ID header', async (t) => {
  const receipt = 'urn:li:ugcPost:123456789';
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 201, headers: { 'x-restli-id': receipt } }));
  const result = await new LinkedInAdapter().publish(fixture);
  assert.equal(result.success, true);
  assert.equal(result.externalPostId, receipt);
});

test('LinkedIn uploads video parts, finalizes the asset and publishes only after it is available', async (t) => {
  const video = 'urn:li:video:test-asset';
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const path = new URL(url);
    calls.push(path.pathname);
    if (path.hostname === 'fixture.test') return new Response(Buffer.from('TEST'));
    if (path.searchParams.get('action') === 'initializeUpload') {
      return Response.json({ value: { video, uploadToken: '', uploadInstructions: [
        { uploadUrl: 'https://www.linkedin.com/part1', firstByte: 0, lastByte: 1 },
        { uploadUrl: 'https://www.linkedin.com/part2', firstByte: 2, lastByte: 4194303 },
      ] } });
    }
    if (path.pathname.startsWith('/part')) {
      assert.equal(Buffer.from(options.body).toString(), path.pathname === '/part1' ? 'TE' : 'ST');
      return new Response(null, { headers: { etag: '"tag-' + path.pathname.at(-1) + '"' } });
    }
    if (path.searchParams.get('action') === 'finalizeUpload') {
      assert.deepEqual(JSON.parse(options.body).finalizeUploadRequest.uploadedPartIds, ['tag-1', 'tag-2']);
      return new Response(null, { status: 200 });
    }
    if (path.pathname.startsWith('/rest/videos/')) return Response.json({ status: 'AVAILABLE' });
    assert.equal(path.pathname, '/rest/posts');
    assert.equal(JSON.parse(options.body).content.media.id, video);
    return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:ugcPost:test' } });
  });
  const result = await new LinkedInAdapter().publish({ ...fixture, mediaUrl: 'https://fixture.test/clip.mp4', mediaType: 'video' });
  assert.equal(result.externalPostId, 'urn:li:ugcPost:test');
  assert.deepEqual(calls, ['/clip.mp4', '/rest/videos', '/part1', '/part2', '/rest/videos',
    '/rest/videos/' + encodeURIComponent(video), '/rest/posts']);
});
