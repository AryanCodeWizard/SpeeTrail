# SplitApp — Shared Expense Tracker

A Splitwise-inspired expense sharing application built for the Spreetail internship assignment.

## Live URLs

- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-api.onrender.com

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Tailwind CSS |
| Backend | Node.js, Express.js |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Auth | JWT + bcrypt |
| Email | Nodemailer + Gmail |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

## Features

- JWT authentication with register and login
- Group creation and management
- Time-aware membership (joined_at / left_at)
- Email invite system with token-based acceptance
- Four split types: equal, percentage, exact, shares
- Membership-date-aware balance calculation
- Minimum-transactions debt simplification
- CSV import with 12-check anomaly detection
- 5-step import wizard with approval workflow
- Full import audit trail per row
- CSV export of group expenses
- Settlement recording with balance update

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon account)
- Gmail account with App Password enabled

### Backend

```bash
cd server
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, APP_URL
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd client
npm install
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:4000/api
npm start
```

## Environment Variables

### Backend (`server/.env`)

DATABASE_URL=postgresql://...

JWT_SECRET=minimum-32-character-random-string

GMAIL_USER=yourapp@gmail.com

GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

APP_URL=https://your-frontend.vercel.app

PORT=4000

CLIENT_URL=https://your-frontend.vercel.app

### Frontend (`client/.env`)

## AI Tool Used

Claude (Anthropic) — used as primary development collaborator.
See AI_USAGE.md for full details.