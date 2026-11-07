# Nerve-Pulse (Next.js)

Ported from the original TanStack Start app to Next.js 15 (App Router), for
deployment on Vercel.

## What changed from the original

- **Routing**: TanStack Router file routes -> Next.js App Router (`app/**/page.tsx`),
  with route groups (`(authenticated)`) replacing the `_authenticated` layout guard.
- **Auth**: Client-only Supabase session -> cookie-based session via `@supabase/ssr`,
  refreshed in `middleware.ts` on every request. This removed the need to manually
  attach a bearer token to server calls.
- **Server functions**: `createServerFn` (TanStack Start) -> Next.js Server Actions
  (`"use server"`), in `lib/actions/`.
- Everything else (Supabase schema, RLS, UI, react-query hooks, design tokens) is
  unchanged.

## Environment variables

Fill in the project-root `.env` file for local development, or set these in the
Vercel dashboard under Project Settings -> Environment Variables. A `.env.local`
file, if present, overrides `.env`:

| Variable                               | Exposed to browser? | Notes                                                                                                                                    |
| -------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes                 | Your Supabase project URL                                                                                                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes                 | Supabase anon/publishable key                                                                                                            |
| `SUPABASE_URL`                         | No                  | Same URL, read server-side                                                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`            | No                  | From Supabase -> Project Settings -> API. Used only by `lib/supabase/admin.ts` for privileged operations (e.g. adding a member by email) |
| `OPENROUTER_API_KEY`                   | No                  | Shared by all AI features: Capture classification and the in-app assistant |
| `OPENROUTER_MODEL`                     | No                  | Shared OpenRouter model ID; defaults to `z-ai/glm-5.3-flash` if unset or blank |

## Local development

```bash
npm install
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it in Vercel -- it auto-detects Next.js, no config needed.
3. Add the environment variables above in the Vercel project settings
   (Production, and Preview if you want preview deployments to work against
   the same Supabase project).
4. Deploy. Server Actions and middleware both run natively on Vercel's
   infrastructure.

## In-app AI assistant (eve.dev)

This app also mounts an [eve](https://eve.dev) agent — Vercel's agent
framework — inside the same Next.js project. It's the "Nerve-Pulse
Assistant" sparkle button in the top nav (client components only,
`(authenticated)` routes).

```
agent/
├── agent.ts           # model config (OpenRouter, via OPENROUTER_API_KEY)
├── instructions.md     # system prompt
├── channels/eve.ts      # auth: verifies the same Supabase session cookie
└── tools/
    └── my_open_signals.ts  # looks up the caller's own open signals
```

- **Auth**: `agent/channels/eve.ts` authenticates each request against the
  same Supabase cookie session the rest of the app uses (see
  `lib/supabase/server.ts`) — no separate login or token needed. This
  replaces eve's default `placeholderAuth()`, which otherwise rejects all
  production traffic.
- **Model**: all AI features use OpenRouter with `OPENROUTER_API_KEY`; no
  Anthropic API key or Vercel AI Gateway is needed. Set `OPENROUTER_MODEL` in
  `.env` / deployment environment variables to choose the shared model for
  both the assistant and Capture classification. Unset/blank values default
  to `z-ai/glm-5.3-flash`. Choose a model supporting tool calling and JSON
  output, with at least the assistant's configured 131,072-token context
  window. Restart the application after changing the model. Model selection
  is centralized in `lib/ai-config.ts`.
- **Requires Node.js 24+** — already declared in `package.json`'s `engines`
  field. Vercel picks this up automatically; if you develop locally, make
  sure your local Node version matches (`nvm install 24`).
- **Local dev**: `npm run dev` boots the eve dev server alongside `next dev`
  automatically — no separate process to run.
- **Deploying**: no extra Vercel configuration needed. `withEve()` in
  `next.config.ts` writes the additional Build Output config Vercel needs at
  build time.

To extend it, add more files under `agent/tools/`, `agent/skills/`, etc. —
see the bundled docs in `node_modules/eve/docs/` after `npm install`, or
<https://eve.dev/docs>.

## Collaboration UX and database upgrade

**Apply `supabase/migrations/20260916110000_collaboration_ux.sql` to the existing
Supabase database before deploying this UI.** Use your normal Supabase migration
workflow (`supabase db push` against the linked project), or review and run the
migration in the Supabase SQL editor. This repository's early migrations assume
the original application's base schema already exists; they do not provision an
empty database.

The new migration adds:

- Self-managed `signal_followers` protected by row-level security.
- `signal_mentions` events so a second mention can notify an existing participant.
- A nullable `notifications.comment_id` for discussion links and precise deduplication.
- Database triggers for reply, status, assignment, and forward notifications.
- Realtime publication entries for discussion and notification updates.

Notification delivery and subscription defaults happen in the database. Creators
and personal owners of existing signals are initially subscribed; users can
unfollow. New creators and newly assigned personal owners are subscribed
atomically. Space assignments/forwards alert members with that primary space.
Direct self-notifications are suppressed. Notifications do not grant signal
access or include comment bodies; existing signal RLS remains authoritative.
Review any custom notification triggers in your deployed database to avoid
running an additional delivery mechanism alongside this one.

### How users work

- **My inbox** is the starting page: assigned active work, unread personal
  mentions, unread mentions/forwards requesting input, and followed signals.
  “Needs a response” is a review queue, not an overdue-response calculation.
- **Capture** supports manual type, priority, space, and optional title; AI
  classification remains optional and requires review before saving.
- **Discussions** are signal-scoped, not private chats. They use realtime updates
  with a 10-second polling fallback. Follow/unfollow controls reply/status alerts;
  direct mentions and assignments still notify people who unfollow.
- **Mention** asks for attention; **Forward** requests input without changing
  ownership; **Assign** changes responsibility. Team mentions add participants
  but do not notify every team member.
- **Updates, announcements, decisions, and events** are published/archived, using
  the existing `open`/`closed` values. Actionable signals retain a work lifecycle;
  acknowledged work can be resolved directly, and closed work can be reopened.
- **Notifications** stay unread until opened or explicitly marked read. Marking a
  notification read does not resolve its signal or send a reply. Users can mark
  items unread again. Inbox/notification lists show up to the latest 100 items.
- **Onboarding** explains how to join an existing organization instead of creating
  a duplicate workspace. Email invitations are not implemented; an administrator
  adds already-registered users through Settings.

Persistent hints, expandable explanations, and empty/error states explain these
behaviors beside the relevant controls. These notifications are in-app only;
this change does not add email, push delivery, direct messaging, or read receipts.

### Validation

```bash
npm test
npx tsc --noEmit
npm run lint
```

Tests cover workflow choices and run the new migration against an in-memory
Postgres (PGlite) fixture, including RLS boundaries, notification delivery,
unfollowing, and read/unread updates. The fixture represents the required base
tables, not your deployed policies: also smoke-test with your real Supabase RLS
and two authenticated users before release. Verify that a reply appears in the
other user's open thread, a repeated mention alerts an existing participant,
unfollowing stops reply alerts, and opening Notifications alone leaves unread
items untouched.
