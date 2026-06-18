## Goal
Make the GitHub repo deploy directly on Vercel with zero manual configuration after the user imports it.

## Background
The app is TanStack Start + Vite, built through `@lovable.dev/vite-tanstack-config`, which uses Nitro under the hood and defaults to a **Cloudflare Workers** preset. Vercel won't run a Cloudflare bundle, so we need to switch the Nitro build target to `vercel` and add Vercel project files.

## Changes

1. **`vite.config.ts`** — pass `nitro: { preset: "vercel" }` (or `vercel-edge`) through the Lovable config so the build emits a Vercel-compatible `.vercel/output` directory.

2. **`vercel.json`** (new) — minimal config:
   - `buildCommand: "bun run build"` (or npm)
   - `installCommand: "bun install"`
   - `framework: null` (Nitro emits the Build Output API directly)
   - No `outputDirectory` needed — Nitro writes to `.vercel/output` which Vercel auto-detects.

3. **`.vercelignore`** (new) — exclude `node_modules`, `.env`, `dist`, `.output`.

4. **`README.md`** — add a "Deploy to Vercel" section listing the env vars the user must set in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LOVABLE_API_KEY` (optional — primary AI)
   - `GROQ_API_KEY` (fallback AI)

## What the user does after I push
1. Go to vercel.com → New Project → Import the GitHub repo.
2. Paste the env vars above in the Vercel "Environment Variables" screen.
3. Click Deploy. Done.

## Out of scope
- I cannot add Vercel secrets for you (no Vercel tool access) — you must paste env vars in Vercel's UI once.
- The Lovable preview keeps working on Cloudflare via the Lovable build pipeline; only the GitHub→Vercel path uses the Vercel preset.

Confirm and I'll implement.