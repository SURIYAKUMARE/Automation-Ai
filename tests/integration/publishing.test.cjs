const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { PGlite } = require('@electric-sql/pglite');

const owner = '10000000-0000-4000-8000-000000000000';
const other = '20000000-0000-4000-8000-000000000000';
const facebook = '30000000-0000-4000-8000-000000000000';
const linkedin = '40000000-0000-4000-8000-000000000000';
const id = '50000000-0000-4000-8000-000000000000';
const migrations = ['20261120000000_initial_schema.sql', '20261121000000_reliable_publishing.sql', '20261122000000_upload_automation.sql', '20261122010000_workspace.sql'];

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

test('next available slots are reserved and approval notifications are created once', async (t) => {
  const db = await fixture(t);
  const nextId = '51000000-0000-4000-8000-000000000000';
  const queue = async (postId, mode) => {
    const { rows } = await db.query('select result.* from create_queued_campaign($1, $2, $3, $4) result', [
      owner, JSON.stringify({ id: postId, title: 'Queued fixture', publishing_mode: mode, target_platforms: ['facebook'] }),
      JSON.stringify([{ platform: 'facebook', caption: 'Fixture caption', hashtags: [] }]),
      JSON.stringify([{ id: facebook }]),
    ]);
    return rows[0];
  };
  assert.equal((await db.query("select has_function_privilege('anon', 'create_queued_campaign(uuid,jsonb,jsonb,jsonb)', 'execute') allowed")).rows[0].allowed, false);
  const first = await queue(id, 'manual_approval');
  const second = await queue(nextId, 'automatic');
  const duplicate = await queue(id, 'manual_approval');
  assert.equal(first.status, 'pending_approval');
  assert.equal(second.status, 'scheduled');
  assert.equal(second.scheduled_for - first.scheduled_for, 3600_000);
  assert.equal(duplicate.scheduled_for.getTime(), first.scheduled_for.getTime());
  assert.deepEqual((await db.query('select title, user_id from notifications')).rows, [{ title: 'Post needs approval', user_id: owner }]);
  assert.equal((await db.query('select post_id from publishing_jobs')).rows[0].post_id, nextId);
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

test('upload publishing requires current consent for every exact destination', async (t) => {
  const db = await fixture(t);
  const revision = '60000000-0000-4000-8000-000000000000';
  const asset = '70000000-0000-4000-8000-000000000000';
  await db.query(`insert into media_assets(id,user_id,file_name,file_path,file_size,mime_type,media_type,checksum_sha256)
    values($1,$2,'photo.jpg','fixture.jpg',20,'image/jpeg','image','fixture-checksum')`, [asset,owner]);
  await assert.rejects(db.query(`insert into media_assets(user_id,file_name,file_path,file_size,mime_type,media_type,checksum_sha256)
    values($1,'copy.jpg','copy.jpg',20,'image/jpeg','image','fixture-checksum')`, [owner]), /duplicate key/);
  const enqueue = (destination = facebook) => db.query('select (create_automatic_campaign($1,$2,$3,$4,$5)).id', [
    owner, revision, JSON.stringify({ id, media_asset_id: asset, status: 'approved', publishing_mode: 'automatic', target_platforms: ['facebook'] }),
    JSON.stringify([{ platform: 'facebook', caption: 'Caption about the photo', hashtags: [] }]), JSON.stringify([{ id: destination }]),
  ]);
  await assert.rejects(enqueue(), /consent changed/);
  await db.query('insert into upload_automation(user_id,enabled,revision,account_ids) values($1,true,$2,array[$3::uuid])', [owner,revision,facebook]);
  await assert.rejects(enqueue(linkedin), /destinations changed/);
  await enqueue();
  await enqueue();
  assert.equal((await db.query('select count(*)::int as total from publishing_jobs')).rows[0].total, 1);
  await db.query('update upload_automation set revision=gen_random_uuid() where user_id=$1', [owner]);
  await assert.rejects(enqueue(), /consent changed/);
});

test('one destination can retry without disturbing a confirmed publication', async (t) => {
  const db = await fixture(t);
  await create(db, { status: 'approved', mode: 'automatic' });
  const batch = (await db.query('select * from claim_publishing_job()')).rows[0];
  await result(db, batch.id, 'facebook', 'published');
  await result(db, batch.id, 'linkedin', 'failed');
  await db.query('select finish_publishing_job($1, null)', [batch.id]);
  const targets = (await db.query('select id,platform from post_targets')).rows;
  const failed = targets.find((target) => target.platform === 'linkedin').id;
  const published = targets.find((target) => target.platform === 'facebook').id;
  const retry = async (user, target) => (await db.query('select retry_publishing_target($1,$2) as id', [user,target])).rows[0].id;
  assert.equal(await retry(other, failed), null);
  assert.equal(await retry(owner, published), null);
  const accepted = await retry(owner, failed);
  assert.ok(accepted);
  assert.equal(await retry(owner, failed), null);
  const job = (await db.query('select * from claim_publishing_job()')).rows[0];
  assert.equal(job.id, accepted);
  assert.equal(job.target_id, failed);
  await assert.rejects(db.query("select record_publishing_result($1,$2,'{\"status\":\"published\"}')", [job.id,published]), /no longer claimed/);
  await result(db, job.id, 'linkedin', 'published');
  await db.query('select finish_publishing_job($1, null)', [job.id]);
  assert.equal((await db.query('select status from posts')).rows[0].status, 'published');
});

test('YouTube receipts remain processing until an official status is recorded', async (t) => {
  const db = await fixture(t);
  const channel = '80000000-0000-4000-8000-000000000000';
  await db.query(`insert into social_accounts (id,user_id,platform,external_account_id,account_name,encrypted_access_token)
    values($1,$2,'youtube','fixture-channel','YouTube fixture','mock')`, [channel,owner]);
  await db.query('select create_campaign($1,$2,$3,$4)', [owner,
    JSON.stringify({ id, status: 'approved', publishing_mode: 'automatic', target_platforms: ['youtube'] }),
    JSON.stringify([{ platform: 'youtube', caption: 'Caption', youtube_privacy: 'unlisted', hashtags: [] }]), JSON.stringify([{ id: channel }]),
  ]);
  const job = (await db.query('select * from claim_publishing_job()')).rows[0];
  const target = (await db.query("update post_targets set status='publishing' returning id")).rows[0];
  await db.query('select record_publishing_result($1,$2,$3)', [job.id,target.id,JSON.stringify({ status:'processing', external_post_id:'video-receipt' })]);
  await db.query('select finish_publishing_job($1, null)', [job.id]);
  assert.equal((await db.query('select status from posts')).rows[0].status, 'processing');
  assert.equal((await db.query('select youtube_privacy from post_variants')).rows[0].youtube_privacy, 'unlisted');
  const report = async (receipt, status) => (await db.query('select report_youtube_processing($1,$2,$3,null) as saved', [target.id,receipt,status])).rows[0].saved;
  assert.equal(await report('wrong-receipt', 'published'), false);
  assert.equal(await report('video-receipt', 'published'), true);
  assert.equal(await report('video-receipt', 'processing'), false);
  assert.equal((await db.query('select status from posts')).rows[0].status, 'published');
});
