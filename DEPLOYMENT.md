# Deployment Guide — Atharv Intelligence (no credit card)

Free, no-card setup:
- **Frontend (Next.js)** → [Vercel](https://vercel.com) free hobby (no card)
- **Backend (Express + Socket.io)** → [SnapDeploy](https://snapdeploy.dev) free container hosting (no card, Docker + WebSocket + auto-wake)
- **Database / Auth / Storage** → [Supabase](https://supabase.com) free (already configured)

Both the SnapDeploy backend and Vercel frontend **spin down when idle and wake
automatically on the first request**. Your friend just opens the Vercel URL at 9pm:
the frontend is always up (Vercel), and the WebSocket backend wakes itself
(~30–60s cold start), then the socket reconnects. No phone action, no card.

Supabase is always-on (free), so data/auth never sleep.

> Dead/blocked alternatives (don't waste time): Glitch (shut down 2025), Koyeb
> (acquired by Mistral, new deploys frozen), Render/Railway/Fly (require a card),
> Hugging Face Docker Spaces (require a paid plan).

---

## 0. Repo layout (monorepo)
```
backend/   -> Express + Socket.io  (deploy to SnapDeploy, root dir: backend, Docker)
frontend/  -> Next.js             (deploy to Vercel, root dir: frontend)
```

## 1. Backend → SnapDeploy (no card)
1. Go to https://snapdeploy.dev and **sign up** (GitHub or email — no card).
2. Dashboard → **Connect GitHub** (Settings → GitHub Integration) and grant access
   to the `Atharv-intelligence` repo.
3. **New Container** → deploy from **GitHub**:
   - Repository: `Atharv-intelligence`, branch `main`
   - **Root directory:** `backend`  (so it finds `backend/Dockerfile`)
   - Name: e.g. `atharv-backend` → URL `https://atharv-backend.containers.snapdeploy.app`
   - **Port:** `4000`
4. **Environment variables:**
   ```
   PORT=4000
   NODE_ENV=production
   SUPABASE_URL=https://dvslxgdmpftlgcnpdhgm.supabase.co
   SUPABASE_ANON_KEY=<anon key from supabase.com > Settings > API>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from same page>
   ADMIN_JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   CORS_ORIGINS=https://<your-vercel-url>   # set after step 2 below
   STORAGE_BUCKET=attachments
   ```
   (The Supabase keys are also in your local `backend/.env.bak`.)
5. **Deploy.** SnapDeploy builds the Dockerfile and gives a `*.containers.snapdeploy.app`
   HTTPS URL (WebSocket-capable). Note it.

Notes:
- Free tier = 10 deploys/day and auto-sleep when idle (wakes on traffic). Pushing to
  `main` auto-deploys, so avoid noisy commits or disable auto-deploy if needed.
- 100 free container-hours (never expire) to try it out.

## 2. Frontend → Vercel (no card)
1. Go to https://vercel.com and **sign up with GitHub** (no card required).
2. **Add New Project** → import this repo.
3. **Root Directory:** `frontend`.
4. Framework preset: **Next.js** (auto-detected). Build/install automatic.
5. **Environment Variables** (build-time — set before first build):
   ```
   NEXT_PUBLIC_API_URL=https://<your-snapdeploy-backend-url>
   NEXT_PUBLIC_SOCKET_URL=https://<your-snapdeploy-backend-url>
   NEXT_PUBLIC_UPLOAD_FOLDER=user
   ```
6. **Deploy.** Vercel gives `https://atharv-intelligence-xxxx.vercel.app`.

## 3. Wire them together
1. Copy the Vercel URL from step 2.
2. On SnapDeploy, edit the backend container env: set
   `CORS_ORIGINS=https://<your-vercel-url>` and **redeploy**.
3. (If you used a placeholder backend URL in Vercel first) fix the two
   `NEXT_PUBLIC_*` vars to the real SnapDeploy URL and **Redeploy** on Vercel.

## 4. Done — how it behaves
- Friend opens the Vercel URL → frontend loads.
- Frontend opens a WebSocket to the SnapDeploy backend → if asleep, it wakes
  (~30–60s), then the socket connects. The UI shows "connecting" and recovers.
- After idle, the backend spins back down. Free, no card, no action.

## 5. Post-deploy checks
1. Visit the Vercel URL — chat interface.
2. Visit `/login`, sign in as the operator (`atharv@atharvintelligence.com`).
3. Second tab as visitor: send text/image/voice; appears in Command Center live.
   Reply from Command Center — visitor sees reply + typing indicator, no refresh.
4. Reload — history persists (Supabase).

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| "Connection is not ready yet" | `NEXT_PUBLIC_SOCKET_URL` wrong, or backend asleep (wait ~60s, retry). |
| Visitor messages don't reach Command Center | `CORS_ORIGINS` on SnapDeploy missing the exact Vercel origin. |
| Sign-in fails | Operator not in `admin_users`; or wrong Supabase keys. |
| Uploads fail | Bucket `attachments` missing, or `STORAGE_BUCKET` wrong. |
| Build fails on SnapDeploy | Ensure **Root directory = `backend`** so `backend/Dockerfile` is used. |

## Last resort (if SnapDeploy also dies)
Run the whole thing serverless on Vercel + a free hosted WebSocket layer
([Apinator](https://apinator.io), Pusher-compatible, no card): merge the backend
REST routes into Next.js API routes and replace socket.io with Apinator pub/sub.
More rework, but uses only rock-solid free no-card platforms.
