const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { matchesOAuthState, newOAuthState } = require('../../lib/auth/oauth-state.ts');
const { encryptToken, decryptToken } = require('../../lib/security/encryption.ts');
const { GeminiAnalysisResultSchema } = require('../../lib/ai/gemini.ts');

test('OAuth state matches only the browser-bound value', () => {
  const state = newOAuthState();
  assert.equal(matchesOAuthState(state, state), true);
  assert.equal(matchesOAuthState(state, newOAuthState()), false);
  assert.equal(matchesOAuthState(state, undefined), false);
  assert.equal(matchesOAuthState('é'.repeat(43), state), false);
});

test('stored tokens require the configured key and reject tampering', () => {
  const previous = process.env.TOKEN_ENCRYPTION_KEY;
  try {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('hex');
    const cipher = encryptToken('provider token');
    assert.equal(decryptToken(cipher), 'provider token');
    const fields = cipher.split(':');
    fields[1] = 'f'.repeat(32);
    assert.throws(() => decryptToken(fields.join(':')));
    delete process.env.TOKEN_ENCRYPTION_KEY;
    assert.throws(() => encryptToken('provider token'), /encryption key/);
  } finally {
    if (previous === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = previous;
  }
});

test('Gemini schema preserves selected captions and rejects empty copy', () => {
  const schema = GeminiAnalysisResultSchema;
  const data = schema.parse({ summary: 'A poster', platforms: {
    facebook: { caption: 'Pick a design.', hashtags: ['design', '#design'], alternatives: ['Pick this look.', 'Choose a layout.'] },
  } });
  assert.deepEqual(data.platforms.facebook.hashtags, ['#design']);
  assert.equal(data.platforms.facebook.character_count, 'Pick a design.'.length);
  assert.equal(schema.safeParse({ ...data, platforms: { facebook: { caption: '  ', hashtags: [] } } }).success, false);
});
