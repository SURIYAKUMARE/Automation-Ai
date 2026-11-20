-- =============================================================================
-- SocialSync AI - Intelligent Multi-Platform Social Media Automation System
-- Database Schema Migration: Initial Core Architecture with Strict RLS
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Profiles Table (Linked to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    organization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. Social Accounts Table (Multi-Platform Connected Credentials)
-- -----------------------------------------------------------------------------
CREATE TYPE social_platform AS ENUM ('linkedin', 'youtube', 'instagram', 'facebook');
CREATE TYPE account_status AS ENUM ('active', 'expired', 'revoked', 'rate_limited', 'error');

CREATE TABLE IF NOT EXISTS public.social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    external_account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_handle TEXT,
    avatar_url TEXT,
    granted_scopes TEXT[] DEFAULT '{}',
    -- AES-256-GCM encrypted tokens (never exposed to client browser)
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    status account_status DEFAULT 'active' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    last_validated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_platform_external UNIQUE (user_id, platform, external_account_id)
);

-- -----------------------------------------------------------------------------
-- 3. Media Assets Table
-- -----------------------------------------------------------------------------
CREATE TYPE media_type AS ENUM ('image', 'video', 'poster');

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage bucket path
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    media_type media_type NOT NULL,
    width INTEGER,
    height INTEGER,
    duration_seconds NUMERIC(10, 2),
    thumbnail_url TEXT,
    ai_analyzed BOOLEAN DEFAULT FALSE,
    ai_analysis_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. Posts Table (Core Campaign / Post Container)
-- -----------------------------------------------------------------------------
CREATE TYPE publishing_mode AS ENUM ('automatic', 'manual_approval');
CREATE TYPE post_status AS ENUM (
    'draft',
    'analyzing',
    'ready',
    'pending_approval',
    'approved',
    'scheduled',
    'publishing',
    'processing',
    'published',
    'failed',
    'reauthorization_required',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
    title TEXT,
    raw_prompt TEXT,
    publishing_mode publishing_mode DEFAULT 'manual_approval' NOT NULL,
    status post_status DEFAULT 'draft' NOT NULL,
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    target_platforms social_platform[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 5. Post Variants (AI-generated & User-edited Captions per Platform)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    caption TEXT NOT NULL,
    title TEXT, -- e.g. for YouTube
    hashtags TEXT[] DEFAULT '{}',
    call_to_action TEXT,
    language TEXT DEFAULT 'English',
    tone TEXT DEFAULT 'Professional',
    version INTEGER DEFAULT 1,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_post_platform_version UNIQUE (post_id, platform, version)
);

-- -----------------------------------------------------------------------------
-- 6. Post Targets (Selected Destination Accounts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    status post_status DEFAULT 'draft' NOT NULL,
    external_post_id TEXT,
    external_post_url TEXT,
    error_message TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_post_target_account UNIQUE (post_id, social_account_id)
);

-- -----------------------------------------------------------------------------
-- 7. Automation Rules (Settings for Fully Automatic Mode)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    default_mode publishing_mode DEFAULT 'manual_approval' NOT NULL,
    default_language TEXT DEFAULT 'English',
    default_tone TEXT DEFAULT 'Professional',
    enabled_platforms social_platform[] DEFAULT '{}',
    require_review_for_videos BOOLEAN DEFAULT TRUE,
    delay_minutes_before_publish INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_automation UNIQUE (user_id)
);

-- -----------------------------------------------------------------------------
-- 8. Publishing Jobs (Background Queue for Scheduled / Async Execution)
-- -----------------------------------------------------------------------------
CREATE TYPE job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.publishing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    run_at TIMESTAMPTZ NOT NULL,
    status job_status DEFAULT 'queued' NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 9. Publishing Attempts (Per-Target Execution History & Diagnostics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publishing_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.publishing_jobs(id) ON DELETE SET NULL,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    status post_status NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    error_code TEXT,
    error_message TEXT,
    external_post_id TEXT,
    external_post_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 10. Approvals Table (Audit Trail for Manual Approval Mode)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.post_variants(id) ON DELETE SET NULL,
    platform social_platform NOT NULL,
    action TEXT NOT NULL, -- 'approved', 'rejected', 'modified'
    approved_caption TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 11. Analytics Snapshots Table (Real-Time Engagement Tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_target_id UUID REFERENCES public.post_targets(id) ON DELETE CASCADE,
    platform social_platform NOT NULL,
    external_post_id TEXT NOT NULL,
    impressions BIGINT DEFAULT 0,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    engagement_rate NUMERIC(5, 4) DEFAULT 0,
    raw_api_data JSONB DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 12. Notifications Table
-- -----------------------------------------------------------------------------
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info' NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 13. Audit Logs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON public.posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON public.posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_post_variants_post_platform ON public.post_variants(post_id, platform);
CREATE INDEX IF NOT EXISTS idx_post_targets_post ON public.post_targets(post_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_user ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_run ON public.publishing_jobs(run_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Social Accounts: Users can only see and manage their own connected accounts
-- Note: Tokens are encrypted at rest; client queries should never request raw secret fields
CREATE POLICY "Users manage own social accounts" ON public.social_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Media Assets: Users can manage their own uploaded media
CREATE POLICY "Users manage own media assets" ON public.media_assets
    FOR ALL USING (auth.uid() = user_id);

-- Posts: Users can manage their own posts
CREATE POLICY "Users manage own posts" ON public.posts
    FOR ALL USING (auth.uid() = user_id);

-- Post Variants: Linked via post_id to posts owned by auth.uid()
CREATE POLICY "Users manage own post variants" ON public.post_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_variants.post_id AND posts.user_id = auth.uid()
        )
    );

-- Post Targets: Linked via post_id to posts owned by auth.uid()
CREATE POLICY "Users manage own post targets" ON public.post_targets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_targets.post_id AND posts.user_id = auth.uid()
        )
    );

-- Automation Rules: Users manage their own rules
CREATE POLICY "Users manage own automation rules" ON public.automation_rules
    FOR ALL USING (auth.uid() = user_id);

-- Publishing Jobs: Users view their own jobs
CREATE POLICY "Users manage own publishing jobs" ON public.publishing_jobs
    FOR ALL USING (auth.uid() = user_id);

-- Publishing Attempts: Users view attempts for their posts
CREATE POLICY "Users view own publishing attempts" ON public.publishing_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = publishing_attempts.post_id AND posts.user_id = auth.uid()
        )
    );

-- Approvals: Users manage their approvals
CREATE POLICY "Users manage own approvals" ON public.approvals
    FOR ALL USING (auth.uid() = user_id);

-- Analytics Snapshots: Users view their analytics
CREATE POLICY "Users view own analytics" ON public.analytics_snapshots
    FOR ALL USING (auth.uid() = user_id);

-- Notifications: Users view and update their notifications
CREATE POLICY "Users manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- Audit Logs: Users view their own logs
CREATE POLICY "Users view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS FOR AUTO-CREATING PROFILES & UPDATING TIMESTAMPS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    INSERT INTO public.automation_rules (user_id)
    VALUES (new.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
