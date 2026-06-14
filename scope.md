# SCOPE.md — Anomaly Log and Database Schema

## CSV File Analyzed

File: expenses_export.csv
Total rows: 42
Clean rows: 22
Rows with warnings (imported with flag): 11
Rows with errors (skipped): 9
Distinct anomaly types detected: 20

---

## Anomaly Log

Every data problem found in expenses_export.csv, the detection logic,
the handling policy, and the user-facing behavior.

---

### ANOMALY 01 — Row 5: Unknown payer (Dev)

**Detection:** `findMember('Dev', knownMembers)` returns null.
Case-insensitive name lookup against GroupMembership finds no match.

**Data:** `paid_by="Dev"`, amount=3200, date=08-02-2026,
description="Dinner at Marina Bites"

**Problem:** Dev is a visiting guest, not a registered user.
Cannot assign a payment to an unregistered person.

**Policy:** SKIP — error severity.

**User-facing:** "Payer 'Dev' is not a known member of this group.
This row will be skipped."

---

### ANOMALY 02 — Row 6: Duplicate + unknown payer

**Detection:** Same date (08-02-2026), same amount (3200),
same payer (Dev), description "dinner - marina bites" matches
Row 5 "Dinner at Marina Bites" via word overlap check.

**Data:** `paid_by="Dev"`, amount=3200, description="dinner - marina bites"

**Problem:** Exact duplicate of Row 5. Dev is also unknown.
Two separate anomalies on the same row.

**Policy:** SKIP — error severity (both UNKNOWN_PAYER and DUPLICATE_EXPENSE).

**User-facing:** "Duplicate of Row 5. Payer 'Dev' is unknown.
Row skipped."

---

### ANOMALY 03 — Row 7: Comma in amount field

**Detection:** `parseFloat("1,200")` returns NaN.
After stripping commas: `parseFloat("1200")` = 1200. Valid.

**Data:** `amount="1,200"` — thousand separator comma

**Problem:** Raw CSV value not directly parseable as float.

**Policy:** CLEAN — strip commas, parse as 1200. Warning severity.

**User-facing:** "Amount '1,200' contained a comma separator.
Parsed as ₹1200."

---

### ANOMALY 04 — Row 9: Lowercase payer name

**Detection:** Case-insensitive lookup:
`'priya'.toLowerCase() === 'Priya'.toLowerCase()` → match found.

**Data:** `paid_by="priya"`

**Problem:** Name casing inconsistency.

**Policy:** CLEAN — normalize via case-insensitive lookup. Info severity.

**User-facing:** "Payer 'priya' matched to registered member 'Priya'."

---

### ANOMALY 05 — Row 10: Three decimal places

**Detection:** `parseFloat("899.995")` = 899.995.
`(899.995).toFixed(2)` = "900.00". Precision loss detected.

**Data:** `amount="899.995"`

**Problem:** INR supports 2 decimal places maximum.

**Policy:** CLEAN — round to 2dp (900.00). Warning severity.

**User-facing:** "Amount 899.995 rounded to ₹900.00 (INR supports 2dp)."

---

### ANOMALY 06 — Row 11: Ambiguous payer "Priya S"

**Detection:** `findMember('Priya S', knownMembers)` returns null.
No member has this exact name. Fuzzy match not applied
— silently resolving "Priya S" to "Priya" would be a silent guess.

**Data:** `paid_by="Priya S"`

**Problem:** Cannot safely assume "Priya S" means "Priya".

**Policy:** SKIP — error severity.

**User-facing:** "Payer 'Priya S' not found. Did you mean 'Priya'?
Please correct the CSV or add this expense manually."

---

### ANOMALY 07 — Row 13: Missing payer

**Detection:** `paid_by === ""` — empty string after trim.

**Data:** `paid_by=""`, note="can't remember who paid"

**Problem:** Cannot create an expense without a payer.

**Policy:** SKIP — error severity.

**User-facing:** "No payer recorded for 'House cleaning supplies'.
This row must be added manually."

