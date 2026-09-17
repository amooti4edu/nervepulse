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

Copy `.env.local` (already present for local dev) or set these in the Vercel
dashboard under Project Settings -> Environment Variables:

| Variable | Exposed to browser? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_URL` | No | Same URL, read server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | No | From Supabase -> Project Settings -> API. Used only by `lib/supabase/admin.ts` for privileged operations (e.g. adding a member by email) |
| `OPENROUTER_API_KEY` | No | Used by the AI-classify Server Action in Capture |

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
├── agent.ts           # model config (Claude, via ANTHROPIC_API_KEY)
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
- **Model**: uses Claude directly via `ANTHROPIC_API_KEY` (set this in
  `.env.local` / Vercel env vars) rather than the Vercel AI Gateway.
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


## Database

`supabase/migrations/` is carried over unchanged -- this app talks to the same
Supabase project/schema as the original.
