# Deployment Guide — Atharv Intelligence (no credit card)

Free, no-card setup:
- **Frontend (Next.js)** → [Vercel](https://vercel.com) free hobby (no card)
- **Backend (Express + Socket.io)** → [Koyeb](https://koyeb.com) free Hobby plan via GitHub signup (no card)
- **Database / Auth / Storage** → [Supabase](https://supabase.com) free (already configured)

Both Koyeb and Vercel free tiers **scale to zero / spin down when idle** and
**wake automatically on the first request**. So your friend just opens the URL at
9pm; the frontend is always up (Vercel) and the WebSocket backend wakes itself
(~5–15s cold start), then the socket reconnects. No phone action needed.

Supabase is always-on (free), so data/auth never sleep.

---

## 0. Repo layout (monorepo)
```
backend/   -> Express + Socket.io  (deploy to Koyeb, workdir: backend)
frontend/  -> Next.js             (deploy to Vercel, root dir: frontend)
```

## 1. Backend → Koyeb (no card)
1. Go to https://koyeb.com and **sign up with your GitHub account** (this joins the
   free Hobby plan — no card required).
2. **Create Web Service** → deploy from **GitHub** → select this repo (`Atharv-intelligence`).
3. Builder: **Buildpack** (default). Expand "Advanced" and set:
   - **Work directory:** `backend`
   - **Build command:** `npm ci && npm run build`
   - **Run command:** `node dist/index.js`  (or leave blank — the `backend/Procfile` sets it)
   - **Exposed ports:** `4000` (type `http`)
4. **Environment variables** (add these):
   ```
   PORT=4000
   NODE_ENV=production
   NPM_CONFIG_PRODUCTION=false        # keep devDeps so `tsc` build works
   SUPABASE_URL=https://dvslxgdmpftlgcnpdhgm.supabase.co
   SUPABASE_ANON_KEY=<anon key from supabase.com > Settings > API>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from same page>
   ADMIN_JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   CORS_ORIGINS=https://<your-vercel-url>   # set after step 2 below
   STORAGE_BUCKET=attachments
   ```
   (You can fill `CORS_ORIGINS` after you create the Vercel project, then redeploy.)
5. **Deploy.** Koyeb gives a URL like `https://atharv-backend-xxxx.koyeb.app`
   (HTTPS, WebSocket-capable). Note it — you need it for the frontend.

Health check (optional): set path `/health`.

## 2. Frontend → Vercel (no card)
1. Go to https://vercel.com and **sign up with GitHub** (no card required).
2. **Add New Project** → import this repo.
3. **Root Directory:** `frontend`.
4. Framework preset: **Next.js** (auto-detected). Build/install commands are automatic.
5. **Environment Variables** (build-time — must be set before first build):
   ```
   NEXT_PUBLIC_API_URL=https://<your-koyeb-backend-url>
   NEXT_PUBLIC_SOCKET_URL=https://<your-koyeb-backend-url>
   NEXT_PUBLIC_UPLOAD_FOLDER=user
   ```
6. **Deploy.** Vercel gives `https://atharv-intelligence-xxxx.vercel.app`.

## 3. Wire them together
1. Copy the Vercel URL from step 2.
2. On Koyeb, edit the backend service env: set
   `CORS_ORIGINS=https://<your-vercel-url>` and **redeploy**.
3. (Optional) If you set the Vercel env vars with a placeholder backend URL first,
   go back to Vercel → project → Settings → Environment Variables, fix the two
   `NEXT_PUBLIC_*` URLs to the real Koyeb URL, and **Redeploy**.

## 4. Done — how it behaves
- Friend opens the Vercel URL → frontend loads.
- Frontend opens a WebSocket to the Koyeb backend → if asleep, Koyeb wakes it
  (~5–15s), then the socket connects. The UI shows a "connecting" state and
  recovers automatically.
- After 15 min of no traffic the backend spins back down. Free, no card, no action.

## 5. Post-deploy checks
1. Visit the Vercel URL — you should see the chat interface.
2. Visit `/login`, sign in as the operator (`atharv@atharvintelligence.com`).
3. Open a second tab as a visitor. Send a text/image/voice note; watch it appear
   in the Command Center in real time. Reply from the Command Center — the visitor
   sees the reply + typing indicator with no refresh.
4. Reload — history persists (from Supabase).

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| "Connection is not ready yet" | `NEXT_PUBLIC_SOCKET_URL` wrong, or backend asleep (wait ~15s and retry). |
| Visitor messages don't reach Command Center | `CORS_ORIGINS` on Koyeb missing the exact Vercel origin. |
| Sign-in fails | Operator not in `admin_users`; or wrong Supabase keys. |
| Uploads fail | Bucket `attachments` missing, or `STORAGE_BUCKET` wrong. |
| Backend won't build on Koyeb | Ensure `NPM_CONFIG_PRODUCTION=false` is set (devDeps pruned otherwise). |
