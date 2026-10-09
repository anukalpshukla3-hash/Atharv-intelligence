# Atharv Intelligence

A real-time AI companion interface with a visitor chat and a private operator Command Center. Visitors can send text, images, and voice notes; messages are routed to the operator, whose replies are delivered live over Socket.IO.

## Architecture

- **Frontend:** Next.js 14, React, TypeScript (`frontend/`)
- **Backend:** Node.js, Express, Socket.IO, TypeScript (`backend/`)
- **Database, authentication, and file storage:** Supabase
- **Hosting:** Vercel for the frontend and Render for the backend

The browser connects to the backend for REST API requests and real-time Socket.IO events. Supabase stores conversations and attachments. The Supabase service-role key and admin JWT secret must remain on the backend.

## Repository layout

```text
.
├── frontend/                 # Next.js web app, deployed to Vercel
├── backend/                  # Express + Socket.IO server, deployed to Render
├── supabase/schema.sql       # Database tables, policies, and storage setup
├── DEPLOYMENT.md             # Deployment notes
└── docker-compose.yml        # Local/container setup
```

## Deploy the frontend and backend

Deploy the two app folders as separate services from this GitHub repository. Keep the existing Supabase project and database; do not create a replacement just for deployment.

### 1. Deploy the backend on Render

1. Open [Render](https://render.com/) and create a **Web Service** from this repository.
2. Select the `main` branch.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `npm install && npm run build`.
5. Set **Start Command** to `npm start`.
6. Add the environment variables listed below, using your own values from Supabase and a newly generated secret.
7. Deploy. Copy the public service URL from Render. The URL used for this project is `https://atharv-intelligence-backend.onrender.com` if that is still the URL shown in your Render dashboard.

Render environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Usually supplied by Render; the server defaults to `4000` locally |
| `SUPABASE_URL` | Project URL from Supabase project API settings |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role **secret** key; backend only |
| `ADMIN_JWT_SECRET` | A long, random secret generated for this app |
| `CORS_ORIGINS` | Exact deployed Vercel origin, e.g. `https://your-project.vercel.app`, with no trailing slash |
| `STORAGE_BUCKET` | `attachments` |

Do not put real secret values in this README, commit them to Git, or expose the service-role key in a `NEXT_PUBLIC_` variable. `CORS_ORIGINS` may be left blank only while the frontend URL is not known yet; set it to the real Vercel URL and redeploy the backend afterward.

### 2. Deploy the frontend on Vercel

1. Open [Vercel](https://vercel.com/) and import this repository.
2. Set **Root Directory** to `frontend`.
3. Use the **Next.js** framework preset. Vercel should detect the install and build commands automatically.
4. Add these environment variables for Production (and Preview if you want preview deployments to connect to the backend):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://atharv-intelligence-backend.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://atharv-intelligence-backend.onrender.com` |
| `NEXT_PUBLIC_UPLOAD_FOLDER` | `user` |

Replace the backend URL if Render shows a different service URL. Do not add a trailing slash. Deploy the frontend and copy its final public URL.

### 3. Connect the services

1. In Render, set `CORS_ORIGINS` to the exact Vercel origin, such as `https://your-project.vercel.app`.
2. Save the environment variable and trigger a new Render deploy.
3. In Vercel, confirm both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` point to the deployed Render service, then redeploy if you changed them.
4. Open the Vercel site and test a visitor chat and the operator login/Command Center.

The frontend and backend URLs serve different purposes: visitors open the Vercel URL, while browser API and Socket.IO connections use the Render URL. A successful frontend deployment does not by itself prove the backend is healthy, and vice versa.

## Local development

Prerequisites: a current Node.js LTS release and an existing Supabase project configured with the schema.

### 1. Configure Supabase

1. Open the Supabase SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql).
2. In Supabase Authentication, create the operator user.
3. Copy that user's UUID and add it to `public.admin_users` according to the schema and existing setup instructions.

### 2. Start the backend

```bash
cd backend
cp .env.example .env
```

Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_JWT_SECRET`. For local frontend access, set `CORS_ORIGINS=http://localhost:3000`. Then run:

```bash
npm install
npm run dev
```

The backend listens on port `4000` by default.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

The example frontend environment file points to `http://localhost:4000`. Open `http://localhost:3000` for the visitor chat and `http://localhost:3000/login` for the operator sign-in page.

## Troubleshooting deployments

- **Vercel build fails:** Check that the Vercel project's Root Directory is `frontend` and inspect the first build error. The frontend package scripts include `build` and `typecheck`.
- **Render build fails:** Check that the Render service Root Directory is `backend`, with build command `npm install && npm run build` and start command `npm start`. Confirm required environment variables are present; the backend exits during startup if required values are missing.
- **Site loads but chat cannot connect:** Verify both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` point to the Render URL, then redeploy Vercel after changing either value.
- **CORS or Socket.IO connection errors:** Set `CORS_ORIGINS` to the exact Vercel origin. Multiple allowed origins can be comma-separated.
- **Operator sign-in fails:** Verify the Supabase project URL and keys, `ADMIN_JWT_SECRET`, and that the operator account is configured in `public.admin_users`.
- **Uploads fail:** Verify the `attachments` storage bucket exists and that `STORAGE_BUCKET=attachments` is set on Render.
- **A deployment is marked failed:** Open that service's build/deploy logs and fix the first actual error. Updating documentation alone will not repair a failed build.

## Security

- Never commit `.env`, `.env.local`, service-role keys, JWT secrets, or real credentials.
- Treat `SUPABASE_SERVICE_ROLE_KEY` as a backend-only secret.
- Only expose values prefixed with `NEXT_PUBLIC_` when they are intentionally safe for the browser.
- Use a strong, unique `ADMIN_JWT_SECRET` in production and rotate it if it is exposed.
