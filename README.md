# DropshipOS

A from-scratch rebuild: React + Vite frontend (`/web`), Express proxy (`/server`), Supabase for auth/data.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`, then `0002_user_usage_rls.sql`, then `0003_knowledge_base.sql`, in order.
3. Grab your project's `URL`, `anon` public key, and `service_role` secret key from Settings → API.

`0001_init.sql` is the spec's schema verbatim, which left `user_usage` without RLS (only `vendors`, `orders`, `customers`, and `saved_items` have policies). `0002_user_usage_rls.sql` closes that gap with a `select`-only policy — the frontend only ever reads its own row (`UsageContext`); all writes go through the proxy's service key, which bypasses RLS anyway. `0003_knowledge_base.sql` adds `glossary_terms` and `faq_items` for the Knowledge Base tab, seeded with starter content — these are read-only from the app (no insert/update/delete policy), so add or edit entries directly in the Supabase Table Editor.

All files are safe to re-run (`create table if not exists`, `drop policy if exists` before each `create policy`, `on conflict do nothing` on seed rows, etc.) — if a previous attempt partially failed partway through (e.g. `user_usage` got created but a later table didn't), just re-run the same file rather than trying to hand-patch it.

## 2. Configure environment variables

```bash
cp web/.env.example web/.env
cp server/.env.example server/.env
```

Fill in:
- `web/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PROXY_URL` (leave as `http://localhost:8080` for local dev)
- `server/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, `ALLOWED_ORIGIN` (leave as `http://localhost:5173` for local dev)

## 3. Run locally

```bash
# terminal 1
cd server && npm install && npm run dev

# terminal 2
cd web && npm install && npm run dev
```

Visit the Vite dev URL (usually `http://localhost:5173`), sign up, and confirm your email if Supabase email confirmation is on.

## 4. Deploy

**Frontend → Netlify** (static hosting only, no functions needed):
```bash
cd web && npm run build
```
Deploy the `web/dist` folder to Netlify. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PROXY_URL` (pointed at your deployed Fly.io proxy) as Netlify environment variables, then rebuild.

**Proxy → Fly.io**:
```bash
cd server
fly launch   # creates the app, review fly.toml settings
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_KEY=... ANTHROPIC_API_KEY=... RAPIDAPI_KEY=... RAPIDAPI_HOST=... ALLOWED_ORIGIN=https://your-netlify-site.netlify.app
fly deploy
```

Once the proxy is live, update `VITE_PROXY_URL` in Netlify to the Fly.io URL and redeploy the frontend.

**Proxy → Render (alternative, no CLI needed)**:
Render's web dashboard can get confused about relative paths when the Dockerfile lives in a subfolder, so there's a second Dockerfile at the **repo root** (`/Dockerfile`) purely for Render — it explicitly copies from `server/`, so Render's defaults (blank Root Directory, blank Docker Build Context Directory, Dockerfile Path = `Dockerfile`) just work with no path juggling. To deploy:
1. Render dashboard → New → Web Service → connect this repo, branch `claude/dropshipos-phase-1-rebuild-hqz99s`
2. Leave Root Directory, Docker Build Context Directory blank; set Dockerfile Path to `Dockerfile`
3. Add the same env vars as the Fly.io section above
4. Deploy — Render gives you a URL like `https://xxxx.onrender.com`, use that as `VITE_PROXY_URL`

## 5. Test checklist before calling it done

- [ ] Sign up creates a `user_usage` row automatically
- [ ] Add a vendor, log out, log back in on a different browser — vendor still there (confirms Supabase persistence, not localStorage)
- [ ] Run Smart Sourcing with RapidAPI quota artificially set to 0 (`rapidapi_calls_used = rapidapi_calls_limit` in the `user_usage` table) — confirms graceful degrade to search buttons
- [ ] Set `actions_limit` to 1, run 2 actions — second one is blocked with the upgrade modal, not a crash
- [ ] No API keys visible anywhere in browser dev tools / network tab (only `Authorization: Bearer <supabase token>` should appear)
- [ ] Vision (image upload) sourcing works without timing out
- [ ] Every module's create/edit/delete actually persists to Supabase (spot check the table directly in the Supabase dashboard)

## New signup email alerts (optional)

Get an email to your own inbox every time someone signs up, sent via your own Gmail account (no third-party email service needed):

1. Enable **2-Step Verification** on your Google account (myaccount.google.com/security), then generate an **App Password** at myaccount.google.com/apppasswords.
2. On Render, add three environment variables to the proxy service:
   - `GMAIL_USER` — your Gmail address (alerts are sent from and to this same address)
   - `GMAIL_APP_PASSWORD` — the 16-character App Password from step 1
   - `WEBHOOK_SECRET` — any long random string (this authenticates the webhook call below, since it isn't a real user request)
3. In Supabase, go to **Database → Webhooks → Create a new webhook**:
   - Table: `user_usage`, schema `public`
   - Events: `Insert`
   - Type: `HTTP Request`, method `POST`
   - URL: `https://<your-render-url>/api/webhooks/new-signup`
   - Add an HTTP header: `x-webhook-secret` = the same value as `WEBHOOK_SECRET` above

`user_usage` already gets a row inserted automatically on every signup (via the `handle_new_user` trigger from `0001_init.sql`), so this fires once per new account. The webhook endpoint checks the `x-webhook-secret` header before doing anything, so it can't be triggered by anyone else.

## Security notes

- **Customer/vendor/order data** lives in Postgres tables with row-level security (`auth.uid() = user_id`) — enforced by the database itself, not just app code, so one account can never read or write another's rows even if the frontend were tampered with.
- **Secrets** (`ANTHROPIC_API_KEY`, `RAPIDAPI_KEY`, `SUPABASE_SERVICE_KEY`) only ever live server-side in `server/`; the browser only ever sees the Supabase `anon` key, which is meant to be public and is itself constrained by RLS.
- **AI calls are proxied**, never made directly from the browser, and are gated by `auth` (valid Supabase session required) + `enforceUsageLimit` (per-user monthly quota) before any Anthropic/RapidAPI call runs. `max_tokens` is capped server-side regardless of what a caller requests, since it directly drives API cost.
- The proxy sets standard security headers (`helmet`) and rate-limits `/api/*` (20 req/min/IP) as a backstop against a single caller hammering the AI endpoints faster than the per-user quota check alone would catch.
- `user_usage` is select-only from the client — actual usage increments only happen server-side via the service-role key, so a user can't edit their own quota.
- Customer analysis prompts only send the customer's name and order history to Claude, never their email — minimizing PII sent to a third-party API.

## Project layout

```
web/        React + Vite frontend, deploys to Netlify
server/     Express proxy (Anthropic + RapidAPI calls, usage metering), deploys to Fly.io
supabase/   SQL migrations
```
