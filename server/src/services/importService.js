import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { convertToInr } from '../utils/currencyConverter.js'
import { parse } from 'csv-parse/sync'
import { wasMemberOnDate } from '../utils/membershipUtils.js'

const connectionString = `${globalThis.process?.env?.DATABASE_URL || ''}`
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ─── STAGE 1: PARSE ───────────────────────────────────────────────────────────
// Read raw CSV bytes → array of row objects.
// No validation here. Just parse.

function parseCSV(buffer) {
  try {
    const records = parse(buffer, {
      columns:          true,   // use first row as headers
      skip_empty_lines: true,
      trim:             true
    })
    return { success: true, records }
  } catch (err) {
    return { success: false, error: `CSV parse failed: ${err.message}` }
  }
}

// ─── STAGE 2: NORMALIZE ───────────────────────────────────────────────────────
// Standardize field names regardless of what the CSV header says.
// This is where inconsistent column names are handled.

function normalizeHeaders(records) {
  return records.map((row, index) => {
    return {
      _rowNumber:   index + 2, // +2 because row 1 is header
      _raw:         { ...row },
      date:         row['date'] || row['Date'] || row['DATE'] ||
                    row['expense_date'] || row['Expense Date'] || '',
      description:  row['description'] || row['Description'] ||
                    row['desc'] || row['item'] || '',
      amount:       row['amount'] || row['Amount'] || row['AMOUNT'] ||
                    row['total'] || '',
      currency:     row['currency'] || row['Currency'] || row['CURRENCY'] || 'INR',
      paid_by:      row['paid_by'] || row['Paid By'] || row['paid by'] ||
                    row['paidBy'] || '',
      split_type:   row['split_type'] || row['Split Type'] || row['split type'] ||
                    row['splitType'] || 'equal',
      participants: row['participants'] || row['Participants'] ||
                    row['members'] || row['split_among'] || '',
      notes:        row['notes'] || row['Notes'] || row['note'] || ''
    }
  })
}

// ─── STAGE 3: DETECT ANOMALIES ────────────────────────────────────────────────
// Each check is a named function. Every anomaly gets:
//   type        — machine-readable category
//   detail      — human-readable explanation
//   severity    — 'error' (cannot import) | 'warning' (import with flag)
//   suggestedAction — what we will do if user approves

