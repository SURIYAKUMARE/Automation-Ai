-- Restrict worker-controlled tables to the server API.
revoke all on public.social_accounts, public.posts, public.post_variants, public.post_targets,
  public.media_assets, public.publishing_jobs, public.publishing_attempts, public.approvals,
  public.analytics_snapshots from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-assets', 'media-assets', false, 104857600,
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false, allowed_mime_types = excluded.allowed_mime_types;

alter table public.posts add column series_id uuid;
alter table public.post_variants add column keywords text[] not null default '{}';
alter table public.post_targets add column retryable boolean not null default false;
update public.social_accounts set metadata = metadata - 'allPages'
  where platform = 'facebook' and metadata ? 'allPages';
alter table public.post_targets alter column social_account_id drop not null;
alter table public.post_targets drop constraint post_targets_social_account_id_fkey;
alter table public.post_targets add foreign key (social_account_id) references public.social_accounts(id) on delete set null;
alter table public.publishing_attempts alter column social_account_id drop not null;
alter table public.publishing_attempts drop constraint if exists publishing_attempts_social_account_id_fkey;
alter table public.publishing_attempts add foreign key (social_account_id) references public.social_accounts(id) on delete set null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.publishing_attempts'::regclass
      and conname = 'publishing_attempts_job_id_fkey'
  ) then
    alter table public.publishing_attempts add foreign key (job_id) references public.publishing_jobs(id) on delete set null;
  end if;
end;
$$;

create table public.brand_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  voice text not null default '',
  audience text not null default '',
  keywords text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.brand_profiles enable row level security;
revoke all on public.brand_profiles from anon, authenticated;

create table public.social_account_snapshots (
  account_id uuid not null references public.social_accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  observed_on date not null,
  audience_count bigint not null check (audience_count >= 0),
  primary key (account_id, observed_on)
);
alter table public.social_account_snapshots enable row level security;
revoke all on public.social_account_snapshots from anon, authenticated;

create table public.ai_usage_windows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  requests integer not null,
  primary key (user_id, starts_at)
);
alter table public.ai_usage_windows enable row level security;
revoke all on public.ai_usage_windows from anon, authenticated;

grant select, insert, update, delete on public.social_accounts, public.posts, public.post_variants, public.post_targets,
  public.media_assets, public.publishing_jobs, public.publishing_attempts, public.approvals, public.analytics_snapshots,
  public.brand_profiles, public.social_account_snapshots, public.ai_usage_windows to service_role;

create function public.consume_ai_request(owner_id uuid) returns boolean
language sql set search_path = public as $$
  insert into ai_usage_windows (user_id, starts_at, requests)
  values (owner_id, date_trunc('hour', now()), 1)
  on conflict (user_id, starts_at)
  do update set requests = ai_usage_windows.requests + 1
  returning requests <= 30;
$$;

create function public.create_campaign(owner_id uuid, campaign jsonb, variants jsonb, destinations jsonb)
returns public.posts language plpgsql set search_path = public as $$
declare
  saved posts;
  asset_id uuid := (campaign->>'media_asset_id')::uuid;
  campaign_id uuid := (campaign->>'id')::uuid;
  initial_status post_status := (campaign->>'status')::post_status;
  occurrence timestamptz;
  occurrence_id uuid;
