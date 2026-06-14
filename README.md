# SplitApp — Shared Expense Tracker

A Splitwise-inspired expense sharing application built for the Spreetail internship assignment.

## Live URLs

- **Frontend:** https://your-frontend.vercel.app
- **Backend:** https://your-backend.onrender.com

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| ORM | Prisma (v7) |
| Database | PostgreSQL (Neon or other) |
| Auth | JWT + bcrypt |
| Email | Nodemailer |
| Frontend Deploy | Vercel |
| Backend Deploy | Render (recommended) |

## Features

- JWT authentication (register / login)
- Group creation and management
- Time-aware membership windows (joined_at / left_at)
- Email invites with token acceptance
- Split types: equal, percentage, exact, shares
- Membership-date-aware balance calculation
- Debt simplification to minimum transactions
- CSV import with anomaly detection and approval workflow
- Import audit trail and session history
- Settlement recording with balance updates

## Local Setup

### Prerequisites

- Node.js 18+
- Git
- PostgreSQL (local) or hosted (Neon/Postgres)

### Backend (development)

```bash
cd my-project/server
npm ci
cp .env.example .env   # create and edit .env with real values
# set DATABASE_URL, JWT_SECRET, CLIENT_URL, GMAIL_USER, GMAIL_APP_PASSWORD
npx prisma migrate dev --schema=./prisma/schema.prisma
npm run dev
```

Notes:
- `npm run build` runs `prisma generate` (used in CI/deploy). For production, run `npx prisma migrate deploy`.
- The server listens on `PORT` (default 4000) and exposes `/health` for health checks.

### Frontend (development)

```bash
cd my-project/frontend
npm ci
# create .env or .env.local, set VITE_API_URL (e.g. http://localhost:4000 or production origin)
npm run dev
```

Build for production:

```bash
cd my-project/frontend
npm run build
```

## Environment Variables

### Backend (`my-project/server/.env`)

- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — Secret for signing JWTs (use a long random string)
- `CLIENT_URL` — Frontend origin (for CORS and emails)
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — for sending emails (if used)
- `PORT` — optional; default 4000

Example `.env` (do NOT commit):

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-very-long-secret
CLIENT_URL=http://localhost:5173
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=app-password
```

### Frontend (`my-project/frontend/.env`)

- `VITE_API_URL` — backend origin (DO NOT include sensitive secrets). Example:

```
VITE_API_URL=http://localhost:4000
```

In production on Vercel set `VITE_API_URL=https://your-backend.onrender.com/api` (or the origin; client code appends `/api`).

## Deployment Notes

- Backend: Render is recommended for the Express + Prisma server. Set service root to `my-project/server`, Build: `npm ci && npm run build`, Start: `npm start`. Add env vars in Render (DATABASE_URL, JWT_SECRET, CLIENT_URL, etc.). Run `npx prisma migrate deploy` after provisioning DB.
- Frontend: Deploy `my-project/frontend` to Vercel. Set `VITE_API_URL` environment variable in Vercel (Production & Preview). Add `vercel.json` rewrite to serve SPA routes if necessary.

## Troubleshooting

- If you see `SyntaxError: The requested module '@prisma/client' does not provide an export named 'PrismaClient'` during deploy, ensure `prisma generate` runs in build and the server uses the generated client. This project uses a `postinstall` + `build` script to run `prisma generate`.
- For Prisma runtime errors, check that `@prisma/adapter-pg` is installed and `DATABASE_URL` is correct.
- Check `/health` endpoint to confirm server health.

## AI Tool Used

- GPT-5 mini (GitHub Copilot): assisted with code edits, debugging, and deployment guidance. See `AI_USAGE.md` for more details on how the AI was used during development.

## Useful Files

- `my-project/server/src/config/prisma.js` — centralized Prisma client
- `my-project/server/prisma/schema.prisma` — Prisma schema and models
- `my-project/frontend/src/api/axios.js` — client API wrapper using `VITE_API_URL`
- `AI_USAGE.md` — details on AI assistance and prompts
- `DECISIONS.md` — project design decisions and tradeoffs
