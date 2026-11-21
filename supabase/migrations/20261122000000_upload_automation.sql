alter table public.media_assets add column checksum_sha256 text, add column video_codec text, add column thumbnail_path text;
create unique index media_assets_owner_checksum on public.media_assets(user_id, checksum_sha256) where checksum_sha256 is not null;
alter table public.publishing_jobs add column target_id uuid references public.post_targets(id) on delete cascade;
alter table public.post_variants add column youtube_privacy text check (youtube_privacy in ('private','unlisted','public'));
alter table public.post_variants add column alt_text text check (length(alt_text) <= 1000);

create table public.upload_automation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  revision uuid not null default gen_random_uuid(),
  account_ids uuid[] not null default '{}',
  language text not null default 'English' check (language in ('English','Tamil','Tanglish')),
  youtube_privacy text not null default 'private' check (youtube_privacy in ('private','unlisted','public')),
  updated_at timestamptz not null default now(),
  check (not enabled or cardinality(account_ids) between 1 and 20)
);
alter table public.upload_automation enable row level security;
revoke all on public.upload_automation from anon, authenticated;
grant select, insert, update, delete on public.upload_automation to service_role;

create function public.create_automatic_campaign(owner_id uuid, consent_revision uuid, campaign jsonb, variants jsonb, destinations jsonb)
returns public.posts language plpgsql set search_path = public as $$
declare
  settings upload_automation;
  actual uuid[];
begin
  select * into settings from upload_automation where user_id = owner_id for update;
  if not found or not settings.enabled or settings.revision <> consent_revision then
    raise exception 'Upload publishing consent changed. Review your settings.';
  end if;
  if campaign->>'media_asset_id' is null or campaign->>'publishing_mode' is distinct from 'automatic' or
      campaign->>'status' is distinct from 'approved' then
    raise exception 'An approved automatic media campaign is required';
  end if;
  perform 1 from social_accounts where user_id=owner_id and id=any(settings.account_ids) order by id for share;
  select array_agg(d.id order by d.id) into actual
    from jsonb_to_recordset(destinations) as d(id uuid)
    join social_accounts a on a.id=d.id and a.user_id=owner_id and a.status='active';
  if actual is distinct from array(select id from unnest(settings.account_ids) as ids(id) order by id) then
    raise exception 'Authorized upload destinations changed. Review your settings.';
  end if;
  return create_campaign(owner_id,campaign,variants,destinations);
end;
$$;

create function public.retry_publishing_target(owner_id uuid, target_id uuid)
returns uuid language plpgsql set search_path = public as $$
declare
  campaign_id uuid;
  picked_job uuid;
begin
  select p.id into campaign_id from posts p join post_targets t on t.post_id=p.id
    where p.user_id=owner_id and p.status in ('failed','processing') and t.id=target_id
      and t.external_post_id is null and t.status in ('failed','reauthorization_required') for update of p;
  if not found or exists (select 1 from publishing_jobs where post_id=campaign_id and status in ('queued','running')) then
    return null;
  end if;
  update post_targets set status='approved', updated_at=now() where id=target_id;
  update posts set status='approved', updated_at=now() where id=campaign_id;
  insert into publishing_jobs (post_id,user_id,target_id,run_at,idempotency_key)
    values (campaign_id,owner_id,target_id,now(),'target:' || gen_random_uuid()) returning id into picked_job;
  return picked_job;
end;
$$;

