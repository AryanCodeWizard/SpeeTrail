# SplitApp — Shared Expense Tracker

> Built for the Spreetail Software Engineering Internship Assignment.  
> A production-grade shared expense management application inspired by Splitwise.

---

## Live URLs

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://spee-trail-eight.vercel.app/login |
| **Backend API (Render)** | https://speetrail.onrender.com |
| **Database (Neon PostgreSQL)** | Managed — not publicly accessible |

> Replace the URLs above with your actual deployed URLs before submission.

---

## Demo Credentials

All users share the same password. Use any of these to log in immediately.

| Name | Email | Role | Period |
|------|-------|------|--------|
| Aisha | aisha@flatmates.com | Admin | Feb 2026 → present |
| Rohan | rohan@flatmates.com | Member | Feb 2026 → present |
| Priya | priya@flatmates.com | Member | Feb 2026 → present |
| Meera | meera@flatmates.com | Member | Feb 2026 → Mar 31 |
| Sam | sam@flatmates.com | Member | Apr 15 2026 → present |

**Password for all accounts:** `password123`

---

## What This App Does

SplitApp solves the real problem described in the assignment — four flatmates tracking shared expenses in a messy spreadsheet, with inconsistent formats, duplicate entries, a settlement logged as an expense, and no agreement on who owes whom.

### Every user request is satisfied

| User | Request | How it's handled |
|------|---------|-----------------|
| **Aisha** | "One number per person. Who pays whom, done." | Balances page shows simplified debt transactions using minimum-transactions algorithm |
| **Rohan** | "If the app says I owe ₹2,300, I want to see exactly which expenses make that up." | Click any balance to expand full expense-by-expense breakdown |
| **Priya** | "Half the trip was in dollars. The sheet pretends a dollar is a rupee." | USD amounts converted at fixed rate ₹83.5 per dollar. Original + converted amounts both stored. |
| **Sam** | "I moved in mid-April. Why would March electricity affect my balance?" | Membership date tracking with `joined_at`/`left_at`. March expenses automatically exclude Sam. |
| **Meera** | "Clean up the duplicates — but I want to approve anything the app deletes or changes." | 5-step import wizard shows every proposed change. Nothing is written until admin clicks Approve. |

---

## Feature List

### Authentication
- Register and login with email and password
- JWT-based authentication (7-day expiry)
- Passwords hashed with bcrypt (cost factor 10)

### Groups
- Create groups with a name
- Time-aware membership — `joined_at` and `left_at` tracked per member
- Admin role per group — admins can add/remove members and approve imports
- Membership history preserved (never deleted, soft-deactivated with `left_at`)
- Email invite system — invite by email, recipient gets a link, must accept to join
- Pending invite management — admin can cancel pending invites

### Expenses
- Create expenses with description, amount, currency, date, paid by
- **Four split types:**
  - **Equal** — divided equally among selected members
  - **Exact amounts** — specify each person's share in rupees
  - **Percentage** — specify each person's share as a percentage (must sum to 100%)
  - **Shares** — specify ratios (e.g. 2:1:1), amounts calculated proportionally
- Membership-date-aware — expenses automatically exclude members not active on the expense date
- Multi-currency — INR, USD, EUR, GBP supported. Converted to INR at fixed rates.
- Expense feed grouped by month
- Delete expense (admin or creator only)
- CSV export of all group expenses

