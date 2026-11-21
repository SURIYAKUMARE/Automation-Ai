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