revoke execute on function public.create_automatic_campaign(uuid,uuid,jsonb,jsonb,jsonb), public.retry_publishing_target(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.create_automatic_campaign(uuid,uuid,jsonb,jsonb,jsonb), public.retry_publishing_target(uuid,uuid)
  to service_role;

create or replace function public.create_campaign(owner_id uuid, campaign jsonb, variants jsonb, destinations jsonb)
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

  insert into post_variants (post_id, platform, caption, title, hashtags, keywords, youtube_privacy, alt_text, call_to_action, language, tone, is_approved)
  select saved.id, v.platform, v.caption, v.title, v.hashtags, coalesce(v.keywords,'{}'), v.youtube_privacy, v.alt_text, v.call_to_action, v.language, v.tone,
    saved.publishing_mode = 'automatic'
  from jsonb_to_recordset(variants) as v(platform social_platform, caption text, title text,
    hashtags text[], keywords text[], youtube_privacy text, alt_text text, call_to_action text, language text, tone text);

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
      insert into post_variants (post_id,platform,caption,title,hashtags,keywords,youtube_privacy,alt_text,call_to_action,language,tone,is_approved)
      select occurrence_id,platform,caption,title,hashtags,keywords,youtube_privacy,alt_text,call_to_action,language,tone,is_approved
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

create or replace function public.record_publishing_result(job uuid, target_id uuid, result jsonb)
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
  where id = target_id and post_id = attempt.post_id and (attempt.target_id is null or attempt.target_id = record_publishing_result.target_id) and status = 'publishing' returning * into target;
  if not found then raise exception 'Publishing target is no longer claimed'; end if;
  insert into publishing_attempts (job_id,post_id,social_account_id,platform,attempt_number,status,
    external_post_id,external_post_url,error_code,error_message)
  values (job,target.post_id,target.social_account_id,target.platform,attempt.retry_count+1,outcome,
    target.external_post_id,target.external_post_url,result->>'error_code',target.error_message);
end;
$$;

create or replace function public.finish_publishing_job(job uuid, next_run timestamptz)
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
      where post_id = saved.post_id and (saved.target_id is null or id = saved.target_id) and status = 'failed' and retryable;
    final_status := 'scheduled';
  elsif exists (select 1 from post_targets where post_id = saved.post_id)
    and not exists (select 1 from post_targets where post_id = saved.post_id and status <> 'published') then
    final_status := 'published';
  elsif exists (select 1 from post_targets where post_id = saved.post_id and status='processing' and external_post_id is not null) then
    final_status := 'processing';
  else
    final_status := 'failed';
  end if;
  update posts set status = final_status, scheduled_for = next_run,
    published_at = case when final_status = 'published' then now() else published_at end,
    updated_at = now() where id = saved.post_id;
  update publishing_jobs set
    status = case when next_run is not null then 'queued'::job_status
      when final_status in ('published','processing') or (saved.target_id is not null and exists(select 1 from post_targets where id=saved.target_id and status='published')) then 'completed'::job_status else 'failed'::job_status end,
    run_at = coalesce(next_run, run_at), retry_count = retry_count + (next_run is not null)::int,
    last_error = case when final_status in ('published','processing') or (saved.target_id is not null and exists(select 1 from post_targets where id=saved.target_id and status='published')) then null
      when next_run is not null then 'Retry scheduled' else 'Review per-platform outcomes in History' end,
    updated_at = now() where id = job;
  return final_status;
end;
$$;

create function public.report_youtube_processing(destination_id uuid, receipt_id text, outcome post_status, detail text)
returns boolean language plpgsql set search_path = public as $$
declare
  campaign_id uuid;
  aggregate_status post_status;
begin
  if outcome not in ('processing','published','failed') then return false; end if;
  select p.id into campaign_id from posts p join post_targets t on t.post_id=p.id
    where t.id=destination_id and t.platform='youtube' and t.external_post_id=receipt_id and t.status='processing'
    for update of p;
  if not found then return false; end if;
  update post_targets set status=outcome, error_message=detail, updated_at=now(),
    published_at=case when outcome='published' then now() else null end
    where id=destination_id and status='processing' and external_post_id=receipt_id;
  if not found then return false; end if;
  if outcome <> 'processing' and not exists (
    select 1 from publishing_jobs where post_id=campaign_id and status in ('queued','running')
  ) then
    aggregate_status := case
      when exists(select 1 from post_targets where post_id=campaign_id and status='processing' and external_post_id is not null)
        then 'processing'::post_status
      when exists(select 1 from post_targets where post_id=campaign_id and status<>'published') then 'failed'::post_status
      else 'published'::post_status end;
    update posts set status=aggregate_status, updated_at=now(),
      published_at=case when aggregate_status='published' then now() else published_at end where id=campaign_id;
  end if;
  return true;
end;
$$;

revoke execute on function public.report_youtube_processing(uuid,text,post_status,text) from public, anon, authenticated;
grant execute on function public.report_youtube_processing(uuid,text,post_status,text) to service_role;