---

### ANOMALY 08 — Row 14: Settlement recorded as expense

**Detection:** Description "Rohan paid Aisha back" matches
settlement keywords: ["paid back", "settlement", "reimburse", ...].
split_type is empty.

**Data:** description="Rohan paid Aisha back", split_type="",
note="this is a settlement not an expense??"

**Problem:** This is a debt repayment, not a shared expense.
If imported as expense it would double-count Rohan's liability.

**Policy:** Import as Settlement record
(paidBy=Rohan, paidTo=Aisha, amount=5000).
Excluded from expense splits. Warning severity.

**User-facing:** "'Rohan paid Aisha back' detected as settlement.
Imported as payment record, not shared expense."

---

### ANOMALY 09 — Row 15: Percentages sum to 110%

**Detection:** Parse split_details:
Aisha 30% + Rohan 30% + Priya 30% + Meera 20% = 110%.
`Math.abs(110 - 100) > 0.01` → true.

**Data:** split_details="Aisha 30%; Rohan 30%; Priya 30%; Meera 20%",
note="percentages might be off"

**Problem:** 110% would assign ₹1584 on a ₹1440 expense.
Cannot redistribute the 10% overage without user decision.

**Policy:** SKIP — error severity.

**User-facing:** "Percentages sum to 110%, not 100%. Cannot import.
Please correct and re-import this row."

---

### ANOMALY 10 — Row 20: Unknown payer + USD amount

**Detection:** `findMember('Dev', knownMembers)` = null (UNKNOWN_PAYER).
`currency="USD"` (CURRENCY_CONVERSION_APPLIED).

**Data:** paid_by="Dev", amount=540, currency=USD,
description="Goa villa booking"

**Problem:** Dev is unregistered. Two anomalies on one row.

**Policy:** SKIP — error severity (unknown payer).
USD conversion moot. Both issues surfaced in report.

**User-facing:** "Payer 'Dev' is unknown. Row skipped.
(Also: USD amount would need conversion at 83.5.)"

---

### ANOMALY 11 — Row 21: USD amount, valid payer

**Detection:** `currency="USD"`. convertToInr(84, 'USD') called.
Rate 83.5 applied. amountInr = 7014. Warning severity.

**Data:** paid_by="Rohan", amount=84, currency=USD

**Problem:** Sheet previously treated 1 USD = 1 INR (Priya's complaint).
Must convert to INR at documented rate.

**Policy:** CLEAN with warning — convert at fixed rate 83.5.
Store: amountOriginal=84, currency=USD, amountInr=7014, fxRate=83.5.

**User-facing:** "USD 84 converted to ₹7,014 at rate 83.5 (RBI reference,
documented in DECISIONS.md)."

---

### ANOMALY 12 — Rows 20, 23: Dev pays USD expenses

**Detection:** paid_by="Dev" → UNKNOWN_PAYER.
Row 23 additionally has "Dev's friend Kabir" in split_with
→ UNKNOWN_PARTICIPANT. amount=150 USD → CURRENCY_CONVERSION.

**Data:** Row 23: paid_by="Dev", amount=150, currency=USD,
split_with includes "Dev's friend Kabir",
note="Kabir joined for the day"

**Policy:** SKIP both — error severity (unknown payer).

**User-facing:** "Payer 'Dev' unknown. Participant 'Dev's friend Kabir'
unknown. Row skipped."

---

### ANOMALY 13 — Rows 24 & 25: Conflicting duplicate (Thalassa dinner)

**Detection:** Same date (11-03-2026), same split_with
(Aisha;Rohan;Priya;Dev), description word overlap
("thalassa" appears in both). Different payers and amounts.

**Data:**
- Row 24: "Dinner at Thalassa", Aisha, ₹2400
- Row 25: "Thalassa dinner", Rohan, ₹2450,
  note="Aisha also logged this I think hers is wrong"

**Problem:** Two people logged the same dinner.
Different payer, different amount. Cannot keep both.

