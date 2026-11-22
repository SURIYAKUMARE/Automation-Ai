# SocialFlow workspace comparison

The supplied workspace URL redirected to the GravityWrite sign-in page. The public page describes account connection, platform-specific publishing, next-slot queues, a drag-and-drop calendar, media reuse and analytics. Both accessible screens were inspected and captured for internal comparison. The private dashboard layout and interactions could not be observed. The implementation uses the existing SocialFlow identity and an original workspace layout. [GravitySocial public feature guide](https://gravitywrite.com/social-media-management-tool)

| Workflow | Existing SocialFlow implementation | Priority for this update |
| --- | --- | --- |
| Workspace navigation | Active horizontal navigation. An unused sidebar and header contained sample indicators. | Use the shared sidebar and replace sample indicators with navigation, search, account settings and actual notifications. |
| Composer and accounts | Private uploads, Gemini image and sampled video analysis, per-platform editing, four official OAuth adapters and explicit upload-publishing consent. | Reuse stored assets, surface connected destinations and add clearly labeled previews and a next-slot action. |
| Calendar and queues | Persistent PostgreSQL jobs, a month grid and schedule editing, with campaign-level dispatch and destination-level retries. | Add week and day views, platform filtering and server-backed drag rescheduling. Surface queued, published and draft posts independently. |
| Media library | Owner-scoped media list, uploads, metadata, thumbnails and deletion endpoints. | Add a searchable library, named collections and composer reuse. |
| Analytics | Database-backed publishing counts and provider metrics where available. | Preserve analytics and surface pending activity in the workspace overview. |
| Infrastructure | Next.js, React, TypeScript, Tailwind, Supabase, Gemini, FFmpeg and a separate worker. | Retain the deployment model and document additive database changes. |

The local Supabase and Google OAuth configuration previously contained placeholders. Live OAuth and publication still require usable provider settings and authorized test destinations. Platform limits from the previous implementation audit remain applicable.