function detectAnomalies(rows, knownMembers, existingExpenses) {
  const results = []

  for (const row of rows) {
    const anomalies = []

    // ── CHECK 1: Missing required fields ──────────────────────────────────
    if (!row.date?.trim()) {
      anomalies.push({
        type:            'MISSING_DATE',
        detail:          `Row ${row._rowNumber}: date is empty`,
        severity:        'error',
        suggestedAction: 'Skip this row'
      })
    }

    if (!row.description?.trim()) {
      anomalies.push({
        type:            'MISSING_DESCRIPTION',
        detail:          `Row ${row._rowNumber}: description is empty`,
        severity:        'warning',
        suggestedAction: 'Import with description set to "Unnamed expense"'
      })
    }

    if (!row.amount?.toString().trim()) {
      anomalies.push({
        type:            'MISSING_AMOUNT',
        detail:          `Row ${row._rowNumber}: amount is empty`,
        severity:        'error',
        suggestedAction: 'Skip this row'
      })
    }

    // ── CHECK 2: Invalid date format ──────────────────────────────────────
    const parsedDate = parseDate(row.date)
    if (row.date && !parsedDate) {
      anomalies.push({
        type:            'INVALID_DATE_FORMAT',
        detail:          `Row ${row._rowNumber}: "${row.date}" is not a recognized date format`,
        severity:        'error',
        suggestedAction: 'Skip this row — date cannot be reliably inferred'
      })
    }

    // ── CHECK 3: Invalid or unparseable amount ────────────────────────────
    const parsedAmount = parseAmount(row.amount)
    if (row.amount && parsedAmount === null) {
      anomalies.push({
        type:            'INVALID_AMOUNT_FORMAT',
        detail:          `Row ${row._rowNumber}: "${row.amount}" cannot be parsed as a number`,
        severity:        'error',
        suggestedAction: 'Skip this row'
      })
    }

    // ── CHECK 4: Negative amount ──────────────────────────────────────────
    // Policy: treat as a refund (valid), flag as warning for user awareness.
    // We do NOT silently flip it to positive.
    if (parsedAmount !== null && parsedAmount < 0) {
      anomalies.push({
        type:            'NEGATIVE_AMOUNT',
        detail:          `Row ${row._rowNumber}: amount is negative (₹${parsedAmount}). Treated as refund.`,
        severity:        'warning',
        suggestedAction: 'Import as refund expense with negative amount'
      })
    }

    // ── CHECK 5: Unknown currency → USD treated as INR ────────────────────
    // This is Priya's complaint. The CSV has USD amounts with no currency column,
    // meaning previous sheet treated 1 USD = 1 INR.
    const currency = (row.currency || 'INR').toUpperCase().trim()
    const conversionResult = parsedAmount !== null
      ? convertToInr(parsedAmount, currency)
      : null

    if (conversionResult && !conversionResult.success) {
      anomalies.push({
        type:            'UNKNOWN_CURRENCY',
        detail:          `Row ${row._rowNumber}: currency "${currency}" is not recognized`,
        severity:        'error',
        suggestedAction: 'Skip this row — cannot convert amount to INR'
      })
    }

    if (currency === 'USD') {
      anomalies.push({
        type:            'CURRENCY_CONVERSION_APPLIED',
        detail:          `Row ${row._rowNumber}: USD amount ₹${parsedAmount} converted to INR at rate 83.5 → ₹${conversionResult?.amountInr}`,
        severity:        'warning',
        suggestedAction: `Import with converted amount ₹${conversionResult?.amountInr} (rate: 83.5)`
      })
    }

    // ── CHECK 6: Unknown payer ────────────────────────────────────────────
    const payerName = row.paid_by?.trim()
    const payer     = findMember(payerName, knownMembers)
    if (payerName && !payer) {
      anomalies.push({
        type:            'UNKNOWN_PAYER',
        detail:          `Row ${row._rowNumber}: payer "${payerName}" is not a known member`,
        severity:        'error',
        suggestedAction: 'Skip this row — cannot assign payment to unknown person'
      })
    }

    // ── CHECK 7: Payer not a member on expense date ───────────────────────
    // Meera moved out end of March. An expense dated April with Meera as payer
    // is a membership violation.
    if (payer && parsedDate) {
      anomalies.push({
        type:            'MEMBERSHIP_DATE_CHECK_PENDING',
        _checkPayload:   { userId: payer.id, date: parsedDate },
        detail:          `Row ${row._rowNumber}: membership date check required for ${payerName}`,
        severity:        'info',
        suggestedAction: 'Will verify against membership timeline'
      })
    }

    // ── CHECK 8: Settlement logged as expense ─────────────────────────────
    // Look for keywords in description that indicate this is a payment,
    // not a shared expense.
    const desc = (row.description || '').toLowerCase()
    const settlementKeywords = ['settlement', 'settle', 'paid back', 'repaid',
                                'reimbursement', 'reimburse', 'transfer',
                                'returning', 'payback', 'pay back']
    const isSettlement = settlementKeywords.some(kw => desc.includes(kw))
    if (isSettlement) {
      anomalies.push({
        type:            'SETTLEMENT_AS_EXPENSE',
        detail:          `Row ${row._rowNumber}: "${row.description}" looks like a settlement, not a shared expense`,
        severity:        'warning',
        suggestedAction: 'Flag as settlement transaction, exclude from expense splits'
      })
    }

    // ── CHECK 9: Duplicate detection ──────────────────────────────────────
    // A duplicate is defined as: same date + same description + same amount + same payer.
    // Policy: keep the first occurrence, flag subsequent ones.
    // "Two people logged the same dinner with different amounts" → both flagged,
    // user decides which to keep in the approval UI.
    if (parsedDate && parsedAmount !== null && payer) {
      const isDuplicate = checkDuplicate(
        row, parsedDate, parsedAmount, payer,
        existingExpenses, rows
      )
      if (isDuplicate.found) {
        anomalies.push({
          type:            'DUPLICATE_EXPENSE',
          detail:          `Row ${row._rowNumber}: possible duplicate of ${isDuplicate.source} — same date, description, amount, payer`,
          severity:        'warning',
          suggestedAction: isDuplicate.source === 'database'
            ? 'Skip — already exists in database'
            : 'Flag for user review — duplicate within CSV'
        })
      }
    }

    // ── CHECK 10: Split percentages don't sum to 100 ──────────────────────
    if (row.split_type === 'percentage' && row.participants) {
      const percentCheck = validatePercentages(row.participants)
      if (!percentCheck.valid) {
        anomalies.push({
          type:            'INVALID_PERCENTAGE_SUM',
          detail:          `Row ${row._rowNumber}: percentages sum to ${percentCheck.sum}%, not 100%`,
          severity:        'error',
          suggestedAction: 'Skip this row — percentages must sum to 100'
        })
      }
    }

    // ── CHECK 11: Unknown participant in split ────────────────────────────
    if (row.participants) {
      const unknownParticipants = findUnknownParticipants(
        row.participants, knownMembers
      )
      if (unknownParticipants.length > 0) {
        anomalies.push({
          type:            'UNKNOWN_PARTICIPANT',
          detail:          `Row ${row._rowNumber}: unknown participants: ${unknownParticipants.join(', ')}`,
          severity:        'warning',
          suggestedAction: 'Import excluding unknown participants, split among known members only'
        })
      }
    }

    // ── CHECK 12: Zero amount ─────────────────────────────────────────────
    if (parsedAmount !== null && parsedAmount === 0) {
      anomalies.push({
        type:            'ZERO_AMOUNT',
        detail:          `Row ${row._rowNumber}: amount is zero`,
        severity:        'warning',
        suggestedAction: 'Skip this row — zero amount expense has no effect on balances'
      })
    }

    results.push({
      rowNumber:   row._rowNumber,
      raw:         row._raw,
      normalized:  row,
      parsedDate,
      parsedAmount,
      payer,
      currency,
      conversionResult,
      isSettlement,
      anomalies,
      // A row is importable if it has no error-severity anomalies
      canImport:   !anomalies.some(a => a.severity === 'error'),
      status:      anomalies.length === 0
        ? 'clean'
        : anomalies.some(a => a.severity === 'error')
          ? 'error'
          : 'warning'
    })
  }

  return results
}

