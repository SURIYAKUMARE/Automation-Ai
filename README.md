# SocialFlow AI

SocialFlow AI extends the existing Next.js dashboard and Supabase data model. Creators can upload media or start from text, generate and edit platform copy, save a draft, request approval, and queue a release. The publishing worker submits each destination independently and records its response in History.

## Repository audit

The existing project had account, studio, calendar, approval and analytics screens, a Supabase schema, Gemini generation, and four official provider adapters. It also had shared demo authentication, storage and post creation that could acknowledge failed writes, competing scheduler endpoints, credential-cookie fallbacks, and simulated calendar and analytics results. The implementation retains the dashboard and adapters, moves state transitions into Postgres, and routes provider publishing through one authenticated worker.

## Local setup

1. Use Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env.local` and set the server configuration. Generate unique random values for the session, token encryption and worker secrets.
3. Apply the SQL migrations in `supabase/migrations` in filename order with the Supabase CLI. For an existing project, check its migration history first and apply only unapplied migrations. The second migration creates or makes the media bucket private, grants publishing functions to the service role, and extends the existing tables.
4. Run `npm run dev`. In a second terminal, run `npm run worker`.
5. Open `http://localhost:3000`. Create a Supabase account or sign in with Google, connect destinations, and open **Publish Now**.
6. Add media or text context, choose the target platforms, and generate or write captions. Review each platform tab before sending to Approval Center, queuing immediately, or scheduling. Open **History** for confirmed outcomes and **Schedules** for editing, cancellation, and weekly occurrences.

For a bucket provisioned on a project with a smaller storage limit, the provider limit takes precedence. The application accepts up to 15 MB for images and 100 MB for video on hosts that permit those request sizes. Videos are analyzed using a representative frame prepared by the browser.

## Provider setup

Register the callback URL exactly as shown with the provider, using your deployed `APP_URL` as the origin. Google sign-in and the YouTube connection use separate grants.

| Provider | Callback path | Requirements and current coverage |
| --- | --- | --- |
| Google sign-in | `/api/auth/google/callback` | OAuth client for OpenID, email and profile. |
| Facebook | `/api/oauth/facebook/callback` | Eligible Page, content-publishing Page task, and Meta access for `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts`. Text, image and supported video. [Meta Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/) |
| Instagram | `/api/oauth/instagram/callback` | Professional account linked to a managed Page. The adapter requests `instagram_basic` and `instagram_content_publish`. JPEG and supported MP4/MOV Reels. [Meta Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/) |
| LinkedIn | `/api/oauth/linkedin/callback` | LinkedIn sign-in and Share on LinkedIn product for member publishing. Text, JPEG and PNG. MP4 uses the existing legacy asset path and depends on provider access. Member analytics requires separately approved `r_member_postAnalytics`. [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) |
| YouTube | `/api/oauth/youtube/callback` | YouTube Data API v3, an eligible channel, and `youtube.upload` plus `youtube.readonly`. Unverified upload projects may have visibility restricted by YouTube. [Video upload requirements](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert) |

Meta discovery connects the first eligible destination returned by the provider. Dedicated destination selection inside the provider connection flow and LinkedIn organization publishing are pending. Reconnect older cookie-only accounts and any account whose original grant has expired. Rotate the Gemini key and webhook verification tokens that appeared in source, and review older Facebook Page grants if the project used the old metadata storage. Keep the encryption key available if existing encrypted connection rows must be retained.

Configure Gemini with a valid API key and model available for that project. Live caption generation requires quota. The YouTube chart requires an optional restricted server API key and covers only the entries YouTube returns for a region. Gemini hashtag suggestions are ranked by relevance and labeled separately. [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) · [YouTube chart](https://developers.google.com/youtube/data/reference/rest/v3/videos/list)

## Production deployment

- Apply migrations before starting the app. Keep a database backup and verify the service-role connection and media bucket using a staging project.
- Use `npm ci && npm run build && npm start` on a Node host, or build the included Docker image. Configure HTTPS, the exact OAuth origin, and a proxy request-body limit above the allowed media size. Set platform API versions supported by your developer projects.
- Run `npm run worker` as a supervised process, or call `POST /api/scheduler/execute` on a managed schedule with `Authorization: Bearer <CRON_SECRET>`. The database is the durable queue. Each worker call claims one due post. Parallel workers use row locks, and successful destinations are retained when other targets fail.
- For rate-limit rejections and transient errors before the final provider submission, the worker schedules bounded exponential retries. For an unreconciled submission, History shows an unknown outcome and the destination must be checked before another attempt. Run multiple worker instances if queue latency requires it.
- `GET /api/health` checks database access. Monitor worker uptime and queued and failed jobs. Production approval should include live OAuth, sandbox or designated test-account publishing, and metrics checks for each configured provider.

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

The database tests load both migrations in embedded PostgreSQL with local Supabase schema stubs. The end-to-end suite starts the built app and checks the API and a mobile-width Chromium session with mocked Supabase, Gemini and Facebook responses. Automated verification creates no live account connections or provider posts. Analytics displays observed metrics and follower or subscriber changes where supported. Video analysis uses a frame and does not transcribe audio.