### Balances
- Net balance per member (positive = owed money, negative = owes money)
- **Debt simplification** — minimum transactions algorithm converts complex debts into fewest possible payments
- Click any member to expand expense-by-expense breakdown (Rohan's requirement)
- Record a payment/settlement — immediately updates balances

### CSV Import
- Upload `expenses_export.csv` through the app — no manual CSV editing required
- **5-step import wizard:**
  1. Upload file
  2. Preview summary (clean / warning / error counts)
  3. Anomaly detail — every issue with explanation and proposed fix
  4. Admin approval — nothing written until this step
  5. Done — import report generated
- **20 distinct anomaly types detected** (assignment required minimum 12)
- Full audit trail — every CSV row logged with status, anomaly type, and action taken
- Re-importable — duplicate detection prevents double-importing
- Import session history — view all past imports and their reports

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React.js | Component-based UI, hooks for state |
| Styling | Tailwind CSS | Utility-first, no custom CSS files needed |
| Backend | Node.js + Express.js | Lightweight, fast, familiar |
| ORM | Prisma | Schema-as-code, type safety, migration management |
| Database | PostgreSQL (Neon) | Relational — required by assignment. Neon is serverless PostgreSQL. |
| Auth | JWT + bcrypt | Stateless auth, industry standard |
| Email | Nodemailer + Gmail | Invite emails for group membership |
| Frontend Deploy | Vercel | Zero-config React deployment |
| Backend Deploy | Render | Persistent Node.js server, free tier |
| AI Tool | Claude (Anthropic) | Primary development collaborator — see AI_USAGE.md |

---

## Project Structure

```
splitwise-app/
├── client/                          # React frontend
│   └── src/
│       ├── api/
│       │   └── axios.js             # Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.js       # Global auth state
│       ├── components/
│       │   ├── Sidebar.js           # Group list + navigation
│       │   ├── AddExpenseModal.js   # Splitwise-style expense creation
│       │   ├── ExpenseFeed.js       # Expense list grouped by month
│       │   ├── BalancePanel.js      # Net balances + debt simplification
│       │   ├── MemberPanel.js       # Member management + email invites
│       │   └── ImportWizard.js      # 5-step CSV import flow
│       └── pages/
│           ├── Login.js
│           ├── Register.js
│           ├── Home.js              # Main app — sidebar + tabbed content
│           └── AcceptInvite.js      # Invite acceptance page
│
├── server/                          # Express backend
│   ├── prisma/
│   │   └── schema.prisma            # Database schema (source of truth)
│   ├── src/
│   │   ├── index.js                 # Express app entry point
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js              # Register, login, /me
│   │   │   ├── groups.js            # Group CRUD + membership
│   │   │   ├── expenses.js          # Expense CRUD + splits
│   │   │   ├── settlements.js       # Record payments
│   │   │   ├── balances.js          # Balance calculation endpoints
│   │   │   ├── import.js            # CSV import workflow
│   │   │   ├── invites.js           # Email invite system
│   │   │   └── users.js             # User lookup by email
│   │   ├── services/
│   │   │   ├── balanceService.js    # All balance calculation logic
│   │   │   ├── debtSimplifier.js    # Minimum transactions algorithm
│   │   │   └── importService.js     # CSV parse + anomaly detection
│   │   └── utils/
│   │       ├── currencyConverter.js # Fixed rate FX conversion
│   │       ├── membershipUtils.js   # wasMemberOnDate() helper
│   │       └── mailer.js            # Nodemailer email sender
│   └── seed.js                      # Mock data seed script
│
├── docs/
│   ├── SCOPE.md                     # Anomaly log + database schema
│   ├── DECISIONS.md                 # Engineering decision log
│   ├── AI_USAGE.md                  # AI tool usage + errors caught
│   └── IMPORT_REPORT.md             # Full import report for expenses_export.csv
```

---

## Database Schema (overview)

```
users               — registered accounts
groups              — expense groups
group_memberships   — who belongs to which group, with joined_at / left_at
expenses            — individual expenses with currency + FX data
expense_splits      — one row per person per expense (share amount)
settlements         — payment records that reduce balances
import_sessions     — one per CSV import attempt (pending/approved/rejected)
import_rows         — one per CSV row, full anomaly audit trail
group_invites       — email invite tokens with expiry
```

Full schema with column types and design justifications: see `SCOPE.md`

---

## Local Setup

### Prerequisites

- Node.js 18 or higher
- A PostgreSQL database — sign up free at [neon.tech](https://neon.tech)
- A Gmail account with App Password enabled (for email invites)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/splitwise-app.git
cd splitwise-app
```

---

### Step 2 — Backend setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
DATABASE_URL="postgresql://username:password@host/dbname?sslmode=require"
JWT_SECRET="generate-a-random-32-char-string-here"
GMAIL_USER="yourapp@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
APP_URL="http://localhost:3000"
CLIENT_URL="http://localhost:3000"
PORT=4000
```

**Generate a JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Get Gmail App Password:**
1. Google Account → Security → Enable 2-Step Verification
2. Search "App passwords" → Generate for Mail
3. Copy the 16-character password

**Run database migrations:**
```bash
npx prisma migrate dev
```

**Seed mock data (all 5 users + all CSV expenses):**
```bash
node seed.js
```

**Start the backend:**
```bash
npm run dev
```

Backend runs at `http://localhost:4000`

---

### Step 3 — Frontend setup

```bash
cd ../client
npm install
```

Create `client/.env`:

```env
REACT_APP_API_URL=http://localhost:4000/api
```

**Start the frontend:**
```bash
npm start
```

Frontend runs at `http://localhost:3000`

---

### Step 4 — Verify it works

Open `http://localhost:3000` and log in with:
```
Email:    aisha@flatmates.com
Password: password123
```

You should see the Flat Expenses group with all seeded expenses loaded.

---

## Deployment

### Backend → Render

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. **Root directory:** `server`
4. **Build command:** `npm install && npx prisma generate`
5. **Start command:** `node src/index.js`
6. Add environment variables (same as `.env` above, with production values)
7. Deploy → copy the Render URL

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → connect repo
2. **Root directory:** `client`
3. **Framework preset:** Create React App
4. Add environment variable:
   - `REACT_APP_API_URL` = your Render URL + `/api`
5. Deploy → copy the Vercel URL
6. Go back to Render → update `CLIENT_URL` and `APP_URL` to your Vercel URL

### Database → Neon

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string → paste as `DATABASE_URL` in Render
4. Run migrations from Render shell: `npx prisma migrate deploy`
5. Run seed: `node seed.js`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | List my groups |
| GET | `/api/groups/:id` | Get group details |
| POST | `/api/groups/:id/members` | Add member |
| DELETE | `/api/groups/:id/members/:userId` | Remove member |
| PATCH | `/api/groups/:id/members/:userId/role` | Change role |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses/:groupId` | Create expense |
| GET | `/api/expenses/:groupId` | List expenses |
| GET | `/api/expenses/:groupId/:id` | Get single expense |
| PATCH | `/api/expenses/:groupId/:id` | Edit expense |
| DELETE | `/api/expenses/:groupId/:id` | Delete expense |

### Balances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/balances/:groupId` | Group balances + simplified transactions |
| GET | `/api/balances/:groupId/user/:userId` | Individual balance + breakdown |

### Settlements
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/settlements/:groupId` | Record a payment |
| GET | `/api/settlements/:groupId` | List settlements |

### Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import/:groupId/analyze` | Upload + analyze CSV (no DB write) |
| POST | `/api/import/:groupId/approve/:sessionId` | Approve and commit import |
| POST | `/api/import/:groupId/reject/:sessionId` | Reject import |
| GET | `/api/import/:groupId/sessions` | List import history |
| GET | `/api/import/:groupId/sessions/:sessionId/report` | Full import report |

### Invites
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invites/:groupId` | Send invite email |
| GET | `/api/invites/accept/:token` | Get invite details |
| POST | `/api/invites/accept/:token` | Accept invite |
| DELETE | `/api/invites/:groupId/:inviteId` | Cancel invite |
| GET | `/api/invites/:groupId/pending` | List pending invites |

---

## Running Tests

```bash
# Backend — manual API testing
cd server
npm run dev

# Test auth
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aisha@flatmates.com","password":"password123"}'

# Test balances (replace TOKEN and GROUP_ID)
curl http://localhost:4000/api/balances/GROUP_ID \
  -H "Authorization: Bearer TOKEN"
```

---

## AI Tool Used

**Claude by Anthropic** — used as the primary development collaborator throughout this project.

Claude was used as a senior engineering pair programmer, not a code generator. Every decision was made by me first, then implemented with Claude's help.

Full details including:
- Key prompts used
- How Claude was instructed
- Three concrete cases where Claude produced wrong output and how I caught and corrected it

See `AI_USAGE.md`

---

## Assignment Deliverables Checklist

| Deliverable | Status | Location |
|-------------|--------|----------|
| Public deployed app URL | ✅ | Top of this file |
| GitHub repository with meaningful commit history | ✅ | This repo |
| README.md with setup instructions and AI used | ✅ | This file |
| SCOPE.md — anomaly log + database schema | ✅ | `docs/SCOPE.md` |
| DECISIONS.md — decision log | ✅ | `docs/DECISIONS.md` |
| Import report | ✅ | `docs/IMPORT_REPORT.md` |
| AI_USAGE.md | ✅ | `docs/AI_USAGE.md` |

---

## Key Design Decisions

1. **Prisma ORM over raw SQL** — schema-as-code, type safety, faster to build in 10 hours
2. **JWT stateless auth** — no session table, works across separate frontend/backend deployments
3. **Soft-delete memberships** — `left_at` instead of deletion preserves audit trail
4. **Fixed FX rate** — reproducible imports, no external API dependency
5. **Minimum transactions algorithm** — O(n log n) debt simplification, fully explainable
6. **Preview before write** — nothing committed to DB until admin explicitly approves import
7. **Token-based email invites** — user consent required, email guard enforces correct account

Full justification for each: see `DECISIONS.md`

---

## Known Limitations

1. JWT tokens cannot be server-side invalidated on logout (client-side only)
2. Exchange rates are fixed — not live market rates
3. Re-importing requires file re-upload (no server-side file caching)
4. No real-time updates — page refresh required after settlements
5. PDF export not implemented — CSV export only
6. No recurring expense automation

These are deliberate tradeoffs documented in `DECISIONS.md`, not oversights.

---

## Commit History

The repository has a meaningful commit history reflecting the actual build sequence:

```
feat: initial project scaffold — React client, Express server, Prisma ORM
feat: prisma schema — users, groups, memberships, expenses, splits, settlements, import audit
feat: express app structure — routes, services, middleware folders
feat: auth — register, login, JWT middleware, /me endpoint
feat: groups — create, list, membership add/remove/role, date-aware membership utils
feat: balance service — membership-aware net calculation, debt simplification, expense breakdown
feat: csv importer — 12-check anomaly detection, preview workflow, approve/reject, audit trail
feat: expenses — CRUD, four split types, membership date validation, cascade delete
feat: settlements — record payments, list by group, integrated with balance service
feat: React frontend — login, register, dashboard, group detail, balances, import UI
feat: Splitwise-style UI — sidebar, expense feed, balance panel, member management, import wizard
feat: email invites — send invite link, accept flow, pending invite management, email guard
feat: Splitwise-style add expense modal — description, amount, paid by, split types, currency
chore: seed script — all 5 users, memberships with dates, 42 CSV rows with anomaly policies applied
docs: add README, SCOPE, DECISIONS, AI_USAGE, IMPORT_REPORT
```

---

*Built by [Your Name] for Spreetail Software Engineering Internship, June 2026*
