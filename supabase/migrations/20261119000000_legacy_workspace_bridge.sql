-- Older hosted workspaces have the core tables without the queue schema.
-- Fresh projects and workspaces that already have a queue need no bridge.
do $$
begin
  if to_regclass('public.posts') is null
    or to_regclass('public.publishing_jobs') is not null
    or not exists (
      select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'post_status' and e.enumlabel = 'partially_published'
    ) then
    return;
  end if;

  alter type public.post_status add value if not exists 'analyzing';
  alter type public.post_status add value if not exists 'ready';
  alter type public.post_status add value if not exists 'approved';
  alter type public.post_status add value if not exists 'processing';
  alter type public.post_status add value if not exists 'reauthorization_required';
  alter type public.post_status add value if not exists 'cancelled';

  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.posts'::regclass and attname = 'target_platforms'
      and atttypid = 'text[]'::regtype and not attisdropped
  ) then
    alter table public.posts alter column target_platforms drop default;
    alter table public.posts alter column target_platforms type public.social_platform[]
      using target_platforms::text::public.social_platform[];
    alter table public.posts alter column target_platforms set default '{}';
  end if;

  alter table public.media_assets
    add column if not exists width integer,
    add column if not exists height integer,
    add column if not exists duration_seconds numeric(10, 2),
    add column if not exists thumbnail_url text,
    add column if not exists ai_analysis_data jsonb default '{}',
    add column if not exists updated_at timestamptz not null default now();

  alter table public.post_variants
    add column if not exists call_to_action text,
    add column if not exists language text default 'English',
    add column if not exists tone text default 'Professional',
    add column if not exists version integer default 1,
    add column if not exists updated_at timestamptz not null default now();

  alter table public.post_targets
    add column if not exists social_account_id uuid references public.social_accounts(id) on delete set null;
  create unique index if not exists unique_post_target_account
    on public.post_targets (post_id, social_account_id);
  create unique index if not exists unique_user_platform_external
    on public.social_accounts (user_id, platform, external_account_id);

  alter table public.publishing_attempts
    add column if not exists job_id uuid,
    add column if not exists attempt_number integer default 1,
    add column if not exists request_payload jsonb,
    add column if not exists response_payload jsonb;

  alter table public.analytics_snapshots
    add column if not exists user_id uuid references public.profiles(id) on delete cascade,
    add column if not exists post_target_id uuid references public.post_targets(id) on delete cascade,
    add column if not exists external_post_id text,
    add column if not exists views bigint default 0,
    add column if not exists raw_api_data jsonb default '{}',
    add column if not exists synced_at timestamptz not null default now();

  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.analytics_snapshots'::regclass and attname = 'recorded_at' and not attisdropped
  ) then
    update public.analytics_snapshots snapshot
      set user_id = post.user_id, synced_at = snapshot.recorded_at
      from public.posts post
      where post.id = snapshot.post_id and snapshot.user_id is null;
  end if;
end;
$$;