**Policy:** Skip Row 24, import Row 25.
Reason: Row 25 has an explicit note identifying Row 24 as wrong.
Row 25 has the higher amount (less likely to be undercount).
Both rows shown in preview for admin approval.

**User-facing:** "Rows 24 and 25 appear to be the same dinner (Thalassa,
11-03-2026). Row 25 kept per note on Row 25. Row 24 skipped."

---

### ANOMALY 14 — Row 26: Negative amount (refund)

**Detection:** `parseFloat("-30")` = -30. `amount < 0` check fires.
Description contains "refund" → intentional, not data error.

**Data:** amount=-30, currency=USD, description="Parasailing refund",
note="one slot got cancelled"

**Problem:** Negative amount — policy decision required.

**Policy:** Import as refund. amountInr = -(30 × 83.5) = -₹2,505.
Reduces what participants owe. Warning severity.

**Note:** Dev is the payer on this row. Dev is unregistered.
Therefore this row is also SKIPPED due to UNKNOWN_PAYER.
Both anomalies surfaced.

**User-facing:** "Negative amount detected — treated as refund.
However payer 'Dev' is unknown. Row skipped."

---

### ANOMALY 15 — Row 27: Non-standard date + trailing whitespace payer

**Detection:**
- `parseDate("Mar-14")` — no standard format matches.
  Custom pattern added: `/^(Jan|Feb|...)−(\d{1,2})$/i` → 2026-03-14.
- `paid_by="rohan "` — `.trim()` → "rohan" → case-insensitive → "Rohan".

**Data:** date="Mar-14", paid_by="rohan " (trailing space)

**Policy:** CLEAN with warning — infer 2026-03-14 from context
(surrounding rows are mid-March 2026). Trim and normalize payer.

**User-facing:** "'Mar-14' interpreted as 2026-03-14.
Payer 'rohan ' trimmed to 'Rohan'."

---

### ANOMALY 16 — Row 28: Missing currency

**Detection:** `currency === ""` after trim.

**Data:** currency="", note="forgot to set currency"

**Policy:** CLEAN with warning — default to INR.
All other flat household expenses in this CSV are INR.
Assumption documented in import report.

**User-facing:** "No currency specified. Defaulted to INR."

---

### ANOMALY 17 — Row 31: Zero amount

**Detection:** `parseFloat("0")` = 0. `amount === 0` check fires.

**Data:** amount=0, note="counted twice earlier - fixing later"

**Policy:** SKIP — zero amount has no effect on balances.

**User-facing:** "'Dinner order Swiggy' has zero amount. Skipped."

---

### ANOMALY 18 — Row 34: Ambiguous date (April 5 vs May 4)

**Detection:** date="04-05-2026". In DD-MM-YYYY = May 4.
In MM-DD-YYYY = April 5. Note explicitly raises this ambiguity.
Critical: Sam joins mid-April. Date affects whether Sam should split.

**Data:** date="04-05-2026", note="is this April 5 or May 4?
format is a mess"

**Policy:** SKIP — error severity.
Cannot resolve without user input. Both interpretations shown.

**User-facing:** "'04-05-2026' is ambiguous (April 5 or May 4).
Please clarify and add this expense manually."

---

### ANOMALY 19 — Row 36: Meera in split after leaving

**Detection:** `wasMemberOnDate(groupId, meeraId, 2026-04-02)` = false.
Meera's leftAt = 2026-03-31. April 2 > March 31.

**Data:** date=02-04-2026, split_with includes "Meera",
note="oops Meera still in the group list"

**Policy:** CLEAN with warning — remove Meera from split.
Redistribute equally among Aisha, Rohan, Priya.

**User-facing:** "Meera was not a member on 02-04-2026 (left 31-03-2026).
Removed from split. Cost redistributed among 3 remaining members."

---

### ANOMALY 20 — Row 38: Sam deposit as expense

**Detection:** Description "Sam deposit share" + split_with only "Aisha"
+ note "Sam moving in! paid Aisha his deposit" →
settlement keyword "deposit" detected.