begin
  if asset_id is not null and not exists (
    select 1 from media_assets where id = asset_id and user_id = owner_id
  ) then raise exception 'Media asset unavailable'; end if;

  if coalesce((campaign->>'replace_draft')::boolean, false) then
    delete from posts where id = campaign_id and user_id = owner_id and status = 'draft';
  end if;
  insert into posts (id, user_id, media_asset_id, title, raw_prompt, publishing_mode, status, scheduled_for, target_platforms)
  values (campaign_id, owner_id, asset_id, campaign->>'title', campaign->>'raw_prompt',
    (campaign->>'publishing_mode')::publishing_mode, initial_status,
    (campaign->>'scheduled_for')::timestamptz,
    array(select value::social_platform from jsonb_array_elements_text(campaign->'target_platforms')))
  on conflict (id) do nothing returning * into saved;
  if not found then
    select * into saved from posts where id = campaign_id and user_id = owner_id;
    if not found then raise exception 'Post unavailable'; end if;
    return saved;
  end if;

  insert into post_variants (post_id, platform, caption, title, hashtags, keywords, call_to_action, language, tone, is_approved)
  select saved.id, v.platform, v.caption, v.title, v.hashtags, coalesce(v.keywords,'{}'), v.call_to_action, v.language, v.tone,
    saved.publishing_mode = 'automatic'
  from jsonb_to_recordset(variants) as v(platform social_platform, caption text, title text,
    hashtags text[], keywords text[], call_to_action text, language text, tone text);

  insert into post_targets (post_id, social_account_id, platform, status)
  select saved.id, a.id, a.platform, initial_status
  from jsonb_to_recordset(destinations) as d(id uuid)
  join social_accounts a on a.id = d.id and a.user_id = owner_id and a.status = 'active';
  if initial_status <> 'draft' and exists (
    select 1 from unnest(saved.target_platforms) as selected(platform)
    where not exists (select 1 from post_targets t where t.post_id = saved.id and t.platform = selected.platform)
  ) then raise exception 'Connect an active account for every selected platform'; end if;

  if initial_status in ('scheduled', 'approved') then
    insert into publishing_jobs (post_id, user_id, run_at, idempotency_key)
    values (saved.id, owner_id, coalesce(saved.scheduled_for, now()), 'campaign:' || saved.id);
  end if;
  if initial_status = 'scheduled' and jsonb_array_length(coalesce(campaign->'recurrences','[]')) > 0 then
    update posts set series_id = saved.id where id = saved.id returning * into saved;
    for occurrence in select value::timestamptz from jsonb_array_elements_text(campaign->'recurrences') loop
      insert into posts (user_id,media_asset_id,title,raw_prompt,publishing_mode,status,scheduled_for,target_platforms,series_id)
      values (owner_id,asset_id,saved.title,saved.raw_prompt,saved.publishing_mode,'scheduled',occurrence,
        saved.target_platforms,saved.id) returning id into occurrence_id;
      insert into post_variants (post_id,platform,caption,title,hashtags,keywords,call_to_action,language,tone,is_approved)
      select occurrence_id,platform,caption,title,hashtags,keywords,call_to_action,language,tone,is_approved
        from post_variants where post_id = saved.id;
      insert into post_targets (post_id,social_account_id,platform,status)
      select occurrence_id,social_account_id,platform,'scheduled' from post_targets where post_id = saved.id;
      insert into publishing_jobs (post_id,user_id,run_at,idempotency_key)
      values (occurrence_id,owner_id,occurrence,'campaign:' || occurrence_id);
    end loop;
  end if;
  return saved;
end;
$$;

create function public.manage_campaign(owner_id uuid, campaign_id uuid, operation text,
  run_time timestamptz default null, edits jsonb default '{}'::jsonb, variant_id uuid default null)
returns public.posts language plpgsql set search_path = public as $$
declare
  saved posts;
  next_status post_status;
