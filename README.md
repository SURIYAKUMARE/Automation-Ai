# SocialFlow AI

SocialFlow AI extends the existing Next.js dashboard and Supabase data model. Creators can upload media or start from text, generate and edit platform copy, save a draft, request approval, and queue a release. The publishing worker submits each destination independently and records its response in History.

## Repository audit

The existing project had account, studio, calendar, approval and analytics screens, a Supabase schema, Gemini generation, and four official provider adapters. It also had shared demo authentication, storage and post creation that could acknowledge failed writes, competing scheduler endpoints, credential-cookie fallbacks, and simulated calendar and analytics results. The implementation retains the dashboard and adapters, moves state transitions into Postgres, and routes provider publishing through one authenticated worker.

## Local setup

1. Use Node.js 24 and run `npm ci`. Install FFmpeg and FFprobe locally for video uploads and server-side caption generation.
2. Copy `.env.example` to `.env.local`. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to values from the same Supabase project. The legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported. Generate unique random values for the session, token encryption and worker secrets.
3. Check the project's migration history with `supabase migration list` and apply unapplied migrations with `supabase db push` on the linked staging project. The migrations define the private media bucket and persistent queue. Apply `20261122010000_workspace.sql` before using media collections, next-slot queueing, or workspace notifications.
4. Run `npm run dev`. In a second terminal, run `npm run worker`.
5. Open `http://localhost:3000`. Create a Supabase account or sign in with Google, connect destinations, and open **Create post**.
6. Attach media or enter text context. The composer generates media captions automatically unless you turn off that setting. Review the platform previews and account selections before saving, publishing, or requesting approval. Open **Calendar** for editing, cancellation, and rescheduling.

For an older SocialFlow database created before the publishing queue, check its migration history and schema before applying the migration chain. The legacy bridge adds the columns and enum values required by the baseline while preserving older post and analytics records. Test the upgrade against a database copy before applying it to a live workspace.

**Add to queue** reserves the next available hourly slot in the workspace. The calendar shows times in the browser's timezone. Posts requiring approval keep their requested slot and are scheduled after approval. The media library supports batch uploads, name and type filters, collection labels, and attachment reuse. A post currently accepts one media asset.

For a bucket provisioned on a project with a smaller storage limit, the provider limit takes precedence. The application accepts up to 15 MB for images and 100 MB for video on hosts that permit those request sizes. Video captions use up to six chronologically sampled frames prepared by the browser.

Under **Publish automatically on upload**, select the exact accounts, confirm authorization, and save. On new posts, picking a file then uploads, analyzes and queues it without a second confirmation. The original stored media is used for analysis. If any saved destination is disconnected or fails preflight, the app leaves the file available for a manual post. Disabling consent prevents future automatic queue entries. Each user can reuse identical media, and automatic publishing creates one campaign per owned media asset. YouTube upload visibility defaults to private for new posts created in the studio.

## Provider setup

Register the callback URL exactly as shown with the provider, using your deployed `APP_URL` as the origin. Google sign-in and the YouTube connection use separate grants.

