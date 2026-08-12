# Deployment Guide — atharvintelligence.com

Production setup for the three pieces:

| Piece | Host | Why |
| --- | --- | --- |
| Frontend (Next.js) | [Vercel](https://vercel.com) | Free tier, auto HTTPS, git-connected |
| Backend (Express + Socket.io) | [Railway](https://railway.app) | Native WebSocket support, HTTPS |
| Database / Auth / Storage | [Supabase](https://supabase.com) | Fully managed Postgres + Auth + Storage |
| DNS | [Cloudflare](https://cloudflare.com) | Fast DNS + edge SSL + free proxy |

Recommended order: **Supabase → Backend → Frontend → Domain → Wire together.**

---

## 1. Supabase (data, auth, storage)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **SQL Editor → New query** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates `conversations`, `messages`, `admin_users`, RLS policies, and the
   `attachments` storage bucket.
3. **Authentication → Providers** — ensure **Email** is enabled.
4. **Authentication → Users → Add user** → create the operator account
   (`atharv@atharvintelligence.com`, strong password).
5. Copy the new user's UUID from the Users table and insert them as an admin:
   ```sql
   insert into public.admin_users (id, display_name)
   values ('<user-uuid>', 'Atharv');
   ```
6. **Project Settings → API** — copy the **Project URL** and the **service_role** key.
   The service role key is a server-only secret; never put it in the frontend.

---

## 2. Backend (Railway)

1. Push the repo to GitHub, then go to [railway.app](https://railway.app) →
   **New Project → Deploy from GitHub repo** → select the repo.
2. Railway auto-detects the monorepo's `package.json` files. Point the backend
   service at the **`backend`** root directory (Railway → service → Settings →
   Root Directory → `backend`).
3. Set the start command: `npm run build && npm start` (or `node dist/index.js`).
4. Add these environment variables (Railway → service → Variables):
   ```
   PORT=4000
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   ADMIN_JWT_SECRET=<generated secret>
   CORS_ORIGINS=https://atharvintelligence.com,https://www.atharvintelligence.com
   STORAGE_BUCKET=attachments
   ```
   Generate the JWT secret:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
5. Railway gives the service a public domain like `atharv-intelligence.up.railway.app`
   and provisions HTTPS automatically. WebSockets work out of the box — no extra config.
6. Verify: `curl https://<your-service>.up.railway.app/health` returns `{"ok":true,...}`.

> **Alternatives:** **Render** — create a Web Service from the repo, root directory
> `backend`, build `npm install && npm run build`, start `npm start`. Render supports
> WebSockets on paid/Starter plans; on the free tier you must keep the service alive
> with a ping (e.g. UptimeRobot) and note the 15-minute sleep behavior.
> **Fly.io** and **AWS Elastic Beanstalk** also work for the same Docker-less Node setup.

---

## 3. Frontend (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
2. **Root Directory:** `frontend`.
3. **Framework Preset:** Next.js (auto-detected). Build command `npm run build`,
   output `Next.js`.
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://<your-service>.up.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://<your-service>.up.railway.app
   NEXT_PUBLIC_UPLOAD_FOLDER=user
   ```
5. **Deploy.** Vercel gives you `https://<project>.vercel.app` with HTTPS.

> **Alternative:** **Netlify** — build command `npm run build`, publish directory
> `.next`, framework preset Next.js. Add the same env vars.

---

## 4. Custom domain + SSL

### Buy the domain
Namecheap, GoDaddy, Cloudflare Registrar, or Google Domains. ~$10–14/yr.
`atharvintelligence.com`.

### Point DNS at Cloudflare (recommended for free edge SSL + speed)
1. Create a free Cloudflare account → **Add a site** → `atharvintelligence.com`.
2. Cloudflare scans existing DNS. Update your registrar's nameservers to the two
   Cloudflare ones it gives you (this is where "Propagation pending" appears —
   usually < 1 hour).
3. In Cloudflare **DNS → Records**, add:
   | Type | Name | Content | Proxy |
   | --- | --- | --- | --- |
   | CNAME | `@` | `atharv-intelligence.vercel.app` (your Vercel URL) | Proxied |
   | CNAME | `www` | `atharv-intelligence.vercel.app` | Proxied |
   | CNAME | `api` | `<your-service>.up.railway.app` | Proxied (or DNS only) |

### Connect the domain on Vercel
1. Vercel → project → **Settings → Domains** → **Add** → `atharvintelligence.com`
   and `www.atharvintelligence.com`. Vercel auto-issues an SSL certificate
   (Let's Encrypt) once DNS resolves.

### Point the backend at the custom subdomain (optional but clean)
1. Railway → service → **Networking → Custom Domain** → `api.atharvintelligence.com`
   → it asks you to add a DNS record (the CNAME above covers it).
2. Railway provisions an SSL certificate automatically.
3. Update CORS on the backend to include the real origin:
   ```
   CORS_ORIGINS=https://atharvintelligence.com,https://www.atharvintelligence.com
   ```
4. Update the frontend env vars to use the custom URLs, then redeploy:
   ```
   NEXT_PUBLIC_API_URL=https://api.atharvintelligence.com
   NEXT_PUBLIC_SOCKET_URL=https://api.atharvintelligence.com
   ```

### SSL / HTTPS checklist
- Cloudflare's proxied records automatically serve HTTPS at the edge.
- Vercel + Railway each issue their own certificates — make sure **Always Use HTTPS**
  is on in Cloudflare (SSL/TLS → Edge Certificates).
- If Cloudflare proxy causes WebSocket issues, add an exception: Cloudflare handles
  WebSockets over HTTPS automatically when "WebSockets" is enabled in the
  Network settings (on by default for all plans).

---

## 5. Post-deploy checks

1. Visit `https://atharvintelligence.com` — you should see the chat interface.
2. Visit `https://atharvintelligence.com/login` and sign in as the operator.
3. Open the site in a second tab/browser as a visitor. Send a text, an image, and a
   voice note. Watch them appear in the Command Center queue in real time.
4. Reply from the Command Center — the visitor should see the reply plus the live
   typing indicator, with no page refresh.
5. Reload both tabs — history should persist (fetched from Supabase).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Chat says "Connection is not ready yet" | `NEXT_PUBLIC_SOCKET_URL` wrong, or backend not on HTTPS. Re-check env vars + Railway domain. |
| Visitor messages don't reach the Command Center | CORS mismatch: confirm `CORS_ORIGINS` includes the exact visitor origin (no trailing slash). |
| Sign-in fails at `/api/admin/sign-in` | Verify the operator is inserted into `admin_users`; check `SUPABASE_SERVICE_ROLE_KEY`. |
| Images/voice won't upload | Bucket name must be `attachments` (or match `STORAGE_BUCKET`); confirm the schema SQL ran. |
| Socket keeps reconnecting (404) | Old `socket.io` client vs server version mismatch — deploy both fresh from this repo. |
| Free-tier Render backend sleeping | Set `PORT` env; add UptimeRobot ping to `/health`; upgrade to a paid instance for persistent WebSockets. |

## Cost estimate (everything running)

| Service | Cost |
| --- | --- |
| Supabase free tier | $0 |
| Vercel hobby | $0 |
| Railway (1 small instance) | ~$5/mo |
| Domain | ~$10–14/yr |
| Cloudflare | $0 |