begin
  select * into saved from posts where id = campaign_id and user_id = owner_id for update;
  if not found then return null; end if;
  if saved.status in ('publishing', 'processing', 'published', 'cancelled') then return null; end if;
  if exists (select 1 from publishing_jobs where post_id = campaign_id and status = 'running') then return null; end if;

  if operation in ('approved', 'modified', 'rejected') then
    if saved.status <> 'pending_approval' then return null; end if;
    if variant_id is not null and not exists (
      select 1 from post_variants v where v.id = variant_id and v.post_id = campaign_id
    ) then return null; end if;
    with changed as (
      update post_variants v set is_approved = operation <> 'rejected',
        caption = coalesce(edits->>v.id::text, v.caption), updated_at = now()
      where v.post_id = campaign_id and (variant_id is null or v.id = variant_id)
      returning v.*
    )
    insert into approvals (post_id, user_id, variant_id, platform, action, approved_caption)
    select campaign_id, owner_id, id, platform, operation, caption from changed;
    if operation = 'rejected' then operation := 'cancel';
    elsif exists (select 1 from post_variants where post_id = campaign_id and not is_approved) then
      return saved;
    elsif run_time is null then
      next_status := 'approved';
      if saved.scheduled_for is not null then
        operation := 'queue';
        run_time := greatest(saved.scheduled_for, now());
      end if;
    else operation := 'queue';
    end if;
  end if;

  if operation = 'cancel' then
    update publishing_jobs set status = 'cancelled', updated_at = now()
    where post_id = campaign_id and status = 'queued';
    update post_targets set status = 'cancelled', updated_at = now()
    where post_id = campaign_id and status in ('draft', 'ready', 'pending_approval', 'approved', 'scheduled');
    next_status := 'cancelled';
  elsif operation = 'queue' then
    if saved.status in ('draft', 'pending_approval') and next_status is null
      and exists (select 1 from post_variants where post_id = campaign_id and not is_approved) then return null; end if;
    if run_time is null then return null; end if;
    if not exists (select 1 from post_targets where post_id = campaign_id and status in
      ('ready','approved','scheduled','pending_approval','failed','reauthorization_required','draft')) then return null; end if;
    update publishing_jobs set status = 'cancelled', updated_at = now()
    where post_id = campaign_id and status = 'queued';
    insert into publishing_jobs (post_id,user_id,run_at,idempotency_key)
    values (campaign_id,owner_id,run_time,'campaign:' || gen_random_uuid());
    next_status := case when run_time > now() then 'scheduled'::post_status else 'approved'::post_status end;
  end if;

  if next_status is null then return null; end if;
  update posts set status = next_status,
    scheduled_for = case when next_status = 'scheduled' then run_time else null end,
    updated_at = now() where id = campaign_id returning * into saved;
  return saved;
end;
$$;

create function public.claim_publishing_job()
returns setof public.publishing_jobs language plpgsql set search_path = public as $$
declare
  selected_id uuid;
begin
  -- Any worker interrupted after submission needs human reconciliation before retry.
  update post_targets t set status = 'processing', error_message = 'Provider outcome unknown. Verify the destination before posting again.',
    updated_at = now()
  from publishing_jobs j
  where j.post_id = t.post_id and j.status = 'running' and j.updated_at < now() - interval '20 minutes'
    and t.status = 'publishing';
  update posts p set status = 'failed', updated_at = now()
  from publishing_jobs j
  where j.post_id = p.id and j.status = 'running' and j.updated_at < now() - interval '20 minutes'
    and p.status = 'publishing';
  update publishing_jobs set status = 'failed', last_error = 'Worker stopped before confirmation', updated_at = now()
  where status = 'running' and updated_at < now() - interval '20 minutes';

  select j.id into selected_id from publishing_jobs j join posts p on p.id = j.post_id and p.user_id = j.user_id
  where j.status = 'queued' and j.run_at <= now() and p.status in ('scheduled','approved','failed')
  order by j.run_at, j.id limit 1 for update of p, j skip locked;
  if selected_id is null then return; end if;

  update posts set status = 'publishing', updated_at = now()
  where id = (select post_id from publishing_jobs where id = selected_id);
  return query update publishing_jobs set status = 'running', updated_at = now()
  where id = selected_id returning *;
end;
$$;

create function public.record_publishing_result(job uuid, target_id uuid, result jsonb)
returns void language plpgsql set search_path = public as $$
declare
  target post_targets;
  attempt publishing_jobs;
  outcome post_status := (result->>'status')::post_status;