For public onboarding, configure one OAuth app per provider integration. Each signed-in SocialFlow user grants access from **Social accounts**. Set Google’s audience to External and publish the YouTube OAuth app after completing any required verification. Separate `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` values let you manage that consent flow separately from Google sign-in. For Meta, move the app to Live and obtain Advanced Access for the Page and Instagram permissions used here. For LinkedIn, enable Share on LinkedIn and Sign In with LinkedIn using OpenID Connect. [Google OAuth audience](https://support.google.com/cloud/answer/15549945) · [Meta App Review](https://developers.facebook.com/docs/app-review/) · [LinkedIn publishing permissions](https://learn.microsoft.com/linkedin/consumer/integrations/self-serve/share-on-linkedin)

| Provider | Callback path | Requirements and current coverage |
| --- | --- | --- |
| Google sign-in | `/api/auth/google/callback` | OAuth client for OpenID, email and profile. |
| Facebook | `/api/oauth/facebook/callback` | Eligible Page, content-publishing Page task, and Meta access for `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts`. Text, image and supported video. [Meta Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/) |
| Instagram | `/api/oauth/instagram/callback` | Professional account linked to a managed Page. The adapter requests `instagram_basic` and `instagram_content_publish`. JPEG and supported MP4/MOV Reels. [Meta Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/) |
| LinkedIn | `/api/oauth/linkedin/callback` | LinkedIn sign-in and Share on LinkedIn product for member publishing. Text, JPEG, PNG and MP4. MP4 uses the versioned Videos API with a legacy fallback when the versioned endpoint is unavailable. Member analytics requires separately approved `r_member_postAnalytics`. [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) · [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api) |
| YouTube | `/api/oauth/youtube/callback` | YouTube Data API v3, an eligible channel, and `youtube.upload` plus `youtube.readonly`. Unverified upload projects may have visibility restricted by YouTube. [Video upload requirements](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert) |

Meta discovery connects the first eligible destination returned by the provider. Dedicated destination selection inside the provider connection flow and LinkedIn organization publishing are pending. Reconnect older cookie-only accounts and any account whose original grant has expired. Rotate the Gemini key and webhook verification tokens that appeared in source, and review older Facebook Page grants if the project used the old metadata storage. Keep the encryption key available if existing encrypted connection rows must be retained.

Configure Gemini with a valid API key and model available for that project. Live caption generation requires quota. The YouTube chart requires an optional restricted server API key and covers only the entries YouTube returns for a region. Gemini hashtag suggestions are ranked by relevance and labeled separately. [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) · [YouTube chart](https://developers.google.com/youtube/data/reference/rest/v3/videos/list)

## Production deployment

- Apply migrations before starting the app. Keep a database backup and verify the service-role connection and media bucket using a staging project.
- Use `npm ci && npm run build && npm start` on a Node host with FFmpeg and FFprobe, or build the included Docker image with both tools. Configure HTTPS, the exact OAuth origin, and proxy body and request-time limits that accommodate uploads and analysis. Set platform API versions supported by your developer projects.
- Run `npm run worker` as a supervised process, or call `POST /api/scheduler/execute` on a managed schedule with `Authorization: Bearer <CRON_SECRET>`. The database is the durable queue. Each worker call claims one due post. Parallel workers use row locks, and successful destinations are retained when other targets fail.
- For rate-limit rejections and transient errors before the final provider submission, the worker schedules bounded exponential retries. For an unreconciled submission, History shows an unknown outcome and the destination must be checked before another attempt. Run multiple worker instances if queue latency requires it.
- `GET /api/health` checks connectivity and required database schema, including the queue, media collections, notifications, and AI quota storage. Monitor worker uptime and queued and failed jobs. Production approval should include live OAuth, sandbox or designated test-account publishing, and metrics checks for each configured provider.

## Workspace API

| Route | Behavior |
| --- | --- |
| `GET /api/dashboard/summary` | Returns workspace counts, recent activity, and upcoming publication dates. |
| `GET /api/posts` | Accepts `view=queue\|draft\|scheduled\|published`, a post ID, or a scheduled date range using `from` and `until`. |
| `POST /api/posts/create` | Pass `queueNext: true` to reserve the next available slot. For a custom time, pass `scheduledFor` instead. |
| `GET /api/media/list` | Lists owned media. Accepts `q`, `type`, `collection`, and a zero-based `page`. |
| `GET /api/media/[id]` | Returns owned media details and a signed preview URL. |
| `PATCH /api/media/[id]` | Accepts a `collection` string. An empty value clears the label. |
| `GET /api/notifications` | Returns approval requests, completed publications, and failures. `PATCH` marks notifications as read. |

## Test commands

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

The database tests load all migrations in embedded PostgreSQL with local Supabase schema stubs. The end-to-end suite starts the built app and checks the API and mobile and desktop Chromium sessions with mocked Supabase, Gemini and Facebook responses. Automated verification creates no live account connections or provider posts. Analytics displays observed metrics and follower or subscriber changes where supported. The worker checks YouTube processing for recorded video IDs. Native multi-image posts, audio transcription, account or channel selection during OAuth, resumable upload recovery, a dedicated admin panel, and reconciliation when a provider sends no receipt remain incomplete.
