# DECISIONS.md — Engineering Decision Log

Every significant decision, options considered, chosen option, and reason.

---

## DECISION 01 — ORM: Prisma vs raw SQL

**Problem:** Need a DB access layer for PostgreSQL.

**Options:**
- Prisma ORM
- Raw SQL with node-postgres

**Chosen:** Prisma

**Why:**
- Schema-as-code: schema.prisma is a single source of truth
  for the entire DB structure.
- Type safety: Prisma generates types from schema,
  catching field name errors at dev time.
- Migration management: `prisma migrate dev` tracks
  every schema change with named migrations.
- Speed: 10-hour deadline made Prisma's query builder
  significantly faster to write than raw SQL.

**Tradeoff:**
- Prisma adds an abstraction layer. For the live interview,
  I must be able to explain what SQL each Prisma operation
  generates (e.g. `findMany` with `where` = SELECT with WHERE clause).
- Raw SQL would be more transparent but slower to write.

**Interview justification:** Prisma is industry standard
for Node.js/PostgreSQL. The schema file serves as
living documentation of the database structure.

---

## DECISION 02 — JWT: stateless vs session-based auth

**Problem:** Need to authenticate API requests.

**Options:**
- JWT (stateless)
- Server-side sessions with database

**Chosen:** JWT

**Why:**
- Stateless: no session table needed, no DB call per request.
- Works naturally with separate frontend/backend deployment
  (Vercel + Render).
- Standard for REST APIs.

**Tradeoff:**
- Cannot invalidate individual tokens without a blocklist.
- If a token is stolen, it works until expiry (7 days).
- Mitigation: short enough expiry, HTTPS only.

**Known limitation:** Token invalidation on logout is
client-side only (remove from localStorage).
Documented here so evaluators know it's a deliberate tradeoff,
not an oversight.

---

## DECISION 03 — Membership timeline: soft delete with joined_at/left_at

**Problem:** Sam joined mid-April. Meera left end of March.
Expenses should only affect members who were active on
the expense date.

**Options:**
A. Track join/leave dates, filter per expense date
B. Admin manually selects participants for every expense
C. Simple boolean active/inactive flag

**Chosen:** A — date-range membership tracking

**Why:**
- Correct by default. Sam is automatically excluded from
  March expenses without any manual work.
- Audit trail: full membership history preserved,
  never deleted.
- A single SQL range check answers "was this person
  a member on this date?":
  `joinedAt <= date AND (leftAt IS NULL OR leftAt > date)`

**Schema:** `group_memberships.joined_at` and `group_memberships.left_at`
Multiple rows per user if they re-join — each row = one period.

---

## DECISION 04 — Currency conversion: fixed rate vs live API

**Problem:** Priya's complaint — the CSV treats USD amounts
as INR. Must convert correctly.

**Options:**
A. Fixed rate hardcoded at import time (documented)
B. Live exchange rate API (e.g. openexchangerates.org)

**Chosen:** A — fixed rate

**Why:**
- Reproducibility: the same CSV imported twice always
  produces the same INR amounts. Live rates would not.
- No external dependency: live API adds a network failure
  mode to the import flow.
- Honest documentation: the rate source is documented here,
  making the conversion auditable.

**Rate used:** 1 USD = ₹83.5 (RBI reference rate, March 2026)
**Stored in:** `expenses.fx_rate` per expense, `expenses.currency`,
`expenses.amount_original`

**Interview justification:** A fixed, documented rate is
more honest than a live rate that varies by second.
The assignment explicitly asks us to document this decision.

---

## DECISION 05 — Debt simplification: minimum transactions algorithm

**Problem:** Aisha wants "one number per person. Who pays whom, done."
Raw net balances show who owes what but not the minimum payments.

**Options:**
A. Minimum transactions (greedy sort + pair creditors/debtors)
B. Show raw net balances only
C. Pairwise debts (A owes B, B owes C separately)

