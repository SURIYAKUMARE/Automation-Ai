import { NextRequest, NextResponse } from 'next/server';
import { authorizeAI } from '@/lib/ai/request';
import { generateSocialContent, MediaGroundingError } from '@/lib/ai/gemini';
import { stringToUuid } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOwnedStoragePath, mediaSizeLimit } from '@/lib/publishing/media';
import { MediaToolsError, prepareStoredMedia } from '@/lib/publishing/media-inspection';
import { postIdSchema, platformSchema } from '@/lib/publishing/campaign';
import { mediaCompatibilityError, captionLimits } from '@/lib/publishing/compatibility';

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const assetId = postIdSchema.safeParse((await req.json().catch(() => null))?.mediaAssetId);
  if (!assetId.success) return NextResponse.json({ error: 'Select an uploaded media asset' }, { status: 400 });
  const access = await authorizeAI(req);
  if (access.response) return access.response;
  const user = access.user;
  try {
    const db = createAdminClient();
    const [consent, stored] = await Promise.all([
      db.from('upload_automation').select('*').eq('user_id', user.id).maybeSingle(),
      db.from('media_assets').select('*').eq('user_id', user.id).eq('id', assetId.data).maybeSingle(),
    ]);
    if (consent.error || stored.error) throw new Error('Could not load upload publishing settings and media');
    const settings = consent.data;
    if (!settings?.enabled) return NextResponse.json({ error: 'Upload publishing has not been authorized' }, { status: 403 });
    const asset = stored.data;
    if (!asset || !isOwnedStoragePath(asset.file_path, user.id)) return NextResponse.json({ error: 'Uploaded media unavailable' }, { status: 404 });

    const id = stringToUuid('upload-publish:' + user.id + ':' + asset.id);
    const prior = await db.from('posts').select('id,status').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (prior.error) throw prior.error;
    if (prior.data) return NextResponse.json({ success: true, post: prior.data, duplicate: true });

    const { data: accounts, error: accountError } = await db.from('social_accounts').select('id,platform')
      .eq('user_id', user.id).eq('status', 'active').in('id', settings.account_ids);
    if (accountError) throw accountError;

    if (!accounts || accounts.length !== settings.account_ids.length) {
      return NextResponse.json({ error: 'One or more authorized upload destinations are disconnected' }, { status: 409 });
    }
    const platforms = [...new Set(accounts.map((account) => platformSchema.parse(account.platform)))];
    for (const platform of platforms) {
      const reason = mediaCompatibilityError(platform, asset);
      if (reason) return NextResponse.json({ error: reason + ' No destinations were queued.' }, { status: 422 });
    }

    const { data: file, error } = await db.storage.from('media-assets').download(asset.file_path);
    if (error || !file || file.size > mediaSizeLimit(asset.mime_type)) throw new Error('Could not read the stored upload');
    const media = await prepareStoredMedia(Buffer.from(await file.arrayBuffer()), asset.mime_type);
    const result = await generateSocialContent({
      ...media, targetPlatforms: platforms, language: settings.language, tone: 'Professional',
      brand: asset.media_type === 'video' ? access.brand : null,
    });
    const variants = platforms.map((platform) => {
      const copy = result.platforms[platform];
      if (!copy) throw new Error('Missing generated copy for ' + platform);
      const hashtags = copy.hashtags.slice(0, platform === 'instagram' ? 5 : 10);
      let caption = copy.caption;
      const maxLen = captionLimits[platform];
      const tagsLen = hashtags.length ? 2 + hashtags.join(' ').length : 0;
      if (caption.length + tagsLen > maxLen) {
        caption = caption.slice(0, Math.max(10, maxLen - tagsLen - 3)) + '...';
      }
      return {
        platform, caption, title: copy.title, hashtags, keywords: copy.keywords,
        language: settings.language, tone: 'Professional', call_to_action: copy.call_to_action || '',
        youtube_privacy: platform === 'youtube' ? settings.youtube_privacy : null,
        alt_text: platform === 'instagram' && asset.media_type === 'image' ? (copy.alt_text || result.summary.slice(0, 300)) : null,
      };
    });
    const { data: post, error: queueError } = await db.rpc('create_automatic_campaign', {
      owner_id: user.id, consent_revision: settings.revision,
      campaign: { id, media_asset_id: asset.id, title: result.summary.slice(0, 200), status: 'approved',
        publishing_mode: 'automatic', target_platforms: platforms },
      variants, destinations: accounts.map((a) => ({ id: a.id })),
    });
    if (queueError) {
      if (/consent changed|destinations changed/i.test(queueError.message)) {
        return NextResponse.json({ error: 'Upload publishing settings changed. Review them and retry.' }, { status: 409 });
      }
      throw queueError;
    }
    if (!post?.id) throw new Error('Post was not queued');
    return NextResponse.json({ success: true, post, source: result.source }, { status: 202 });
  } catch (error) {
    console.error('Upload automation caught error:', error);
    if (error instanceof MediaGroundingError || error instanceof MediaToolsError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : 'Could not analyze and queue this upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
