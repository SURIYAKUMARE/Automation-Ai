import { SocialPlatform } from '@/types';

export interface OAuthUrlParams {
  userId: string;
  redirectUri: string;
  state: string;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  externalAccountId: string;
  accountName: string;
  accountHandle?: string;
  avatarUrl?: string;
  grantedScopes: string[];
  rawMetadata?: Record<string, any>;
}

export interface PublishRequest {
  text: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  tags?: string[];
  youtubePrivacy?: 'private' | 'unlisted' | 'public';
  altText?: string;
  accessToken: string;
  accountId: string;
  metadata?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  processing?: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  actionRequired?: string;
  rawResponse?: any;
}

export interface PlatformAdapter {
  platform: SocialPlatform;
  getAuthorizationUrl(params: OAuthUrlParams): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<OAuthTokenResult>;
  refreshAccessToken?(refreshToken: string): Promise<{ accessToken: string; expiresInSeconds?: number; refreshToken?: string }>;
  publish(request: PublishRequest): Promise<PublishResult>;
  validateToken(accessToken: string, accountId: string): Promise<boolean>;
}
