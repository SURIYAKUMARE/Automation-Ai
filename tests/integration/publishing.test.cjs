const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { PGlite } = require('@electric-sql/pglite');

const owner = '10000000-0000-4000-8000-000000000000';
const other = '20000000-0000-4000-8000-000000000000';
const facebook = '30000000-0000-4000-8000-000000000000';
const linkedin = '40000000-0000-4000-8000-000000000000';
const id = '50000000-0000-4000-8000-000000000000';
const migrations = ['20261119000000_legacy_workspace_bridge.sql', '20261120000000_initial_schema.sql', '20261121000000_reliable_publishing.sql', '20261122000000_upload_automation.sql', '20261122010000_workspace.sql', '20261122020000_claim_campaign_publishing_job.sql'];

async function fixture(t, prepare) {
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid, email text, raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  `);
  if (prepare) await prepare(db);
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

test('immediate dispatch claims only the selected owned campaign', async (t) => {
  const db = await fixture(t);
  const earlier = '50000000-0000-4000-8000-000000000001';
  await db.query("insert into posts (id,user_id,status) values ($1,$2,'approved')", [earlier, owner]);
  await db.query("insert into publishing_jobs (post_id,user_id,run_at,idempotency_key) values ($1,$2,now()-interval '1 minute','earlier')",
    [earlier, owner]);
  await create(db, { status: 'approved', mode: 'automatic' });
  assert.equal((await db.query('select * from claim_campaign_publishing_job($1,$2)', [other, id])).rows.length, 0);
  assert.equal((await db.query('select post_id from claim_campaign_publishing_job($1,$2)', [owner, id])).rows[0].post_id, id);
  assert.equal((await db.query('select * from claim_campaign_publishing_job($1,$2)', [owner, id])).rows.length, 0);
  assert.equal((await db.query('select post_id from claim_publishing_job()')).rows[0].post_id, earlier);
});

test('legacy hosted workspaces keep existing data and gain a working publishing queue', async (t) => {
  const legacyOwner = '60000000-0000-4000-8000-000000000000';
  const legacyPost = '60000000-0000-4000-8000-000000000001';
  const db = await fixture(t, async (database) => {
    await database.exec(`
      create type social_platform as enum ('linkedin','youtube','instagram','facebook');
      create type account_status as enum ('active','expired','revoked','rate_limited','error');
      create type media_type as enum ('image','video','poster');
      create type publishing_mode as enum ('automatic','manual_approval');
      create type post_status as enum (
        'draft','pending_approval','scheduled','publishing','published','partially_published','failed'
      );
      create table profiles (id uuid primary key, email text not null, full_name text, avatar_url text);
      create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
      create table social_accounts (
        id uuid primary key, user_id uuid references profiles, platform social_platform,
        external_account_id text, account_name text, encrypted_access_token text,
        status account_status default 'active', metadata jsonb default '{}'
      );
      create table media_assets (
        id uuid primary key, user_id uuid references profiles, file_path text,
        mime_type text, media_type media_type, created_at timestamptz default now()
      );
      create table posts (
        id uuid primary key, user_id uuid references profiles, media_asset_id uuid references media_assets,
        title text, raw_prompt text, publishing_mode publishing_mode default 'manual_approval',
        status post_status default 'draft', scheduled_for timestamptz, published_at timestamptz,
        target_platforms text[] default '{}', created_at timestamptz default now(), updated_at timestamptz default now()
      );
      create table post_variants (
        id uuid primary key default gen_random_uuid(), post_id uuid references posts,
        platform social_platform, caption text, title text, hashtags text[], is_approved boolean, created_at timestamptz default now()
      );
      create table post_targets (
        id uuid primary key default gen_random_uuid(), post_id uuid references posts, platform social_platform,
        status post_status default 'draft', external_post_id text, external_post_url text, error_message text,
        published_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
      );
      create table publishing_attempts (
        id uuid primary key, post_id uuid references posts, social_account_id uuid,
        platform social_platform, status post_status, created_at timestamptz default now()
      );
      create table analytics_snapshots (
        id uuid primary key default gen_random_uuid(), post_id uuid references posts, platform social_platform,
        likes bigint, recorded_at timestamptz default now()
      );
    `);
    await database.query('insert into profiles values ($1,$2)', [legacyOwner, 'legacy@test.invalid']);
    await database.query("insert into posts (id,user_id,status,target_platforms) values ($1,$2,'published',array['facebook'])", [legacyPost, legacyOwner]);
    await database.query("insert into analytics_snapshots (post_id,platform,likes) values ($1,'facebook',7)", [legacyPost]);
  });
  assert.deepEqual((await db.query('select target_platforms::text as platforms, status from posts where id=$1', [legacyPost])).rows,
    [{ platforms: '{facebook}', status: 'published' }]);
  assert.deepEqual((await db.query('select user_id, likes::int as likes, synced_at = recorded_at as retained_date from analytics_snapshots')).rows,
    [{ user_id: legacyOwner, likes: 7, retained_date: true }]);

  await create(db, { status: 'approved', mode: 'automatic' });
  const job = (await db.query('select post_id from claim_publishing_job()')).rows[0];
  assert.equal(job.post_id, id);
});

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
