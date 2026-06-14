# AI_USAGE.md — AI Tool Usage Log

## Tool Used

**Claude (Anthropic)** — claude.ai
Used as primary development collaborator throughout the project.

---

## How I Used It

I used Claude as a senior engineer pairing partner, not as a
code generator. My process:

1. Explained architectural decisions before asking for code
2. Asked Claude to explain every function before generating it
3. Read every line of generated code before using it
4. Caught and corrected errors (documented below)
5. Made all product decisions myself — Claude implemented them

Claude was explicitly instructed NOT to make assumptions about:
- Which anomalies exist in the CSV
- What the import policies should be
- How balances should be calculated
- What the debt simplification algorithm should do

All of these decisions were made by me and then implemented.

---

## Key Prompts Used

### Prompt 1 — Architecture analysis
> "Analyze this assignment deeply. Identify all hidden requirements,
> evaluation risks, and interview traps before suggesting any
> implementation."

**Purpose:** Force Claude to think before coding.
**Outcome:** Identified 8 hidden requirements including
Meera's approval workflow, Sam's membership date issue,
and the Rohan drill-down requirement.

### Prompt 2 — Schema design
> "Design a relational schema for these exact decisions:
> [listed all 10 decisions]. Explain every table before generating it."

**Purpose:** Schema as a product decision, not a technical afterthought.
**Outcome:** The group_memberships joined_at/left_at design
came from this discussion.

### Prompt 3 — Balance algorithm
> "Implement the balance calculation. It must be membership-date-aware.
> Show me a hand-verifiable example with Sam, Aisha, and Meera
> before writing any code."

**Purpose:** Force verification of the algorithm before implementation.
**Outcome:** Caught that N+1 queries would occur if membership
was checked per-expense with a DB call. Fixed to load memberships
once and check in memory.

### Prompt 4 — Import service
> "Build the anomaly detector. Each check must be a named function.
> Do not guess what anomalies exist — I will provide the CSV separately."

**Purpose:** Keep detection logic modular and traceable.
**Outcome:** 12 named checks, each independently testable.

### Prompt 5 — CSV analysis
> "Here is the actual CSV. Analyze every single row systematically.
> Tell me every anomaly with the exact row number, data, and
> recommended policy. Do not skip any row."

**Purpose:** Ground-truth anomaly detection from real data.
**Outcome:** 22 distinct anomalies across 42 rows documented.

---

## Case 1: AI Generated Wrong Balance Logic

**What Claude generated:**
```js
// Claude's first version
const balance = await prisma.expense.aggregate({
  where: { groupId, paidBy: userId },
  _sum: { amountInr: true }
})
```

**What was wrong:**
This calculated total paid but ignored expense splits — it didn't
subtract what the user owes on other people's expenses.
A user who paid ₹1000 and owes ₹900 in splits would show +₹1000
instead of +₹100.

**How I caught it:**
Hand-verified with the Aisha/Sam example from the interview prep.
The numbers didn't match my manual calculation.

**What I changed:**
Rewrote the balance service to:
1. Load all expenses with splits included
2. For each expense: credit the payer, debit each split owner
3. Process settlements separately
4. Round once at the end

The corrected version is in `server/src/services/balanceService.js`.

---

## Case 2: AI Missed the Thalassa Duplicate

**What Claude generated:**
The first version of `checkDuplicate()` used exact description matching:
```js
e.description.toLowerCase() === desc
```

**What was wrong:**
"Dinner at Thalassa" and "Thalassa dinner" are not exact matches.
The duplicate would have been missed and both rows imported,
double-counting ₹4850 in group expenses.

**How I caught it:**
When I analyzed the CSV manually (Row 24 vs Row 25),
I noticed the descriptions differed but the notes said
"Aisha also logged this I think hers is wrong."

**What I changed:**
Added fuzzy duplicate detection using word overlap:
```js
const words      = desc.split(/\s+/).filter(w => w.length > 4)
const otherWords = otherDesc.split(/\s+/)
const overlap    = words.some(w => otherWords.includes(w))
```
Combined with same date + same participants check.
This correctly flags the Thalassa pair as conflicting duplicates.

---

## Case 3: AI Did Not Handle "Mar-14" Date Format

**What Claude generated:**
The first `parseDate()` function handled these formats:
- `YYYY-MM-DD`
- `DD/MM/YYYY`
- `DD-MM-YYYY`
- `D MMM YYYY`

**What was wrong:**
Row 27 has `date="Mar-14"` — a month-abbreviation + day format
with no year. Claude's parser returned null for this,
which would have caused Row 27 to be skipped with INVALID_DATE_FORMAT.

**How I caught it:**
Running the CSV through the analyzer and seeing Row 27 flagged
as an error when contextually the date is clearly 14 March 2026
(it sits between rows dated 12-03-2026 and 15-03-2026).

**What I changed:**
Added a specific pattern to `parseDate()`:
```js
const monDd = str.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{1,2})$/i)
if (monDd) {
  const d = new Date(`${monDd[1]} ${monDd[2]} 2026`)
  if (!isNaN(d.getTime())) return d
}
```
Year inferred as 2026 from import context.
Flagged as warning (INFERRED_DATE_YEAR) not error.

---

## Known Limitations

1. JWT tokens cannot be server-side invalidated on logout
2. USD/EUR/GBP rates are fixed — not live
3. Re-importing requires file re-upload (no server-side file storage)
4. No real-time balance updates — requires page refresh after settlement
5. PDF export not implemented — CSV only
6. No recurring expense automation