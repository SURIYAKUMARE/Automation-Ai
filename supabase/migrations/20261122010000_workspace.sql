alter table public.media_assets add column collection_name text
  check (char_length(collection_name) between 1 and 60);

create index media_assets_owner_collection_idx on public.media_assets (user_id, collection_name, created_at desc);
create index posts_owner_workspace_schedule_idx on public.posts (user_id, scheduled_for) where scheduled_for is not null;

create function public.create_queued_campaign(owner_id uuid, campaign jsonb, variants jsonb, destinations jsonb)
returns public.posts language plpgsql set search_path = public as $$
declare
  next_slot timestamptz := date_trunc('hour', now()) + interval '1 hour';
begin
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  while exists (
    select 1 from posts
    where user_id = owner_id
      and status in ('pending_approval', 'scheduled', 'approved', 'publishing', 'processing')
      and scheduled_for >= next_slot and scheduled_for < next_slot + interval '1 hour'
  ) loop
    next_slot := next_slot + interval '1 hour';
  end loop;
  return create_campaign(owner_id, campaign || jsonb_build_object(
    'scheduled_for', next_slot,
    'status', case when campaign->>'publishing_mode' = 'manual_approval'
      then 'pending_approval' else 'scheduled' end
  ), variants, destinations);
end;
$$;

revoke all on function public.create_queued_campaign(uuid,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_queued_campaign(uuid,jsonb,jsonb,jsonb) to service_role;

create function public.notify_workspace_post() returns trigger
language plpgsql set search_path = public as $$
declare
  label text;
  severity notification_type;
begin
  if TG_OP = 'UPDATE' then
    if old.status = new.status then return new; end if;
  end if;
  case new.status
    when 'pending_approval' then label := 'Post needs approval'; severity := 'info';
    when 'published' then label := 'Post published'; severity := 'success';
    when 'failed' then label := 'Publishing needs attention'; severity := 'error';
    else return new;
  end case;
  insert into notifications(user_id, title, message, type, link)
  values (new.user_id, label, coalesce(nullif(new.title, ''), 'Untitled post'), severity,
    case when new.status = 'pending_approval' then '/dashboard/approvals'
      else '/dashboard/history?post=' || new.id::text end);
  return new;
end;
$$;

create trigger notify_workspace_post after insert or update of status on public.posts
for each row execute function public.notify_workspace_post();