begin
  select * into attempt from publishing_jobs where id = job and status = 'running' for update;
  if not found then raise exception 'Publishing job is no longer running'; end if;
  update post_targets set status = outcome, external_post_id = result->>'external_post_id',
    external_post_url = result->>'external_post_url', error_message = result->>'error_message',
    retryable = coalesce((result->>'retryable')::boolean, false),
    published_at = case when outcome = 'published' then now() else null end, updated_at = now()
  where id = target_id and post_id = attempt.post_id and status = 'publishing' returning * into target;
  if not found then raise exception 'Publishing target is no longer claimed'; end if;
  insert into publishing_attempts (job_id,post_id,social_account_id,platform,attempt_number,status,
    external_post_id,external_post_url,error_code,error_message)
  values (job,target.post_id,target.social_account_id,target.platform,attempt.retry_count+1,outcome,
    target.external_post_id,target.external_post_url,result->>'error_code',target.error_message);
end;
$$;

create function public.finish_publishing_job(job uuid, next_run timestamptz)
returns public.post_status language plpgsql set search_path = public as $$
declare
  saved publishing_jobs;
  final_status post_status;
begin
  select * into saved from publishing_jobs where id = job and status = 'running' for update;
  if not found then raise exception 'Job is no longer running'; end if;
  if next_run is not null then
    -- Retry known rejections and failures before the final submission.
    update post_targets set status = 'scheduled', updated_at = now()
      where post_id = saved.post_id and status = 'failed' and retryable;
    final_status := 'scheduled';
  elsif exists (select 1 from post_targets where post_id = saved.post_id)
    and not exists (select 1 from post_targets where post_id = saved.post_id and status <> 'published') then
    final_status := 'published';
  else
    final_status := 'failed';
  end if;
  update posts set status = final_status, scheduled_for = next_run,
    published_at = case when final_status = 'published' then now() else published_at end,
    updated_at = now() where id = saved.post_id;
  update publishing_jobs set
    status = case when next_run is not null then 'queued'::job_status
      when final_status = 'published' then 'completed'::job_status else 'failed'::job_status end,
    run_at = coalesce(next_run, run_at), retry_count = retry_count + (next_run is not null)::int,
    last_error = case when final_status = 'published' then null
      when next_run is not null then 'Retry scheduled' else 'Review per-platform outcomes in History' end,
    updated_at = now() where id = job;
  return final_status;
end;
$$;

create function public.edit_campaign(owner_id uuid, campaign_id uuid, campaign_title text, variants jsonb)
returns boolean language plpgsql set search_path = public as $$
declare
  current_status post_status;
begin
  select status into current_status from posts where id = campaign_id and user_id = owner_id for update;
  if not found or current_status not in ('draft','pending_approval','scheduled','approved') then return false; end if;
  if exists (select 1 from jsonb_to_recordset(variants) as v(id uuid, caption text)
    where not exists (select 1 from post_variants where id = v.id and post_id = campaign_id)
      or (current_status <> 'draft' and btrim(v.caption) = '')) then
    return false;
  end if;
  update posts set title = coalesce(campaign_title,title), updated_at = now() where id = campaign_id;
  update post_variants p set caption = v.caption, updated_at = now()
    from jsonb_to_recordset(variants) as v(id uuid, caption text)
    where p.id = v.id and p.post_id = campaign_id;
  return true;
end;
$$;

revoke execute on function public.consume_ai_request(uuid),
  public.create_campaign(uuid,jsonb,jsonb,jsonb), public.manage_campaign(uuid,uuid,text,timestamptz,jsonb,uuid),
  public.claim_publishing_job(), public.record_publishing_result(uuid,uuid,jsonb),
  public.finish_publishing_job(uuid,timestamptz), public.edit_campaign(uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid),
  public.create_campaign(uuid,jsonb,jsonb,jsonb), public.manage_campaign(uuid,uuid,text,timestamptz,jsonb,uuid),
  public.claim_publishing_job(), public.record_publishing_result(uuid,uuid,jsonb),
  public.finish_publishing_job(uuid,timestamptz), public.edit_campaign(uuid,uuid,text,jsonb) to service_role;
