# DropshipOS

A from-scratch rebuild: React + Vite frontend (`/web`), Express proxy (`/server`), Supabase for auth/data.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql` once.
3. Grab your project's `URL`, `anon` public key, and `service_role` secret key from Settings → API.

> **Security note:** the migration is shipped verbatim from spec. `user_usage` has **no RLS policy** — only `vendors`, `orders`, `customers`, and `saved_items` do. That table is only ever written by the proxy (service key), so the app is safe as built, but if you ever expose `user_usage` to direct client reads/writes, add RLS to it too:
> ```sql
> alter table user_usage enable row level security;
> create policy "own row only" on user_usage for select using (auth.uid() = user_id);
> ```

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

## 5. Test checklist before calling it done

- [ ] Sign up creates a `user_usage` row automatically
- [ ] Add a vendor, log out, log back in on a different browser — vendor still there (confirms Supabase persistence, not localStorage)
- [ ] Run Smart Sourcing with RapidAPI quota artificially set to 0 (`rapidapi_calls_used = rapidapi_calls_limit` in the `user_usage` table) — confirms graceful degrade to search buttons
- [ ] Set `actions_limit` to 1, run 2 actions — second one is blocked with the upgrade modal, not a crash
- [ ] No API keys visible anywhere in browser dev tools / network tab (only `Authorization: Bearer <supabase token>` should appear)
- [ ] Vision (image upload) sourcing works without timing out
- [ ] Every module's create/edit/delete actually persists to Supabase (spot check the table directly in the Supabase dashboard)

## Project layout

```
web/        React + Vite frontend, deploys to Netlify
server/     Express proxy (Anthropic + RapidAPI calls, usage metering), deploys to Fly.io
supabase/   SQL migrations
```
