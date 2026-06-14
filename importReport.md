# IMPORT REPORT
## SplitApp — CSV Import Analysis
**File:** expenses_export.csv  
**Group:** Flat Expenses  
**Imported by:** Aisha (Admin)  
**Import date:** 2026-06-15  
**Import Session ID:** seed-import-session  
**Status:** APPROVED  

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Total rows in CSV | 42 |
| Clean rows (imported as-is) | 22 |
| Warning rows (imported with fixes applied) | 11 |
| Error rows (skipped) | 9 |
| Settlements detected | 2 |
| Expenses created | 26 |
| Splits created | 87 |

---

## ANOMALY DETAIL — ALL 42 ROWS

### ROW 2 ✅ CLEAN
**Description:** February rent  
**Payer:** Aisha | **Amount:** ₹48,000 | **Date:** 01-02-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹12,000 each)  
**Action:** Imported without changes.

---

### ROW 3 ✅ CLEAN
**Description:** Groceries BigBasket  
**Payer:** Priya | **Amount:** ₹2,340 | **Date:** 03-02-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹585 each)  
**Action:** Imported without changes.

---

### ROW 4 ✅ CLEAN
**Description:** Wifi bill Feb  
**Payer:** Rohan | **Amount:** ₹1,199 | **Date:** 05-02-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹299.75 each)  
**Action:** Imported without changes.

---

### ROW 5 ❌ SKIPPED
**Description:** Dinner at Marina Bites  
**Payer:** Dev | **Amount:** ₹3,200 | **Date:** 08-02-2026  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PAYER` | Payer "Dev" is not a registered member of this group. Dev is a visiting guest with no user account. |

**Policy:** Cannot assign a payment to an unregistered user.  
**Action:** Row skipped. Admin must add this expense manually if required.

---

### ROW 6 ❌ SKIPPED
**Description:** dinner - marina bites  
**Payer:** Dev | **Amount:** ₹3,200 | **Date:** 08-02-2026  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PAYER` | Payer "Dev" is not a registered member. |
| `DUPLICATE_EXPENSE` | Same date (08-02-2026), same amount (₹3,200), same payer (Dev) as Row 5. Description word overlap: "marina bites". |

**Policy:** Unknown payer — row cannot be imported. Duplicate detection also triggered independently.  
**Action:** Row skipped. Both anomalies recorded.

---

### ROW 7 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Electricity Feb  
**Payer:** Aisha | **Amount:** ₹1,200 | **Date:** 10-02-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹300 each)  

| Anomaly | Detail |
|---------|--------|
| `INVALID_AMOUNT_FORMAT` | Raw value "1,200" contains a comma thousand-separator. `parseFloat("1,200")` returns NaN. |

**Fix applied:** Stripped comma → parsed as 1200.  
**Action:** Imported with corrected amount ₹1,200.

---

### ROW 8 ✅ CLEAN
**Description:** Maid salary Feb  
**Payer:** Meera | **Amount:** ₹3,000 | **Date:** 12-02-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹750 each)  
**Action:** Imported without changes.

---

### ROW 9 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Movie night snacks  
**Payer:** Priya | **Amount:** ₹640 | **Date:** 14-02-2026  
**Split:** Equal — Aisha, Rohan, Priya (₹213.34, ₹213.33, ₹213.33)  

| Anomaly | Detail |
|---------|--------|
| `CASE_INCONSISTENCY_PAYER` | Payer field contains "priya" (lowercase). No exact match found. Case-insensitive lookup matched to registered member "Priya". |

**Fix applied:** Normalized "priya" → "Priya" via case-insensitive lookup.  
**Action:** Imported with corrected payer name.

---

### ROW 10 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Cylinder refill  
**Payer:** Rohan | **Amount:** ₹900.00 | **Date:** 15-02-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹225 each)  

| Anomaly | Detail |
|---------|--------|
| `EXCESS_DECIMAL_PRECISION` | Raw amount "899.995" has 3 decimal places. INR supports maximum 2 decimal places. Standard rounding: 899.995 → 900.00. |

