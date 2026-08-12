# Atharv Intelligence

A sleek, "Wizard of Oz" style AI companion platform. Visitors chat with what looks like
an AI reasoning interface — sending text, images, and voice notes — while all traffic is
routed in real time to a hidden **Command Center**, where an operator (Atharv) replies.
The reply is piped straight back to the visitor as if the "AI" answered.

Stack: **Next.js 14** (frontend) + **Node.js/Express + Socket.io** (backend) + **Supabase**
(Postgres, Auth, Storage). Fully managed infrastructure — nothing to self-host.

```
myproject/
├─ frontend/            Next.js app
│  ├─ app/page.tsx      → /       visitor chat
│  ├─ app/admin/        → /admin  Command Center
│  ├─ app/login/        → /login  operator sign-in
│  └─ components/       chat UI, admin UI, shared bits
├─ backend/             Express + Socket.io
│  ├─ src/index.ts      server bootstrap
│  ├─ src/sockets.ts    real-time routing (user:send, admin:reply, typing)
│  └─ src/routes.ts     REST: sign-in, history, uploads, admin APIs
└─ supabase/schema.sql  tables + RLS + storage bucket + admin setup
```

## How it works

1. A visitor opens the site. The browser generates an anonymous `visitor_id`
   (persisted in `localStorage`) and opens a WebSocket.
2. Text / image / voice is sent over the socket, persisted to Supabase, and pushed
   instantly to every connected Command Center tab.
3. The operator picks the conversation from the queue, replies (text / image / voice),
   and the reply is delivered over the socket to that specific visitor — showing
   "Atharv Intelligence is processing…" or live typing dots along the way.
4. Media uploads go straight from the browser to Supabase Storage via short-lived
   signed URLs issued by the backend.

### Socket protocol

| Event | Direction | Payload | Notes |
| --- | --- | --- | --- |
| `user:send` | visitor → server | `{ kind, content?, mediaUrl?, mimeType? }` | rate-limited (6 / 10s) |
| `user:ack` | server → visitor | `{ message }` | persisted message |
| `user:message` | server → visitor | `{ message }` | operator reply delivered |
| `user:typing` | server → visitor | `{ isTyping }` | operator is composing |
| `admin:newMessage` | server → admin | `{ conversation, message }` | new queue item / unread |
| `admin:update` | server → admin | `{ conversation?, message?, closed? }` | refresh other admin tabs |
| `admin:typing` | server → admin | `{ conversationId, isTyping }` | visitor is composing |
| `admin:reply` | admin → server | `{ conversationId, kind, ... }` | send a reply |
| `admin:close` | admin → server | `{ conversationId }` | mark conversation closed |
| `typing` | both → server | `{ conversationId?, isTyping }` | typed-indicator relay |

Admin sockets authenticate with a JWT issued by `POST /api/admin/sign-in`;
visitor sockets authenticate by carrying their `visitorId`.

## Local development

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. In **Authentication → Users → Add user**, create the operator account
   (e.g. `atharv@atharvintelligence.com`).
4. Copy the new user's UUID and run:
   ```sql
   insert into public.admin_users (id, display_name)
   values ('<user-uuid>', 'Atharv');
   ```

### 2. Backend

```bash
cd backend
cp .env.example .env      # fill in Supabase URL + service role key + JWT secret
npm install
npm run dev               # http://localhost:4000
```

Generate the JWT secret with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # defaults already point at localhost:4000
npm install
npm run dev               # http://localhost:3000
```

Open `http://localhost:3000` in one tab (visitor) and `http://localhost:3000/login`
in another (operator). Messages flow between them instantly.

## Env vars

| Backend (`backend/.env`) | Purpose |
| --- | --- |
| `PORT` | HTTP/WS port (default 4000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server secret, never exposed** |
| `ADMIN_JWT_SECRET` | Secret used to sign operator session JWTs |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |
| `STORAGE_BUCKET` | Storage bucket name (default `attachments`) |

| Frontend (`frontend/.env.local`) | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend base URL (REST) |
| `NEXT_PUBLIC_SOCKET_URL` | Backend socket URL (WebSocket) |
| `NEXT_PUBLIC_UPLOAD_FOLDER` | Storage folder for visitor uploads (default `user`) |

## Security notes

- Visitors never talk to the database; every write goes through the backend's
  service role client. RLS restricts tables to `admin_users` members.
- The service role key lives only on the backend; the browser only ever sees
  signed upload URLs and public read URLs.
- Attachment bucket is public-read for simple `<img>`/`<audio>` playback. If you
  need private attachments, flip the bucket to private and return signed read URLs
  from a backend route instead.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full production setup:
Vercel + Railway, custom domain (`atharvintelligence.com`), and SSL.
