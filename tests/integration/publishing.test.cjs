const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { PGlite } = require('@electric-sql/pglite');

const owner = '10000000-0000-4000-8000-000000000000';
const other = '20000000-0000-4000-8000-000000000000';
const facebook = '30000000-0000-4000-8000-000000000000';
const linkedin = '40000000-0000-4000-8000-000000000000';
const id = '50000000-0000-4000-8000-000000000000';
const migrations = ['20261120000000_initial_schema.sql', '20261121000000_reliable_publishing.sql'];

async function fixture(t) {
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid, email text, raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  `);
  for (const migration of migrations) {
    const sql = await readFile('supabase/migrations/' + migration, 'utf8');
    await db.exec(sql.replace(/^CREATE EXTENSION.*;$/gm, ''));
  }
  await db.query('insert into profiles (id,email) values ($1,$2),($3,$4)', [owner,'owner@test.invalid',other,'other@test.invalid']);
  await db.query(`insert into social_accounts (id,user_id,platform,external_account_id,account_name,encrypted_access_token)
    values ($1,$2,'facebook','fake-page','Facebook fixture','mock'),($3,$2,'linkedin','fake-member','LinkedIn fixture','mock')`,
    [facebook,owner,linkedin]);
  return db;
}

function create(db, { status = 'pending_approval', mode = 'manual_approval', scheduledFor = null,
  destinations = [facebook, linkedin], recurrences = [], replaceDraft = false } = {}) {
  return db.query('select (create_campaign($1,$2,$3,$4)).id', [
    owner, JSON.stringify({ id, status, publishing_mode: mode, scheduled_for: scheduledFor, target_platforms: ['facebook','linkedin'],
      recurrences, replace_draft: replaceDraft }),
    JSON.stringify(['facebook', 'linkedin'].map((platform) => ({ platform, caption: 'Reviewed caption', hashtags: [] }))),
    JSON.stringify(destinations.map((id) => ({ id }))),
  ]);
}
async function manage(db, user, operation, runAt = null, edits = {}) {
  const result = await db.query('select (manage_campaign($1,$2,$3,$4,$5)).status', [user, id, operation, runAt, JSON.stringify(edits)]);
  return result.rows[0].status;
}
async function result(db, job, platform, status, message) {
  const target = await db.query("update post_targets set status='publishing' where post_id=$1 and platform=$2 returning id", [id, platform]);
  await db.query('select record_publishing_result($1,$2,$3)', [job, target.rows[0].id, JSON.stringify({
    status, external_post_id: status === 'published' ? 'mock-provider-id' : null, error_message: message,
    retryable: message === 'Provider rate limit reached.',
  })]);
}

test('approval, ownership, duplicate protection and per-platform publishing', async (t) => {
  const db = await fixture(t);
  await assert.rejects(create(db, { destinations: [facebook] }), /Connect an active account/);
  assert.equal((await db.query('select * from posts')).rows.length, 0);
  await create(db);
  await create(db);
  assert.equal((await db.query('select * from post_variants')).rows.length, 2);
  assert.equal(await manage(db, other, 'approved', new Date().toISOString()), null);
  assert.equal(await manage(db, owner, 'queue', new Date().toISOString()), null);
  const variants = await db.query("select id from post_variants where platform='facebook'");
  assert.equal(await manage(db, owner, 'approved', new Date().toISOString(), { [variants.rows[0].id]: 'Edited caption' }), 'approved');
  assert.equal((await db.query("select caption from post_variants where platform='facebook'")).rows[0].caption, 'Edited caption');
  const job = (await db.query('select * from claim_publishing_job()')).rows[0];
  assert.equal(job.post_id, id);
  assert.equal((await db.query('select * from claim_publishing_job()')).rows.length, 0);
  await result(db, job.id, 'facebook', 'published');
  await result(db, job.id, 'linkedin', 'processing', 'Provider outcome unknown');
  await db.query('select finish_publishing_job($1, null)', [job.id]);
  assert.equal(await manage(db, owner, 'queue', new Date().toISOString()), null);
  assert.equal((await db.query('select count(*)::int as total from publishing_attempts')).rows[0].total, 2);
});

test('future schedule can be edited and cancelled without dispatch', async (t) => {
  const db = await fixture(t);
  const future = new Date(Date.now() + 3600_000).toISOString();
  await create(db, { status: 'scheduled', mode: 'automatic', scheduledFor: future });
  assert.equal((await db.query('select * from claim_publishing_job()')).rows.length, 0);
  assert.equal(await manage(db, owner, 'queue', new Date(Date.now() + 7200_000).toISOString()), 'scheduled');
  assert.equal(await manage(db, owner, 'cancel'), 'cancelled');
  assert.equal((await db.query("select * from publishing_jobs where status='queued'")).rows.length, 0);
});

test('explicit rate limit retains confirmed provider outcomes', async (t) => {
  const db = await fixture(t);
  await create(db, { status: 'approved', mode: 'automatic' });
  const job = (await db.query('select * from claim_publishing_job()')).rows[0];
  await result(db, job.id, 'facebook', 'published');
  await result(db, job.id, 'linkedin', 'failed', 'Provider rate limit reached.');
  await db.query('select finish_publishing_job($1, $2)', [job.id, new Date(Date.now() + 60_000).toISOString()]);
  const targets = (await db.query('select platform,status from post_targets order by platform')).rows;
  assert.deepEqual(targets, [{ platform: 'linkedin', status: 'scheduled' }, { platform: 'facebook', status: 'published' }]);
  assert.equal((await db.query('select retry_count from publishing_jobs')).rows[0].retry_count, 1);
});

test('draft promotion and weekly schedules preserve one copy per occurrence', async (t) => {
  const db = await fixture(t);
  await create(db, { status: 'draft', destinations: [] });
  assert.equal((await db.query('select * from publishing_jobs')).rows.length, 0);
  const first = Date.now() + 3600_000;
  const next = [1, 2].map((week) => new Date(first + week * 7 * 86_400_000).toISOString());
  const input = { status: 'scheduled', mode: 'automatic', scheduledFor: new Date(first).toISOString(), recurrences: next, replaceDraft: true };
  await create(db, input);
  await create(db, input);
  const rows = (await db.query('select series_id from posts')).rows;
  assert.equal(rows.length, 3);
  assert.ok(rows.every((row) => row.series_id === id));
  assert.equal((await db.query('select * from publishing_jobs')).rows.length, 3);
  assert.equal((await db.query('select * from post_targets')).rows.length, 6);
  assert.equal((await db.query("select has_function_privilege('authenticated','claim_publishing_job()', 'EXECUTE') as allowed")).rows[0].allowed, false);
});