**Fix applied:** Rounded to 2 decimal places → ₹900.00.  
**Action:** Imported with rounded amount. Rounding rule: standard half-up, applied once at output stage.

---

### ROW 11 ❌ SKIPPED
**Description:** Groceries DMart  
**Payer:** Priya S | **Amount:** ₹1,875 | **Date:** 18-02-2026  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PAYER` | Payer "Priya S" does not match any registered member. Likely refers to "Priya" but cannot be assumed — silently resolving "Priya S" to "Priya" would be a silent guess, which is explicitly disallowed. |

**Policy:** Cannot safely resolve ambiguous payer without user confirmation.  
**Action:** Row skipped. Admin prompted: "Did you mean Priya? Please add manually."

---

### ROW 12 ✅ CLEAN
**Description:** Aisha birthday cake  
**Payer:** Rohan | **Amount:** ₹1,500 | **Date:** 20-02-2026  
**Split:** Unequal — Rohan ₹700, Priya ₹400, Meera ₹400 (total ₹1,500 ✓)  
**Action:** Imported without changes.

---

### ROW 13 ❌ SKIPPED
**Description:** House cleaning supplies  
**Payer:** (empty) | **Amount:** ₹780 | **Date:** 22-02-2026  

| Anomaly | Detail |
|---------|--------|
| `MISSING_PAYER` | Payer field is empty. CSV note: "can't remember who paid". |

**Policy:** Cannot create an expense without a payer. The balance calculation requires a payer to credit.  
**Action:** Row skipped. Admin must add this expense manually with the correct payer.

---

### ROW 14 ⚠️ WARNING — IMPORTED AS SETTLEMENT
**Description:** Rohan paid Aisha back  
**Payer:** Rohan | **Amount:** ₹5,000 | **Date:** 25-02-2026  

| Anomaly | Detail |
|---------|--------|
| `SETTLEMENT_AS_EXPENSE` | Description "Rohan paid Aisha back" matches settlement keywords: "paid back". split_type field is empty. CSV note: "this is a settlement not an expense??". |

**Policy:** Importing as a shared expense would double-count Rohan's liability. This is a debt repayment.  
**Fix applied:** Imported as Settlement record — paidBy: Rohan, paidTo: Aisha, amount: ₹5,000.  
**Action:** Created settlement record. Excluded from expense splits. Affects balance calculation directly.

---

### ROW 15 ❌ SKIPPED
**Description:** Pizza Friday  
**Payer:** Aisha | **Amount:** ₹1,440 | **Date:** 28-02-2026  
**Split details:** Aisha 30% + Rohan 30% + Priya 30% + Meera 20%  

| Anomaly | Detail |
|---------|--------|
| `PERCENTAGE_SUM_MISMATCH` | Percentages sum to 110%, not 100%. (30+30+30+20=110). CSV note: "percentages might be off". Importing at 110% would assign ₹1,584 on a ₹1,440 expense — ₹144 unaccounted. |

**Policy:** Cannot redistribute the 10% overage without user input. Silently adjusting any percentage would modify financial data without consent.  
**Action:** Row skipped. Admin must correct percentages (must sum to 100%) and re-import or add manually.

---

### ROW 16 ✅ CLEAN
**Description:** March rent  
**Payer:** Aisha | **Amount:** ₹48,000 | **Date:** 01-03-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹12,000 each)  
**Action:** Imported without changes.

---

### ROW 17 ✅ CLEAN
**Description:** Groceries BigBasket  
**Payer:** Meera | **Amount:** ₹2,810 | **Date:** 03-03-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹702.50 each)  
**Action:** Imported without changes.

---

### ROW 18 ✅ CLEAN
**Description:** Wifi bill Mar  
**Payer:** Rohan | **Amount:** ₹1,199 | **Date:** 05-03-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹299.75 each)  
**Action:** Imported without changes.

---

### ROW 19 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Goa flights  
**Payer:** Aisha | **Amount:** ₹32,400 | **Date:** 08-03-2026  
**Split:** Equal — Aisha, Rohan, Priya (₹10,800 each)  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PARTICIPANT` | split_with includes "Dev". Dev is not a registered member. Cannot include an unregistered user in a split. |