// ─── STAGE 4: WRITE ───────────────────────────────────────────────────────────
// Only called after user explicitly approves the preview.
// Wraps everything in a single DB transaction — all or nothing.

async function commitImport(importSessionId, analyzedRows, groupId, knownMembers) {
  return await prisma.$transaction(async (tx) => {
    const createdExpenses = []

    for (const row of analyzedRows) {
      // Write the ImportRow audit record regardless of outcome
      const importRowData = {
        importId:      importSessionId,
        rowNumber:     row.rowNumber,
        rawData:       row.raw,
        status:        row.status,
        anomalyType:   row.anomalies.map(a => a.type).join(', ') || null,
        anomalyDetail: row.anomalies.map(a => a.detail).join(' | ') || null,
        actionTaken:   row.anomalies.map(a => a.suggestedAction).join(' | ') || null
      }
      await tx.importRow.create({ data: importRowData })

      // Skip rows with errors
      if (!row.canImport) continue

      // Skip zero-amount rows
      if (row.parsedAmount === 0) continue

      // Skip confirmed duplicates against database
      const dbDuplicate = row.anomalies.find(
        a => a.type === 'DUPLICATE_EXPENSE' &&
             a.suggestedAction.includes('already exists in database')
      )
      if (dbDuplicate) continue

      // Verify payer membership on expense date
      if (row.payer) {
        const memberOnDate = await wasMemberOnDate(
          groupId, row.payer.id, row.parsedDate
        )
        if (!memberOnDate) {
          // Update the import row with this finding
          await tx.importRow.updateMany({
            where: { importId: importSessionId, rowNumber: row.rowNumber },
            data: {
              status:      'error',
              anomalyType: 'PAYER_NOT_MEMBER_ON_DATE',
              actionTaken: `Skipped — ${row.payer.name} was not a member on ${row.parsedDate.toISOString().split('T')[0]}`
            }
          })
          continue
        }
      }

      // Resolve participants
      const participantNames = parseParticipants(row.normalized.participants)
      const participants = participantNames.length > 0
        ? participantNames
            .map(name => findMember(name, knownMembers))
            .filter(Boolean)
        : knownMembers  // if no participants listed, split among all known members

      // Build splits based on split_type
      const splits = buildSplits(
        row.normalized.split_type,
        row.conversionResult?.amountInr || row.parsedAmount,
        participants,
        row.normalized.participants
      )

      if (!splits) continue  // invalid split config, skip

      // Create the expense
      const expense = await tx.expense.create({
        data: {
          groupId,
          paidBy:          row.payer.id,
          description:     row.normalized.description?.trim() || 'Unnamed expense',
          amountOriginal:  row.parsedAmount,
          currency:        row.currency,
          amountInr:       row.conversionResult?.amountInr || row.parsedAmount,
          fxRate:          row.conversionResult?.fxRate || 1,
          splitType:       normalizeSplitType(row.normalized.split_type),
          expenseDate:     row.parsedDate,
          isSettlement:    row.isSettlement,
          importId:        importSessionId,
          splits: {
            create: splits
          }
        }
      })

      createdExpenses.push(expense)
    }

    // Mark import session as approved
    await tx.importSession.update({
      where: { id: importSessionId },
      data: {
        status:     'approved',
        approvedAt: new Date()
      }
    })

    return createdExpenses
  })
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

// Attempts multiple date formats — handles inconsistent CSV dates
function parseDate(dateStr) {
  if (!dateStr) return null
  const str = dateStr.toString().trim()

  const formats = [
    // ISO: 2024-03-15
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // DD/MM/YYYY: 15/03/2024
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // DD-MM-YYYY: 15-03-2024
    /^(\d{2})-(\d{2})-(\d{4})$/,
    // MM/DD/YYYY: 03/15/2024
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // D MMM YYYY: 15 Mar 2024
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i
  ]

  // Try native Date first for ISO format
  const native = new Date(str)
  if (!isNaN(native.getTime()) && str.includes('-') && str.length === 10) {
    return native
  }

  // DD/MM/YYYY
  const ddmm = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmm) {
    const d = new Date(`${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`)
    if (!isNaN(d.getTime())) return d
  }

  // DD-MM-YYYY
  const ddmmDash = str.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (ddmmDash) {
    const d = new Date(`${ddmmDash[3]}-${ddmmDash[2]}-${ddmmDash[1]}`)
    if (!isNaN(d.getTime())) return d
  }

  // D MMM YYYY
  const dMmmYyyy = str.match(
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i
  )
  if (dMmmYyyy) {
    const d = new Date(`${dMmmYyyy[1]} ${dMmmYyyy[2]} ${dMmmYyyy[3]}`)
    if (!isNaN(d.getTime())) return d
  }

  return null
}

