export type SocialPlatform = 'linkedin' | 'youtube' | 'instagram' | 'facebook';

export type AccountStatus = 'active' | 'expired' | 'revoked' | 'rate_limited' | 'error';

export type MediaType = 'image' | 'video' | 'poster';

export type PublishingMode = 'automatic' | 'manual_approval';

export type PostStatus =
  | 'draft'
  | 'analyzing'
  | 'ready'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'processing'
  | 'published'
  | 'failed'
  | 'reauthorization_required'
  | 'cancelled';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  organization: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  external_account_id: string;
  account_name: string;
  account_handle: string | null;
  avatar_url: string | null;
  granted_scopes: string[];
  token_expires_at: string | null;
  status: AccountStatus;
  metadata?: Record<string, any>;
  last_validated_at: string;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  media_type: MediaType;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
  ai_analyzed: boolean;
  ai_analysis_data?: GeminiAnalysisResult;
  created_at: string;
  updated_at: string;
}

export interface PostVariant {
  id: string;
  post_id: string;
  platform: SocialPlatform;
  caption: string;
  title?: string | null;
  hashtags: string[];
  call_to_action?: string | null;
  language: string;
  tone: string;
  version: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostTarget {
  id: string;
  post_id: string;
  social_account_id: string;
  platform: SocialPlatform;
  status: PostStatus;
  external_post_id?: string | null;
  external_post_url?: string | null;
  error_message?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  account?: SocialAccount;
}

export interface Post {
  id: string;
  user_id: string;
  media_asset_id?: string | null;
  title?: string | null;
  raw_prompt?: string | null;
  publishing_mode: PublishingMode;
  status: PostStatus;
  scheduled_for?: string | null;
  published_at?: string | null;
  target_platforms: SocialPlatform[];
  created_at: string;
  updated_at: string;
  media?: MediaAsset | null;
  variants?: PostVariant[];
  targets?: PostTarget[];
}

export interface AutomationRule {
  id: string;
  user_id: string;
  is_enabled: boolean;
  default_mode: PublishingMode;
  default_language: string;
  default_tone: string;
  enabled_platforms: SocialPlatform[];
  require_review_for_videos: boolean;
  delay_minutes_before_publish: number;
  created_at: string;
  updated_at: string;
}

export interface PublishingAttempt {
  id: string;
  job_id?: string | null;
  post_id: string;
  social_account_id: string;
  platform: SocialPlatform;
  attempt_number: number;
  status: PostStatus;
  error_code?: string | null;
  error_message?: string | null;
  external_post_id?: string | null;
  external_post_url?: string | null;
  created_at: string;
}

export interface ApprovalRecord {
  id: string;
  post_id: string;
  user_id: string;
  variant_id?: string | null;
  platform: SocialPlatform;
  action: 'approved' | 'rejected' | 'modified';
  approved_caption?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  user_id: string;
  post_target_id?: string | null;
  platform: SocialPlatform;
  external_post_id: string;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  synced_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Gemini AI Generation Types
// -----------------------------------------------------------------------------
export interface GeminiPlatformContent {
  caption: string;
  title?: string;
  hashtags: string[];
  call_to_action: string;
  character_count: number;
  estimated_read_time_seconds?: number;
}

export interface GeminiAnalysisResult {
  summary: string;
  detected_objects: string[];
  extracted_text?: string;
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'inspirational' | 'urgent' | 'informative';
  dominant_colors?: string[];
  platforms: {
    linkedin: GeminiPlatformContent;
    instagram: GeminiPlatformContent;
    facebook: GeminiPlatformContent;
    youtube?: GeminiPlatformContent;
  };
}

export type SupportedLanguage = 'English' | 'Tamil' | 'Tanglish';
export type SupportedTone = 'Professional' | 'Friendly' | 'Creative' | 'Educational' | 'Minimal' | 'Promotional';