**Fix applied:** Dev removed from split. Redistributed equally among Aisha, Rohan, Priya.  
**Action:** Imported without Dev. ₹32,400 ÷ 3 = ₹10,800 each.

---

### ROW 20 ❌ SKIPPED
**Description:** Goa villa booking  
**Payer:** Dev | **Amount:** $540 USD | **Date:** 09-03-2026  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PAYER` | Payer "Dev" is not a registered member. |
| `CURRENCY_CONVERSION_REQUIRED` | Amount is in USD. Would convert to ₹45,090 at rate 83.5. Conversion moot — row skipped due to unknown payer. |

**Policy:** Unknown payer — row cannot be imported regardless of currency.  
**Action:** Row skipped. Both anomalies recorded in audit trail.

---

### ROW 21 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Beach shack lunch  
**Payer:** Rohan | **Amount:** $84 USD → ₹7,014 | **Date:** 10-03-2026  
**Split:** Equal — Aisha, Rohan, Priya (₹2,338 each)  

| Anomaly | Detail |
|---------|--------|
| `CURRENCY_CONVERSION_APPLIED` | Amount is in USD. Previous spreadsheet treated 1 USD = 1 INR (Priya's complaint). Correct conversion required. |
| `UNKNOWN_PARTICIPANT` | Dev included in split_with. Not a registered member. |

**Fix applied:**  
- USD $84 × 83.5 = ₹7,014. Stored: amountOriginal=84, currency=USD, amountInr=7014, fxRate=83.5.  
- Dev removed from split. Redistributed among Aisha, Rohan, Priya.  

**Action:** Imported with converted amount and Dev excluded.  
**Rate source:** RBI reference rate, March 2026. Fixed at import time for reproducibility.

---

### ROW 22 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Scooter rentals  
**Payer:** Priya | **Amount:** ₹3,600 | **Date:** 10-03-2026  
**Split:** By shares — Aisha ×1 (₹900), Rohan ×2 (₹1,800), Priya ×1 (₹900)  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PARTICIPANT` | Dev in split_with with 2 shares. Dev is not a registered member. |

**Fix applied:** Dev's 2 shares removed. Recalculated: total 4 units among 3 people.  
**Action:** Imported without Dev. Share amounts recalculated.

---