**Data:** paid_by="Sam", amount=15000, split_with="Aisha"

**Policy:** Import as Settlement (paidBy=Sam, paidTo=Aisha, amount=15000).
Not a shared group expense. Warning severity.

**User-facing:** "'Sam deposit share' detected as a deposit payment.
Imported as settlement from Sam to Aisha."

---

### ANOMALY 21 — Row 39: Sam included before confirmed join date

**Detection:** split_with includes "Sam", date=10-04-2026.
Sam's note says "mid-April". joinedAt set by admin during onboarding.
`wasMemberOnDate()` called at commit time.

**Policy:** FLAG — if Sam's joinedAt > 2026-04-10, remove Sam from split
at commit time. Surface to admin.

---

### ANOMALY 22 — Row 42: Split type contradicts split details

**Detection:** split_type="equal" but split_details="Aisha 1; Rohan 1;
Priya 1; Sam 1". Note: "split_type says equal but someone added shares."

**Data:** equal split with 1:1:1:1 share details.

**Policy:** CLEAN — 1:1:1:1 shares are mathematically identical
to equal split among 4 people. Import as equal. Flag inconsistency.

**User-facing:** "Split type 'equal' with equal share details — treated
as equal split."

---

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | String UNIQUE | |
| name | String | |
| password_hash | String | bcrypt cost 10 |
| created_at | Timestamp | |

### groups
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | String | |
| created_by | UUID FK → users | |
| created_at | Timestamp | |

### group_memberships
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID FK → groups | |
| user_id | UUID FK → users | |
| role | String | "admin" or "member" |
| joined_at | Timestamp | membership start |
| left_at | Timestamp NULL | NULL = active |

**Key design:** Never deleted. left_at set on removal.
Multiple rows per user if they re-join. Each row = one membership period.

### expenses
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID FK → groups | |
| paid_by | UUID FK → users | |
| description | String | |
| amount_original | Decimal(12,2) | in original currency |
| currency | String | "INR", "USD", etc |
| amount_inr | Decimal(12,2) | always in INR |
| fx_rate | Decimal(10,4) | rate used for conversion |
| split_type | String | equal/unequal/percentage/share |
| expense_date | Timestamp | used for membership checks |
| is_settlement | Boolean | true = skip in balance calc |
| import_id | UUID FK → import_sessions NULL | |
| created_at | Timestamp | |

### expense_splits
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| expense_id | UUID FK → expenses CASCADE | |
| user_id | UUID FK → users | |
| share_amount | Decimal(12,2) | always in INR |
| share_percent | Decimal(6,3) NULL | for percentage splits |
| share_units | Decimal(10,3) NULL | for share splits |

### settlements
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID FK → groups | |
| paid_by | UUID FK → users | |
| paid_to | UUID FK → users | |
| amount | Decimal(12,2) | in INR |
| settled_on | Timestamp | |
| created_at | Timestamp | |

### import_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID FK → groups | |
| initiated_by | UUID FK → users | |
| status | String | pending_review/approved/rejected |
| anomaly_report | JSON | summary counts + all anomalies |
| created_at | Timestamp | |
| approved_at | Timestamp NULL | |

### import_rows
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| import_id | UUID FK → import_sessions | |
| row_number | Int | CSV row number |
| raw_data | JSON | original CSV row |
| status | String | clean/warning/error/skipped |
| anomaly_type | String NULL | comma-separated types |
| anomaly_detail | String NULL | human-readable detail |
| action_taken | String NULL | what the importer did |

### group_invites
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| group_id | UUID FK → groups | |
| email | String | invite recipient |
| token | String UNIQUE | 32-byte hex, used in link |
| role | String | "member" or "admin" |
| invited_by | UUID FK → users | |
| status | String | pending/accepted/expired/cancelled |
| expires_at | Timestamp | 7 days from creation |
| created_at | Timestamp | |
| accepted_at | Timestamp NULL | |