**Chosen:** A — minimum transactions

**Why:**
- Fewer payments = less friction = better UX.
- Standard Splitwise behaviour.
- Algorithm is O(n log n), explainable in an interview.

**Algorithm:**
1. Separate into creditors (net > 0) and debtors (net < 0)
2. Sort both by absolute value descending
3. Pair largest creditor with largest debtor
4. Payment = min(creditor amount, debtor amount)
5. Advance pointer for whichever side reaches zero
6. Repeat until all balanced

**Rounding:** Applied once at final output, not on intermediates.
Prevents paisa-level errors accumulating across many expenses.

---

## DECISION 06 — Import policy: duplicate detection

**Problem:** The CSV contains exact and near-exact duplicates.

**Options:**
A. Exact match only (same date + description + amount + payer)
B. Fuzzy match (same date + same participants + description word overlap)
C. Skip all duplicates silently

**Chosen:** B — fuzzy match for conflicting duplicates,
exact match for database duplicates

**Why:**
- "Dinner at Thalassa" and "Thalassa dinner" are the same event
  but exact match would miss them.
- Word overlap check on description + same date + same participants
  catches the Thalassa case correctly.
- Never silent — all detected duplicates shown in preview.

**Conflict resolution policy:**
When two rows represent the same event with different amounts/payers:
- Both shown in preview
- Keep the row with an explanatory note (Row 25 over Row 24)
- If no note: keep higher amount (less likely to be undercount)
- Admin must approve before any write

---

## DECISION 07 — Import approval: preview before write

**Problem:** Meera wants to approve anything the app deletes or changes.

**Options:**
A. Preview all proposed changes, write only on explicit approval
B. Import everything, allow undo afterward
C. Separate "review" tab showing anomalies after import

**Chosen:** A — nothing written until approval

**Why:**
- Consistent with the assignment requirement:
  "Surface it to the user, handle according to documented policy."
- A crashed import and a silent guess are both failing answers.
  Explicit approval is the correct answer.
- ImportSession.status = 'pending_review' until admin clicks Approve.
  All writes happen in a single DB transaction on approval.

---

## DECISION 08 — Settlement recording

**Problem:** Need to reduce balances when someone pays another person.

**Options:**
A. Dedicated settlements table, affects balance calculation
B. Special expense with isSettlement=true flag
C. Notes only, no balance effect

**Chosen:** A — dedicated settlements table

**Why:**
- Clean separation: expenses and settlements are different things.
- Balance calculation filters `isSettlement=false` on expenses,
  then separately adds settlement amounts.
- The CSV anomaly (Row 14: "Rohan paid Aisha back") is imported
  into the settlements table, not the expenses table.

---

## DECISION 09 — Email invites: token-based

**Problem:** How should members be added to groups?

**Options:**
A. Admin adds directly by email (no consent)
B. Admin sends invite link, user must accept
C. Admin adds by name (no email)

**Chosen:** B — token-based invite email

**Why:**
- User consent: adding someone without their knowledge
  is a privacy violation.
- Token is 32 random bytes (256-bit entropy) — cannot be guessed.
- Email guard: token acceptance checks that the accepting
  user's email matches the invite email.
- 7-day expiry: standard industry practice.

---

## DECISION 10 — Rounding rule for equal splits

**Problem:** ₹100 split 3 ways = ₹33.333... Must round somewhere.

**Options:**
A. Give remainder to first participant (payer)
B. Distribute remainder randomly
C. Round each share independently (causes sum mismatch)

**Chosen:** A — give remainder to first participant

**Why:**
- Deterministic: same expense always produces same splits.
- Convention: giving the remainder to the payer is standard.
- Magnitude: remainder is always < 1 paisa × number of participants,
  typically 1-2 paise total.
- Easy to change: `buildSplits()` in one place,
  one line to modify the rounding rule.

**Location in code:** `server/src/routes/expenses.js` → `buildSplits()`