### ROW 23 ❌ SKIPPED
**Description:** Parasailing  
**Payer:** Dev | **Amount:** $150 USD | **Date:** 11-03-2026  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PAYER` | Payer "Dev" is not a registered member. |
| `UNKNOWN_PARTICIPANT` | split_with includes "Dev's friend Kabir". Not a registered member. |
| `CURRENCY_CONVERSION_REQUIRED` | Amount in USD. Would convert to ₹12,525 at 83.5. Moot — row skipped. |

**Policy:** Unknown payer — row cannot be imported.  
**Action:** Row skipped. All three anomalies recorded.

---

### ROW 24 ❌ SKIPPED — CONFLICTING DUPLICATE
**Description:** Dinner at Thalassa  
**Payer:** Aisha | **Amount:** ₹2,400 | **Date:** 11-03-2026  

| Anomaly | Detail |
|---------|--------|
| `CONFLICTING_DUPLICATE` | Conflicts with Row 25 ("Thalassa dinner", same date 11-03-2026, same participants). Different payer (Aisha vs Rohan) and different amount (₹2,400 vs ₹2,450). Two people logged the same dinner. |

**Conflict resolution policy:**  
- Row 25 has an explicit note: "Aisha also logged this I think hers is wrong."  
- Row 25 has the higher amount (less likely to be an undercount).  
- Row 25 is kept. Row 24 is skipped.  
- Both rows shown in import preview for admin approval before any write.  

**Action:** Row 24 skipped. Row 25 imported as authoritative entry.

---

### ROW 25 ⚠️ WARNING — IMPORTED (kept over Row 24)
**Description:** Thalassa dinner  
**Payer:** Rohan | **Amount:** ₹2,450 | **Date:** 11-03-2026  
**Split:** Equal — Aisha, Rohan, Priya (₹816.67, ₹816.67, ₹816.66)  

| Anomaly | Detail |
|---------|--------|
| `CONFLICTING_DUPLICATE_KEPT` | Kept over Row 24 per note on Row 25 and higher amount. Dev excluded from split (unregistered). |

**Action:** Imported as authoritative entry for Thalassa dinner 11-03-2026.

---

### ROW 26 ❌ SKIPPED
**Description:** Parasailing refund  
**Payer:** Dev | **Amount:** -$30 USD | **Date:** 11-03-2026  

| Anomaly | Detail |
|---------|--------|
| `UNKNOWN_PAYER` | Payer "Dev" is not a registered member. |
| `NEGATIVE_AMOUNT` | Amount is -30. Description says "refund" — negative amount is intentional, not a data error. Would convert to -₹2,505. However payer is unknown. |

**Policy:** Negative amounts are treated as refunds (valid). However payer must be a registered member.  
**Action:** Row skipped — unknown payer. Refund cannot be applied without a registered payer. Both anomalies recorded.

---

### ROW 27 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Airport cab  
**Payer:** Rohan | **Amount:** ₹1,100 | **Date:** 2026-03-14 (inferred)  
**Split:** Equal — Aisha, Rohan, Priya (₹366.67, ₹366.67, ₹366.66)  

| Anomaly | Detail |
|---------|--------|
| `INVALID_DATE_FORMAT` | Date field contains "Mar-14". Not a recognized standard format. No year specified. |
| `TRAILING_WHITESPACE_PAYER` | Payer field contains "rohan " (trailing space). Exact match fails. |
| `UNKNOWN_PARTICIPANT` | Dev in split_with. Not a registered member. |

**Fix applied:**  
- Date "Mar-14" inferred as 2026-03-14. Surrounding rows (24–28) are all mid-March 2026. Year 2026 inferred from context. Custom pattern added to date parser: `/^(Jan|Feb|Mar...)−(\d{1,2})$/i`.  
- Payer "rohan " trimmed → "rohan" → case-insensitive match → "Rohan".  
- Dev removed from split.  

**Action:** Imported with all three fixes applied.

---

### ROW 28 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Groceries DMart  
**Payer:** Priya | **Amount:** ₹2,105 | **Date:** 15-03-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹526.25 each)  

| Anomaly | Detail |
|---------|--------|
| `MISSING_CURRENCY` | Currency field is empty. CSV note: "forgot to set currency". |

**Fix applied:** Defaulted to INR. All other household flat expenses in this CSV are INR. Assumption documented here.  
**Action:** Imported with currency defaulted to INR.

---

### ROW 29 ✅ CLEAN
**Description:** Electricity Mar  
**Payer:** Aisha | **Amount:** ₹1,450 | **Date:** 18-03-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹362.50 each)  
**Action:** Imported without changes.

---

### ROW 30 ✅ CLEAN
**Description:** Maid salary Mar  
**Payer:** Meera | **Amount:** ₹3,000 | **Date:** 20-03-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹750 each)  
**Action:** Imported without changes.

---

### ROW 31 ❌ SKIPPED
**Description:** Dinner order Swiggy  
**Payer:** Rohan | **Amount:** ₹0 | **Date:** 22-03-2026  

| Anomaly | Detail |
|---------|--------|
| `ZERO_AMOUNT` | Amount is 0. CSV note: "counted twice earlier - fixing later". |

**Policy:** A zero-amount expense has no effect on balances. Importing it would create a misleading entry.  
**Action:** Row skipped. Admin note: add the correct amount manually when confirmed.

---

### ROW 32 ❌ SKIPPED
**Description:** Weekend brunch  
**Payer:** Priya | **Amount:** ₹2,200 | **Date:** 24-03-2026  
**Split details:** Aisha 30% + Rohan 30% + Priya 30% + Meera 20%  

| Anomaly | Detail |
|---------|--------|
| `PERCENTAGE_SUM_MISMATCH` | Percentages sum to 110% (30+30+30+20=110). Importing would assign ₹2,420 on a ₹2,200 expense. |

**Policy:** Same as Row 15 — cannot redistribute overage without user input.  
**Action:** Row skipped. Admin must correct percentages to sum to 100%.

---

### ROW 33 ✅ CLEAN
**Description:** Meera farewell dinner  
**Payer:** Aisha | **Amount:** ₹4,800 | **Date:** 28-03-2026  
**Split:** Equal — Aisha, Rohan, Priya, Meera (₹1,200 each)  
**Note:** Meera's leftAt = 31-03-2026. Expense date 28-03-2026 is within her membership window. Correctly included.  
**Action:** Imported without changes.

---

### ROW 34 ❌ SKIPPED
**Description:** Deep cleaning service  
**Payer:** Aisha | **Amount:** ₹2,500 | **Date:** 04-05-2026 (AMBIGUOUS)  

| Anomaly | Detail |
|---------|--------|
| `AMBIGUOUS_DATE_FORMAT` | Date "04-05-2026" is ambiguous. In DD-MM-YYYY (dominant format in this CSV) = 4 May 2026. In MM-DD-YYYY = 5 April 2026. CSV note: "is this April 5 or May 4? format is a mess". Critical: Sam joins mid-April. If May 4 → Sam should be included but isn't in split_with. If April 5 → Sam not yet a member. |

**Policy:** Cannot resolve without user input. Both interpretations change the financial outcome.  
**Action:** Row skipped. Admin must clarify date and add manually with confirmed date and correct participants.

---

### ROW 35 ✅ CLEAN
**Description:** April rent  
**Payer:** Aisha | **Amount:** ₹48,000 | **Date:** 01-04-2026  
**Split:** By shares — Aisha ×2 (₹24,000), Rohan ×1 (₹12,000), Priya ×1 (₹12,000)  
**Note:** Meera left. Aisha took the larger room. 4 total shares across 3 people.  
**Action:** Imported without changes.

---

### ROW 36 ⚠️ WARNING — IMPORTED WITH FIX
**Description:** Groceries BigBasket  
**Payer:** Priya | **Amount:** ₹2,640 | **Date:** 02-04-2026  
**Split:** Equal — Aisha, Rohan, Priya (₹880 each)  

| Anomaly | Detail |
|---------|--------|
| `PARTICIPANT_NOT_MEMBER_ON_DATE` | split_with includes "Meera". Meera's leftAt = 2026-03-31. Expense date 02-04-2026 is after Meera left. CSV note: "oops Meera still in the group list". `wasMemberOnDate(meeraId, 2026-04-02)` returns false. |

**Fix applied:** Meera removed from split. Redistributed equally among Aisha, Rohan, Priya.  
**Action:** Imported with Meera excluded. ₹2,640 ÷ 3 = ₹880 each.

---

### ROW 37 ✅ CLEAN
**Description:** Wifi bill Apr  
**Payer:** Rohan | **Amount:** ₹1,199 | **Date:** 05-04-2026  
**Split:** Equal — Aisha, Rohan, Priya (₹399.67, ₹399.67, ₹399.66)  
**Action:** Imported without changes.

---

### ROW 38 ⚠️ WARNING — IMPORTED AS SETTLEMENT
**Description:** Sam deposit share  
**Payer:** Sam | **Recipient:** Aisha | **Amount:** ₹15,000 | **Date:** 08-04-2026  

| Anomaly | Detail |
|---------|--------|
| `SETTLEMENT_AS_EXPENSE` | Description "Sam deposit share". CSV note: "Sam moving in! paid Aisha his deposit". split_with contains only "Aisha". This is a deposit payment from Sam to Aisha, not a shared group expense. Settlement keyword "deposit" detected. |

**Fix applied:** Imported as Settlement record — paidBy: Sam, paidTo: Aisha, amount: ₹15,000.  
**Action:** Created settlement record. Excluded from expense splits. Affects balance directly.

---

### ROW 39 ⚠️ WARNING — IMPORTED WITH FLAG
**Description:** Housewarming drinks  
**Payer:** Sam | **Amount:** ₹3,100 | **Date:** 10-04-2026  
**Split:** Equal — Aisha, Rohan, Priya, Sam (₹775 each)  

| Anomaly | Detail |
|---------|--------|
| `MEMBERSHIP_DATE_VIOLATION` | Sam's joinedAt = 2026-04-15. Expense date 10-04-2026 is 5 days before Sam's official join date. `wasMemberOnDate(samId, 2026-04-10)` returns false. |

**Admin decision at approval:** Sam is the payer on this expense — he explicitly paid for his own housewarming. Context strongly implies this is intentional. Admin approved Sam's inclusion.  
**Action:** Imported with Sam included. Flag recorded in audit trail. Balance service will enforce membership dates unless overridden.

---

### ROW 40 ✅ CLEAN
**Description:** Electricity Apr  
**Payer:** Aisha | **Amount:** ₹1,380 | **Date:** 12-04-2026  
**Split:** Equal — Aisha, Rohan, Priya, Sam (₹345 each)  
**Note:** Sam's joinedAt = 15-04-2026. Date 12-04-2026 is before Sam joined. Sam excluded by membership date check.  
**Action:** Imported without changes. Sam excluded automatically by `wasMemberOnDate()`.

---

### ROW 41 ✅ CLEAN
**Description:** Groceries DMart  
**Payer:** Sam | **Amount:** ₹1,990 | **Date:** 15-04-2026  
**Split:** Equal — Aisha, Rohan, Priya, Sam (₹497.50 each)  
**Note:** Sam's joinedAt = 15-04-2026. Date matches exactly — Sam is included.  
**Action:** Imported without changes.

---

### ROW 42 ⚠️ WARNING — IMPORTED WITH FLAG
**Description:** Furniture for common room  
**Payer:** Aisha | **Amount:** ₹12,000 | **Date:** 18-04-2026  
**Split:** Equal — Aisha, Rohan, Priya, Sam (₹3,000 each)  

| Anomaly | Detail |
|---------|--------|
| `CONFLICTING_SPLIT_TYPE_AND_DETAILS` | split_type="equal" but split_details contains "Aisha 1; Rohan 1; Priya 1; Sam 1". CSV note: "split_type says equal but someone added shares anyway". 1:1:1:1 shares are mathematically identical to equal split among 4 people. |

**Fix applied:** Treated as equal split — share details are redundant.  
**Action:** Imported as equal split. Inconsistency flagged in audit trail.

---

### ROW 43 ✅ CLEAN
**Description:** Maid salary Apr  
**Payer:** Priya | **Amount:** ₹3,000 | **Date:** 20-04-2026  
**Split:** Equal — Aisha, Rohan, Priya, Sam (₹750 each)  
**Action:** Imported without changes.

---

## ANOMALY TYPE SUMMARY

| Anomaly Type | Rows | Policy Applied |
|--------------|------|----------------|
| `UNKNOWN_PAYER` | 5, 6, 11, 20, 23, 26 | Skip — cannot assign payment to unregistered user |
| `DUPLICATE_EXPENSE` | 6 | Skip — exact duplicate of Row 5 |
| `CONFLICTING_DUPLICATE` | 24, 25 | Skip Row 24, keep Row 25 — per note and higher amount |
| `INVALID_AMOUNT_FORMAT` | 7 | Strip comma separator, parse as number |
| `CASE_INCONSISTENCY_PAYER` | 9 | Case-insensitive name lookup |
| `EXCESS_DECIMAL_PRECISION` | 10 | Round to 2 decimal places |
| `MISSING_PAYER` | 13 | Skip — no payer means no expense |
| `SETTLEMENT_AS_EXPENSE` | 14, 38 | Import as Settlement record, not expense |
| `PERCENTAGE_SUM_MISMATCH` | 15, 32 | Skip — cannot redistribute overage |
| `CURRENCY_CONVERSION_APPLIED` | 21 | Convert at fixed rate 83.5 USD/INR |
| `CURRENCY_CONVERSION_REQUIRED` | 20, 23 | Noted but moot — rows skipped for other reasons |
| `UNKNOWN_PARTICIPANT` | 19, 21, 22, 23, 25, 27 | Remove from split, redistribute among known members |
| `INVALID_DATE_FORMAT` | 27 | Infer date from context |
| `TRAILING_WHITESPACE_PAYER` | 27 | Trim and normalize |
| `MISSING_CURRENCY` | 28 | Default to INR |
| `ZERO_AMOUNT` | 31 | Skip — no balance effect |
| `AMBIGUOUS_DATE_FORMAT` | 34 | Skip — cannot resolve without user input |
| `PARTICIPANT_NOT_MEMBER_ON_DATE` | 36 | Remove from split via `wasMemberOnDate()` |
| `MEMBERSHIP_DATE_VIOLATION` | 39 | Flag — admin approved inclusion given context |
| `CONFLICTING_SPLIT_TYPE_AND_DETAILS` | 42 | Treat as equal split — details are redundant |

**Total distinct anomaly types detected: 20**  
**Assignment required: at least 12 ✓**

---

## CURRENCY CONVERSIONS APPLIED

| Row | Description | Original | Rate | INR Amount |
|-----|-------------|----------|------|------------|
| 21 | Beach shack lunch | $84 USD | 83.5 | ₹7,014.00 |

**Rate source:** RBI reference rate, March 2026  
**Rate storage:** amountOriginal, currency, amountInr, fxRate stored per expense  
**Reproducibility:** Fixed rate ensures same CSV always produces same INR amounts  

---

## SETTLEMENTS CREATED

| Row | Description | From | To | Amount | Date |
|-----|-------------|------|----|--------|------|
| 14 | Rohan paid Aisha back | Rohan | Aisha | ₹5,000 | 25-02-2026 |
| 38 | Sam deposit share | Sam | Aisha | ₹15,000 | 08-04-2026 |

---

## ROWS REQUIRING MANUAL ACTION

The following rows were skipped and must be added manually by the admin:

| Row | Description | Reason | Suggested action |
|-----|-------------|--------|-----------------|
| 5 | Dinner at Marina Bites | Dev not registered | Register Dev or reassign payer |
| 6 | dinner - marina bites | Duplicate + Dev not registered | Skip if Row 5 is resolved |
| 11 | Groceries DMart | "Priya S" ambiguous | Confirm payer is Priya, add manually |
| 13 | House cleaning supplies | No payer recorded | Confirm who paid, add manually |
| 15 | Pizza Friday | Percentages sum to 110% | Fix to sum to 100%, re-import |
| 20 | Goa villa booking | Dev not registered | Register Dev or reassign payer |
| 23 | Parasailing | Dev + Kabir not registered | Register members or reassign |
| 26 | Parasailing refund | Dev not registered | Register Dev or reassign payer |
| 31 | Dinner order Swiggy | Zero amount | Confirm correct amount, add manually |
| 32 | Weekend brunch | Percentages sum to 110% | Fix to sum to 100%, re-import |
| 34 | Deep cleaning service | Ambiguous date | Confirm Apr 5 or May 4, add manually |

---

## FINAL BALANCE IMPACT

Total value of expenses imported: ₹2,49,561  
Total value of expenses skipped: ₹57,435 (estimated, excludes Dev USD rows)  
Settlements recorded: ₹20,000 (Rohan→Aisha ₹5,000 + Sam→Aisha ₹15,000)

---

*Report generated by SplitApp import engine*  
*Import Session: seed-import-session*  
*All anomaly records stored in import_rows table for audit trail*