// Strips currency symbols, commas, spaces before parsing
function parseAmount(amountStr) {
  if (amountStr === null || amountStr === undefined || amountStr === '') return null
  const str = amountStr.toString()
    .replace(/[₹$€£,\s]/g, '')  // remove currency symbols and formatting
    .trim()
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

// Case-insensitive, trim-aware name lookup
// Handles "Dev" appearing in CSV but not registered as a user
function findMember(name, knownMembers) {
  if (!name) return null
  const normalized = name.toLowerCase().trim()
  return knownMembers.find(m =>
    m.name.toLowerCase().trim() === normalized ||
    m.email.toLowerCase().trim() === normalized
  ) || null
}

// Check for duplicates within the CSV and against the database
function checkDuplicate(row, parsedDate, parsedAmount, payer, existingExpenses, allRows) {
  const dateStr = parsedDate?.toISOString().split('T')[0]
  const desc    = row.description?.toLowerCase().trim()

  // Check against already-imported expenses in database
  const dbMatch = existingExpenses.find(e => {
    const eDate = new Date(e.expenseDate).toISOString().split('T')[0]
    return eDate === dateStr &&
           e.description.toLowerCase().trim() === desc &&
           Math.abs(parseFloat(e.amountInr) - parsedAmount) < 0.01 &&
           e.paidBy === payer.id
  })
  if (dbMatch) return { found: true, source: 'database' }

  // Check for duplicates within the CSV itself
  const csvMatch = allRows.find(other =>
    other._rowNumber !== row._rowNumber &&
    other.description?.toLowerCase().trim() === desc &&
    parseAmount(other.amount) === parsedAmount &&
    other.paid_by?.toLowerCase().trim() === row.paid_by?.toLowerCase().trim() &&
    parseDate(other.date)?.toISOString().split('T')[0] === dateStr
  )
  if (csvMatch) return { found: true, source: `CSV row ${csvMatch._rowNumber}` }

  return { found: false }
}

function validatePercentages(participantsStr) {
  const parts  = participantsStr.split(';').map(p => p.trim())
  let sum = 0
  for (const p of parts) {
    const match = p.match(/:\s*([\d.]+)%?$/)
    if (match) sum += parseFloat(match[1])
  }
  return { valid: Math.abs(sum - 100) < 0.01, sum: +sum.toFixed(2) }
}

function findUnknownParticipants(participantsStr, knownMembers) {
  const names = parseParticipants(participantsStr)
  return names.filter(name => !findMember(name, knownMembers))
}

function parseParticipants(participantsStr) {
  if (!participantsStr) return []
  return participantsStr
    .split(/[;,]/)
    .map(p => p.split(':')[0].trim())  // handle "Name:50%" format
    .filter(Boolean)
}

function normalizeSplitType(raw) {
  const map = {
    'equal':      'equal',
    'equally':    'equal',
    'unequal':    'unequal',
    'exact':      'unequal',
    'percentage': 'percentage',
    'percent':    'percentage',
    '%':          'percentage',
    'share':      'share',
    'shares':     'share',
    'ratio':      'share'
  }
  return map[(raw || '').toLowerCase().trim()] || 'equal'
}

function buildSplits(splitType, totalAmountInr, participants, participantsRaw) {
  const type = normalizeSplitType(splitType)

  if (type === 'equal') {
    const share = +(totalAmountInr / participants.length).toFixed(2)
    // Distribute rounding remainder to first participant
    const remainder = +(totalAmountInr - share * participants.length).toFixed(2)
    return participants.map((p, i) => ({
      userId:      p.id,
      shareAmount: i === 0 ? +(share + remainder).toFixed(2) : share
    }))
  }

  if (type === 'percentage') {
    const parts = (participantsRaw || '').split(/[;,]/).map(p => p.trim())
    return participants.map(p => {
      const entry = parts.find(part =>
        part.toLowerCase().startsWith(p.name.toLowerCase())
      )
      const pct = entry
        ? parseFloat(entry.match(/([\d.]+)%?$/)?.[1] || 0)
        : 0
      return {
        userId:       p.id,
        shareAmount:  +(totalAmountInr * pct / 100).toFixed(2),
        sharePercent: pct
      }
    })
  }

  if (type === 'unequal') {
    const parts = (participantsRaw || '').split(/[;,]/).map(p => p.trim())
    return participants.map(p => {
      const entry = parts.find(part =>
        part.toLowerCase().startsWith(p.name.toLowerCase())
      )
      const amount = entry
        ? parseFloat(entry.match(/([\d.]+)$/)?.[1] || 0)
        : 0
      return {
        userId:      p.id,
        shareAmount: +amount.toFixed(2)
      }
    })
  }

  if (type === 'share') {
    const parts    = (participantsRaw || '').split(/[;,]/).map(p => p.trim())
    const totalUnits = parts.reduce((sum, part) => {
      const match = part.match(/([\d.]+)$/)
      return sum + (match ? parseFloat(match[1]) : 1)
    }, 0)

    return participants.map(p => {
      const entry = parts.find(part =>
        part.toLowerCase().startsWith(p.name.toLowerCase())
      )
      const units = entry
        ? parseFloat(entry.match(/([\d.]+)$/)?.[1] || 1)
        : 1
      return {
        userId:      p.id,
        shareAmount: +(totalAmountInr * units / totalUnits).toFixed(2),
        shareUnits:  units
      }
    })
  }

  return null
}

export { parseCSV, normalizeHeaders, detectAnomalies, commitImport }