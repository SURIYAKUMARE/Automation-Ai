create function public.claim_campaign_publishing_job(owner_id uuid, campaign_id uuid)
returns setof public.publishing_jobs
language plpgsql
set search_path = public
as $$
declare
  selected_id uuid;
begin
  select j.id into selected_id
  from publishing_jobs j join posts p on p.id = j.post_id and p.user_id = j.user_id
  where j.user_id = owner_id and j.post_id = campaign_id
    and j.status = 'queued' and j.run_at <= now() and p.status in ('scheduled', 'approved', 'failed')
  order by j.run_at, j.id
  limit 1 for update of p, j skip locked;

  if selected_id is null then return; end if;

  update posts set status = 'publishing', updated_at = now() where id = campaign_id;
  return query update publishing_jobs set status = 'running', updated_at = now()
  where id = selected_id returning *;
end;
$$;

revoke execute on function public.claim_campaign_publishing_job(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_campaign_publishing_job(uuid, uuid) to service_role;
