/**
 * seed.js — Complete mock data seed for SplitApp
 *
 * Creates:
 *   - 5 users: Aisha, Rohan, Priya, Meera, Sam
 *   - 1 group: Flat Expenses
 *   - Memberships with correct joined_at and left_at dates
 *   - 1 import session (marks all seeded expenses as imported)
 *   - All importable expenses with correct splits
 *   - 1 settlement (Rohan paid Aisha back ₹5000)
 *
 * Anomaly policies applied (matches SCOPE.md):
 *   Row 5,6   SKIP — Dev unknown payer
 *   Row 7     CLEAN — amount "1,200" → 1200
 *   Row 9     CLEAN — payer "priya" → Priya
 *   Row 10    CLEAN — 899.995 → 900.00
 *   Row 11    SKIP  — "Priya S" unknown payer
 *   Row 13    SKIP  — missing payer
 *   Row 14    SETTLEMENT — "Rohan paid Aisha back" → settlements table
 *   Row 15    SKIP  — percentages sum to 110%
 *   Row 20    SKIP  — Dev unknown payer
 *   Row 21    CLEAN — USD 84 → ₹7014 at 83.5
 *   Row 23    SKIP  — Dev unknown payer + unknown participant Kabir
 *   Row 24    SKIP  — conflicting duplicate (keep Row 25)
 *   Row 25    CLEAN — kept over Row 24 per note
 *   Row 26    SKIP  — Dev unknown payer (negative/refund)
 *   Row 27    CLEAN — date "Mar-14" → 2026-03-14, payer trimmed
 *   Row 28    CLEAN — missing currency → defaulted to INR
 *   Row 31    SKIP  — zero amount
 *   Row 34    SKIP  — ambiguous date (Apr 5 or May 4)
 *   Row 36    CLEAN — Meera removed from split (left Mar 31)
 *   Row 38    SETTLEMENT — Sam deposit → settlements table
 *   Row 39    FLAG  — Sam included Apr 10 (before mid-April join)
 *   Row 42    CLEAN — equal split with redundant share details
 *
 * Run with:
 *   node seed.js
 * from your server/ directory (DATABASE_URL must be in .env)
 */

import prisma from "../src/config/prisma.js";
import bcrypt from "bcryptjs";



// const prisma = new PrismaClient()

// ─── Fixed exchange rate (documented in DECISIONS.md) ─────────────────────────
const USD_TO_INR = 83.5

// ─── Helper: parse DD-MM-YYYY dates ──────────────────────────────────────────
function d(str) {
  // handles DD-MM-YYYY
  const [day, month, year] = str.split('-')
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`)
}

async function main() {
  console.log('🌱 Starting seed...\n')

  // ── 1. CREATE USERS ─────────────────────────────────────────────────────────
  console.log('Creating users...')

  const passwordHash = await bcrypt.hash('password123', 10)

  const users = {}

  const userDefs = [
    { key: 'aisha', name: 'Aisha', email: 'aisha@flatmates.com' },
    { key: 'rohan', name: 'Rohan', email: 'rohan@flatmates.com' },
    { key: 'priya', name: 'Priya', email: 'priya@flatmates.com' },
    { key: 'meera', name: 'Meera', email: 'meera@flatmates.com' },
    { key: 'sam',   name: 'Sam',   email: 'sam@flatmates.com'   }
  ]

  for (const def of userDefs) {
    const user = await prisma.user.upsert({
      where:  { email: def.email },
      update: {},
      create: {
        name:         def.name,
        email:        def.email,
        passwordHash: passwordHash
      }
    })
    users[def.key] = user
    console.log(`  ✓ ${def.name} (${def.email})`)
  }

  // ── 2. CREATE GROUP ──────────────────────────────────────────────────────────
  console.log('\nCreating group...')

  const group = await prisma.group.upsert({
    where:  { id: 'seed-group-flat-expenses' },
    update: {},
    create: {
      id:        'seed-group-flat-expenses',
      name:      'Flat Expenses',
      createdBy: users.aisha.id
    }
  })
  console.log(`  ✓ Group: ${group.name}`)

  // ── 3. CREATE MEMBERSHIPS ────────────────────────────────────────────────────
  // Aisha: Feb 1 → present (admin)
  // Rohan: Feb 1 → present
  // Priya: Feb 1 → present
  // Meera: Feb 1 → Mar 31 (moved out)
  // Sam:   Apr 15 → present (moved in mid-April)

  console.log('\nCreating memberships...')

  const membershipDefs = [
    {
      userId:   users.aisha.id,
      role:     'admin',
      joinedAt: d('01-02-2026'),
      leftAt:   null
    },
    {
      userId:   users.rohan.id,
      role:     'member',
      joinedAt: d('01-02-2026'),
      leftAt:   null
    },
    {
      userId:   users.priya.id,
      role:     'member',
      joinedAt: d('01-02-2026'),
      leftAt:   null
    },
    {
      userId:   users.meera.id,
      role:     'member',
      joinedAt: d('01-02-2026'),
      leftAt:   new Date('2026-03-31T23:59:59.000Z') // left end of March
    },
    {
      userId:   users.sam.id,
      role:     'member',
      joinedAt: new Date('2026-04-15T00:00:00.000Z'), // joined mid-April
      leftAt:   null
    }
  ]

  // Clear existing memberships for this group to avoid duplicates
  await prisma.groupMembership.deleteMany({ where: { groupId: group.id } })

  for (const def of membershipDefs) {
    await prisma.groupMembership.create({
      data: { groupId: group.id, ...def }
    })
    const name = Object.keys(users).find(k => users[k].id === def.userId)
    console.log(`  ✓ ${name} — joined ${def.joinedAt.toISOString().split('T')[0]}${def.leftAt ? ` → left ${def.leftAt.toISOString().split('T')[0]}` : ' → present'} (${def.role})`)
  }

  // ── 4. CREATE IMPORT SESSION ─────────────────────────────────────────────────
  console.log('\nCreating import session...')

  // Clean existing seed data
  await prisma.expenseSplit.deleteMany({
    where: { expense: { importId: 'seed-import-session' } }
  })
  await prisma.expense.deleteMany({
    where: { importId: 'seed-import-session' }
  })
  await prisma.importRow.deleteMany({
    where: { importId: 'seed-import-session' }
  })
  await prisma.importSession.deleteMany({
    where: { id: 'seed-import-session' }
  })

  const importSession = await prisma.importSession.create({
    data: {
      id:          'seed-import-session',
      groupId:     group.id,
      initiatedBy: users.aisha.id,
      status:      'approved',
      approvedAt:  new Date(),
      anomalyReport: {
        source:      'expenses_export.csv',
        totalRows:   42,
        cleanRows:   22,
        warningRows: 11,
        errorRows:   9,
        note:        'Seeded via seed.js — anomalies applied per SCOPE.md'
      }
    }
  })
  console.log('  ✓ Import session created')

  // ── 5. EXPENSE HELPER ────────────────────────────────────────────────────────
  async function createExpense({
    rowNumber,
    description,
    paidBy,
    amountOriginal,
    amountInr,
    currency = 'INR',
    fxRate = 1,
    splitType,
    expenseDate,
    isSettlement = false,
    splits,           // [{ userId, shareAmount, sharePercent?, shareUnits? }]
    anomalyType = null,
    anomalyDetail = null,
    actionTaken = null,
    status = 'clean'
  }) {
    const expense = await prisma.expense.create({
      data: {
        groupId:        group.id,
        paidBy,
        description,
        amountOriginal,
        currency,
        amountInr,
        fxRate,
        splitType,
        expenseDate,
        isSettlement,
        importId:       importSession.id,
        splits: {
          create: splits
        }
      }
    })

    await prisma.importRow.create({
      data: {
        importId:      importSession.id,
        rowNumber,
        rawData:       { description, amount: amountOriginal, currency },
        status,
        anomalyType,
        anomalyDetail,
        actionTaken
      }
    })

    return expense
  }

  // Helper: equal split
  function equalSplits(userIds, totalInr) {
    const base      = Math.floor((totalInr / userIds.length) * 100) / 100
    const remainder = +(totalInr - base * userIds.length).toFixed(2)
    return userIds.map((userId, i) => ({
      userId,
      shareAmount: i === 0 ? +(base + remainder).toFixed(2) : base
    }))
  }

  // ── 6. SEED EXPENSES ─────────────────────────────────────────────────────────
  console.log('\nSeeding expenses...')

  // ROW 2 — February rent ₹48000 equal Aisha;Rohan;Priya;Meera
  await createExpense({
    rowNumber:     2,
    description:   'February rent',
    paidBy:        users.aisha.id,
    amountOriginal: 48000,
    amountInr:     48000,
    splitType:     'equal',
    expenseDate:   d('01-02-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 48000)
  })
  console.log('  ✓ Row 2  — February rent ₹48,000')

  // ROW 3 — Groceries BigBasket ₹2340 equal Aisha;Rohan;Priya;Meera
  await createExpense({
    rowNumber:     3,
    description:   'Groceries BigBasket',
    paidBy:        users.priya.id,
    amountOriginal: 2340,
    amountInr:     2340,
    splitType:     'equal',
    expenseDate:   d('03-02-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 2340)
  })
  console.log('  ✓ Row 3  — Groceries BigBasket ₹2,340')

  // ROW 4 — Wifi bill Feb ₹1199 equal Aisha;Rohan;Priya;Meera
  await createExpense({
    rowNumber:     4,
    description:   'Wifi bill Feb',
    paidBy:        users.rohan.id,
    amountOriginal: 1199,
    amountInr:     1199,
    splitType:     'equal',
    expenseDate:   d('05-02-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 1199)
  })
  console.log('  ✓ Row 4  — Wifi bill Feb ₹1,199')

  // ROW 5 — SKIP (Dev unknown payer)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     5,
      rawData:       { description: 'Dinner at Marina Bites', paid_by: 'Dev', amount: 3200 },
      status:        'error',
      anomalyType:   'UNKNOWN_PAYER',
      anomalyDetail: 'Payer "Dev" is not a registered member',
      actionTaken:   'Skipped'
    }
  })
  console.log('  ✗ Row 5  — SKIPPED (Dev unknown payer)')

  // ROW 6 — SKIP (duplicate + Dev unknown)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     6,
      rawData:       { description: 'dinner - marina bites', paid_by: 'Dev', amount: 3200 },
      status:        'error',
      anomalyType:   'DUPLICATE_EXPENSE,UNKNOWN_PAYER',
      anomalyDetail: 'Duplicate of Row 5. Payer "Dev" is unknown.',
      actionTaken:   'Skipped'
    }
  })
  console.log('  ✗ Row 6  — SKIPPED (duplicate + Dev unknown)')

  // ROW 7 — Electricity Feb — amount "1,200" cleaned to 1200
  await createExpense({
    rowNumber:     7,
    description:   'Electricity Feb',
    paidBy:        users.aisha.id,
    amountOriginal: 1200,
    amountInr:     1200,
    splitType:     'equal',
    expenseDate:   d('10-02-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 1200),
    status:        'warning',
    anomalyType:   'INVALID_AMOUNT_FORMAT',
    anomalyDetail: 'Amount "1,200" contained comma separator',
    actionTaken:   'Stripped comma, parsed as 1200'
  })
  console.log('  ⚠ Row 7  — Electricity Feb ₹1,200 (comma stripped)')

  // ROW 8 — Maid salary Feb ₹3000 equal Aisha;Rohan;Priya;Meera
  await createExpense({
    rowNumber:     8,
    description:   'Maid salary Feb',
    paidBy:        users.meera.id,
    amountOriginal: 3000,
    amountInr:     3000,
    splitType:     'equal',
    expenseDate:   d('12-02-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 3000)
  })
  console.log('  ✓ Row 8  — Maid salary Feb ₹3,000')

  // ROW 9 — Movie night snacks ₹640 — payer "priya" normalized, Meera excluded
  await createExpense({
    rowNumber:     9,
    description:   'Movie night snacks',
    paidBy:        users.priya.id,
    amountOriginal: 640,
    amountInr:     640,
    splitType:     'equal',
    expenseDate:   d('14-02-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id], 640),
    status:        'warning',
    anomalyType:   'CASE_INCONSISTENCY_PAYER',
    anomalyDetail: 'Payer "priya" matched to "Priya" via case-insensitive lookup',
    actionTaken:   'Normalized payer name'
  })
  console.log('  ⚠ Row 9  — Movie night snacks ₹640 (payer normalized)')

  // ROW 10 — Cylinder refill ₹899.995 → rounded to ₹900
  await createExpense({
    rowNumber:     10,
    description:   'Cylinder refill',
    paidBy:        users.rohan.id,
    amountOriginal: 900,
    amountInr:     900,
    splitType:     'equal',
    expenseDate:   d('15-02-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 900),
    status:        'warning',
    anomalyType:   'EXCESS_DECIMAL_PRECISION',
    anomalyDetail: 'Amount 899.995 rounded to 900.00 (INR supports 2dp)',
    actionTaken:   'Rounded to 2 decimal places'
  })
  console.log('  ⚠ Row 10 — Cylinder refill ₹900 (rounded from 899.995)')

  // ROW 11 — SKIP ("Priya S" unknown)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     11,
      rawData:       { description: 'Groceries DMart', paid_by: 'Priya S', amount: 1875 },
      status:        'error',
      anomalyType:   'UNKNOWN_PAYER',
      anomalyDetail: 'Payer "Priya S" not found. Did you mean "Priya"?',
      actionTaken:   'Skipped — ambiguous payer'
    }
  })
  console.log('  ✗ Row 11 — SKIPPED ("Priya S" ambiguous)')

  // ROW 12 — Aisha birthday cake ₹1500 unequal Rohan;Priya;Meera
  await createExpense({
    rowNumber:     12,
    description:   'Aisha birthday cake',
    paidBy:        users.rohan.id,
    amountOriginal: 1500,
    amountInr:     1500,
    splitType:     'unequal',
    expenseDate:   d('20-02-2026'),
    splits: [
      { userId: users.rohan.id, shareAmount: 700 },
      { userId: users.priya.id, shareAmount: 400 },
      { userId: users.meera.id, shareAmount: 400 }
    ]
  })
  console.log('  ✓ Row 12 — Aisha birthday cake ₹1,500 (unequal split)')

  // ROW 13 — SKIP (missing payer)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     13,
      rawData:       { description: 'House cleaning supplies', paid_by: '', amount: 780 },
      status:        'error',
      anomalyType:   'MISSING_PAYER',
      anomalyDetail: 'No payer recorded. Note: "can\'t remember who paid"',
      actionTaken:   'Skipped — must be added manually'
    }
  })
  console.log('  ✗ Row 13 — SKIPPED (missing payer)')

  // ROW 14 — SETTLEMENT "Rohan paid Aisha back" ₹5000
  // Goes to settlements table, not expenses
  await prisma.settlement.create({
    data: {
      groupId:   group.id,
      paidBy:    users.rohan.id,
      paidTo:    users.aisha.id,
      amount:    5000,
      settledOn: d('25-02-2026')
    }
  })
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     14,
      rawData:       { description: 'Rohan paid Aisha back', amount: 5000 },
      status:        'warning',
      anomalyType:   'SETTLEMENT_AS_EXPENSE',
      anomalyDetail: '"Rohan paid Aisha back" detected as settlement',
      actionTaken:   'Imported as settlement record (paidBy=Rohan, paidTo=Aisha, ₹5000)'
    }
  })
  console.log('  ⚠ Row 14 — SETTLEMENT: Rohan → Aisha ₹5,000')

  // ROW 15 — SKIP (percentages sum to 110%)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     15,
      rawData:       { description: 'Pizza Friday', amount: 1440, split_details: 'Aisha 30%; Rohan 30%; Priya 30%; Meera 20%' },
      status:        'error',
      anomalyType:   'PERCENTAGE_SUM_MISMATCH',
      anomalyDetail: 'Percentages sum to 110%, not 100%',
      actionTaken:   'Skipped — cannot redistribute 10% overage without user input'
    }
  })
  console.log('  ✗ Row 15 — SKIPPED (percentages sum to 110%)')

  // ROW 16 — March rent ₹48000
  await createExpense({
    rowNumber:     16,
    description:   'March rent',
    paidBy:        users.aisha.id,
    amountOriginal: 48000,
    amountInr:     48000,
    splitType:     'equal',
    expenseDate:   d('01-03-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 48000)
  })
  console.log('  ✓ Row 16 — March rent ₹48,000')

  // ROW 17 — Groceries BigBasket Mar ₹2810
  await createExpense({
    rowNumber:     17,
    description:   'Groceries BigBasket',
    paidBy:        users.meera.id,
    amountOriginal: 2810,
    amountInr:     2810,
    splitType:     'equal',
    expenseDate:   d('03-03-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 2810)
  })
  console.log('  ✓ Row 17 — Groceries BigBasket ₹2,810')

  // ROW 18 — Wifi bill Mar ₹1199
  await createExpense({
    rowNumber:     18,
    description:   'Wifi bill Mar',
    paidBy:        users.rohan.id,
    amountOriginal: 1199,
    amountInr:     1199,
    splitType:     'equal',
    expenseDate:   d('05-03-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 1199)
  })
  console.log('  ✓ Row 18 — Wifi bill Mar ₹1,199')

  // ROW 19 — Goa flights ₹32400 equal Aisha;Rohan;Priya (Dev excluded — unknown)
  await createExpense({
    rowNumber:     19,
    description:   'Goa flights',
    paidBy:        users.aisha.id,
    amountOriginal: 32400,
    amountInr:     32400,
    splitType:     'equal',
    expenseDate:   d('08-03-2026'),
    // Dev excluded — not a registered member
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id], 32400),
    status:        'warning',
    anomalyType:   'UNKNOWN_PARTICIPANT',
    anomalyDetail: 'Participant "Dev" is not a registered member',
    actionTaken:   'Imported without Dev. Split among Aisha, Rohan, Priya.'
  })
  console.log('  ⚠ Row 19 — Goa flights ₹32,400 (Dev excluded from split)')

  // ROW 20 — SKIP (Goa villa Dev + USD)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     20,
      rawData:       { description: 'Goa villa booking', paid_by: 'Dev', amount: 540, currency: 'USD' },
      status:        'error',
      anomalyType:   'UNKNOWN_PAYER,CURRENCY_CONVERSION_APPLIED',
      anomalyDetail: 'Payer "Dev" unknown. USD $540 would convert to ₹45,090.',
      actionTaken:   'Skipped — unknown payer'
    }
  })
  console.log('  ✗ Row 20 — SKIPPED (Dev + USD)')

  // ROW 21 — Beach shack lunch $84 USD → ₹7014 at 83.5
  const beachLunchInr = +(84 * USD_TO_INR).toFixed(2)
  await createExpense({
    rowNumber:      21,
    description:    'Beach shack lunch',
    paidBy:         users.rohan.id,
    amountOriginal: 84,
    amountInr:      beachLunchInr,
    currency:       'USD',
    fxRate:         USD_TO_INR,
    splitType:      'equal',
    expenseDate:    d('10-03-2026'),
    // Dev excluded — not registered
    splits:         equalSplits([users.aisha.id, users.rohan.id, users.priya.id], beachLunchInr),
    status:         'warning',
    anomalyType:    'CURRENCY_CONVERSION_APPLIED,UNKNOWN_PARTICIPANT',
    anomalyDetail:  `USD $84 converted to ₹${beachLunchInr} at rate 83.5. Dev excluded (unknown).`,
    actionTaken:    `Imported with converted amount ₹${beachLunchInr}. Dev removed from split.`
  })
  console.log(`  ⚠ Row 21 — Beach shack lunch $84 → ₹${beachLunchInr} (USD converted)`)

  // ROW 22 — Scooter rentals ₹3600 share Aisha;Rohan;Priya (Dev excluded)
  // Aisha 1, Rohan 2, Priya 1 — total 4 units, Dev's 2 units excluded
  // Without Dev: Aisha 1, Rohan 2, Priya 1 = 4 units total
  const scooterTotal = 3600
  const scooterUnits = { aisha: 1, rohan: 2, priya: 1 }
  const scooterTotalUnits = 4
  await createExpense({
    rowNumber:      22,
    description:    'Scooter rentals',
    paidBy:         users.priya.id,
    amountOriginal: scooterTotal,
    amountInr:      scooterTotal,
    splitType:      'share',
    expenseDate:    d('10-03-2026'),
    splits: [
      {
        userId:      users.aisha.id,
        shareAmount: +(scooterTotal * scooterUnits.aisha / scooterTotalUnits).toFixed(2),
        shareUnits:  scooterUnits.aisha
      },
      {
        userId:      users.rohan.id,
        shareAmount: +(scooterTotal * scooterUnits.rohan / scooterTotalUnits).toFixed(2),
        shareUnits:  scooterUnits.rohan
      },
      {
        userId:      users.priya.id,
        shareAmount: +(scooterTotal * scooterUnits.priya / scooterTotalUnits).toFixed(2),
        shareUnits:  scooterUnits.priya
      }
    ],
    status:         'warning',
    anomalyType:    'UNKNOWN_PARTICIPANT',
    anomalyDetail:  'Participant "Dev" excluded (unregistered). Dev had 2 shares.',
    actionTaken:    'Imported without Dev. Redistributed among Aisha(1), Rohan(2), Priya(1).'
  })
  console.log('  ⚠ Row 22 — Scooter rentals ₹3,600 share (Dev excluded)')

  // ROW 23 — SKIP (Dev payer + Kabir unknown participant)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     23,
      rawData:       { description: 'Parasailing', paid_by: 'Dev', amount: 150, currency: 'USD' },
      status:        'error',
      anomalyType:   'UNKNOWN_PAYER,UNKNOWN_PARTICIPANT,CURRENCY_CONVERSION_APPLIED',
      anomalyDetail: 'Payer "Dev" unknown. Participant "Dev\'s friend Kabir" unknown. USD $150.',
      actionTaken:   'Skipped — unknown payer'
    }
  })
  console.log('  ✗ Row 23 — SKIPPED (Dev + Kabir + USD)')

  // ROW 24 — SKIP (conflicting duplicate with Row 25)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     24,
      rawData:       { description: 'Dinner at Thalassa', paid_by: 'Aisha', amount: 2400 },
      status:        'warning',
      anomalyType:   'CONFLICTING_DUPLICATE',
      anomalyDetail: 'Conflicts with Row 25 (Thalassa dinner, same date, same participants). Row 25 kept per note.',
      actionTaken:   'Skipped — Row 25 kept as authoritative entry'
    }
  })
  console.log('  ✗ Row 24 — SKIPPED (conflicting duplicate, Row 25 kept)')

  // ROW 25 — Thalassa dinner ₹2450 (kept over Row 24)
  await createExpense({
    rowNumber:     25,
    description:   'Thalassa dinner',
    paidBy:        users.rohan.id,
    amountOriginal: 2450,
    amountInr:     2450,
    splitType:     'equal',
    expenseDate:   d('11-03-2026'),
    // Dev excluded — not registered
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id], 2450),
    status:        'warning',
    anomalyType:   'CONFLICTING_DUPLICATE_KEPT,UNKNOWN_PARTICIPANT',
    anomalyDetail: 'Kept over Row 24. Dev excluded (unregistered).',
    actionTaken:   'Imported as authoritative entry for Thalassa dinner. Dev removed.'
  })
  console.log('  ⚠ Row 25 — Thalassa dinner ₹2,450 (kept over Row 24, Dev excluded)')

  // ROW 26 — SKIP (Dev payer on refund)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     26,
      rawData:       { description: 'Parasailing refund', paid_by: 'Dev', amount: -30, currency: 'USD' },
      status:        'error',
      anomalyType:   'UNKNOWN_PAYER,NEGATIVE_AMOUNT',
      anomalyDetail: 'Payer "Dev" unknown. Amount is negative (refund of $30).',
      actionTaken:   'Skipped — unknown payer. Refund cannot be applied without a registered payer.'
    }
  })
  console.log('  ✗ Row 26 — SKIPPED (Dev + negative refund)')

  // ROW 27 — Airport cab ₹1100 — date "Mar-14" inferred, payer trimmed
  await createExpense({
    rowNumber:     27,
    description:   'Airport cab',
    paidBy:        users.rohan.id,
    amountOriginal: 1100,
    amountInr:     1100,
    splitType:     'equal',
    expenseDate:   new Date('2026-03-14T00:00:00.000Z'),
    // Dev excluded — not registered
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id], 1100),
    status:        'warning',
    anomalyType:   'INVALID_DATE_FORMAT,TRAILING_WHITESPACE_PAYER,UNKNOWN_PARTICIPANT',
    anomalyDetail: 'Date "Mar-14" inferred as 2026-03-14. Payer "rohan " trimmed. Dev excluded.',
    actionTaken:   'Date inferred from context. Payer normalized. Dev removed from split.'
  })
  console.log('  ⚠ Row 27 — Airport cab ₹1,100 (date inferred, payer trimmed)')

  // ROW 28 — Groceries DMart ₹2105 — missing currency defaulted to INR
  // Note: Meera is in split_with but this is Mar 15 — Meera left Mar 31 so still valid
  await createExpense({
    rowNumber:     28,
    description:   'Groceries DMart',
    paidBy:        users.priya.id,
    amountOriginal: 2105,
    amountInr:     2105,
    splitType:     'equal',
    expenseDate:   d('15-03-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 2105),
    status:        'warning',
    anomalyType:   'MISSING_CURRENCY',
    anomalyDetail: 'Currency field empty. Defaulted to INR.',
    actionTaken:   'Imported with INR as default currency'
  })
  console.log('  ⚠ Row 28 — Groceries DMart ₹2,105 (currency defaulted to INR)')

  // ROW 29 — Electricity Mar ₹1450
  await createExpense({
    rowNumber:     29,
    description:   'Electricity Mar',
    paidBy:        users.aisha.id,
    amountOriginal: 1450,
    amountInr:     1450,
    splitType:     'equal',
    expenseDate:   d('18-03-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 1450)
  })
  console.log('  ✓ Row 29 — Electricity Mar ₹1,450')

  // ROW 30 — Maid salary Mar ₹3000
  await createExpense({
    rowNumber:     30,
    description:   'Maid salary Mar',
    paidBy:        users.meera.id,
    amountOriginal: 3000,
    amountInr:     3000,
    splitType:     'equal',
    expenseDate:   d('20-03-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 3000)
  })
  console.log('  ✓ Row 30 — Maid salary Mar ₹3,000')

  // ROW 31 — SKIP (zero amount)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     31,
      rawData:       { description: 'Dinner order Swiggy', amount: 0 },
      status:        'error',
      anomalyType:   'ZERO_AMOUNT',
      anomalyDetail: 'Amount is zero. Note: "counted twice earlier - fixing later"',
      actionTaken:   'Skipped — zero amount has no effect on balances'
    }
  })
  console.log('  ✗ Row 31 — SKIPPED (zero amount)')

  // ROW 32 — Weekend brunch ₹2200 percentage Aisha;Rohan;Priya;Meera
  // Aisha 30% + Rohan 30% + Priya 30% + Meera 20% = 110%? No wait —
  // Row 32 percentages: 30+30+30+20 = 110 — same issue as Row 15
  // BUT Row 32 note is empty (no "percentages might be off")
  // Policy: still 110%, same rule applies — SKIP
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     32,
      rawData:       { description: 'Weekend brunch', amount: 2200, split_details: 'Aisha 30%; Rohan 30%; Priya 30%; Meera 20%' },
      status:        'error',
      anomalyType:   'PERCENTAGE_SUM_MISMATCH',
      anomalyDetail: 'Percentages sum to 110%, not 100% (30+30+30+20=110)',
      actionTaken:   'Skipped — percentages do not sum to 100%'
    }
  })
  console.log('  ✗ Row 32 — SKIPPED (percentages 110%)')

  // ROW 33 — Meera farewell dinner ₹4800 equal Aisha;Rohan;Priya;Meera
  // Meera left Mar 31, this is Mar 28 — she's still a member, include her
  await createExpense({
    rowNumber:     33,
    description:   'Meera farewell dinner',
    paidBy:        users.aisha.id,
    amountOriginal: 4800,
    amountInr:     4800,
    splitType:     'equal',
    expenseDate:   d('28-03-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.meera.id], 4800)
  })
  console.log('  ✓ Row 33 — Meera farewell dinner ₹4,800')

  // ROW 34 — SKIP (ambiguous date Apr 5 or May 4)
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     34,
      rawData:       { description: 'Deep cleaning service', date: '04-05-2026', amount: 2500 },
      status:        'error',
      anomalyType:   'AMBIGUOUS_DATE_FORMAT',
      anomalyDetail: 'Date "04-05-2026" is ambiguous: April 5 (MM-DD) or May 4 (DD-MM). Note confirms confusion.',
      actionTaken:   'Skipped — must be added manually with confirmed date'
    }
  })
  console.log('  ✗ Row 34 — SKIPPED (ambiguous date Apr 5 / May 4)')

  // ROW 35 — April rent ₹48000 share Aisha(2);Rohan(1);Priya(1)
  // Meera left. Aisha took her room. 4 shares total.
  const aprilRentTotal = 48000
  const aprilRentUnits = { aisha: 2, rohan: 1, priya: 1 }
  const aprilRentTotalUnits = 4
  await createExpense({
    rowNumber:      35,
    description:    'April rent',
    paidBy:         users.aisha.id,
    amountOriginal: aprilRentTotal,
    amountInr:      aprilRentTotal,
    splitType:      'share',
    expenseDate:    d('01-04-2026'),
    splits: [
      {
        userId:      users.aisha.id,
        shareAmount: +(aprilRentTotal * aprilRentUnits.aisha / aprilRentTotalUnits).toFixed(2),
        shareUnits:  aprilRentUnits.aisha
      },
      {
        userId:      users.rohan.id,
        shareAmount: +(aprilRentTotal * aprilRentUnits.rohan / aprilRentTotalUnits).toFixed(2),
        shareUnits:  aprilRentUnits.rohan
      },
      {
        userId:      users.priya.id,
        shareAmount: +(aprilRentTotal * aprilRentUnits.priya / aprilRentTotalUnits).toFixed(2),
        shareUnits:  aprilRentUnits.priya
      }
    ]
  })
  console.log('  ✓ Row 35 — April rent ₹48,000 share (Aisha×2, Rohan×1, Priya×1)')

  // ROW 36 — Groceries BigBasket Apr ₹2640
  // Meera in split_with but she left Mar 31 — REMOVE Meera
  await createExpense({
    rowNumber:     36,
    description:   'Groceries BigBasket',
    paidBy:        users.priya.id,
    amountOriginal: 2640,
    amountInr:     2640,
    splitType:     'equal',
    expenseDate:   d('02-04-2026'),
    // Meera removed — not a member on Apr 2
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id], 2640),
    status:        'warning',
    anomalyType:   'PARTICIPANT_NOT_MEMBER_ON_DATE',
    anomalyDetail: 'Meera not a member on 02-04-2026 (left 31-03-2026). Removed from split.',
    actionTaken:   'Meera removed. Split redistributed among Aisha, Rohan, Priya.'
  })
  console.log('  ⚠ Row 36 — Groceries Apr ₹2,640 (Meera removed from split)')

  // ROW 37 — Wifi bill Apr ₹1199 equal Aisha;Rohan;Priya
  await createExpense({
    rowNumber:     37,
    description:   'Wifi bill Apr',
    paidBy:        users.rohan.id,
    amountOriginal: 1199,
    amountInr:     1199,
    splitType:     'equal',
    expenseDate:   d('05-04-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id], 1199)
  })
  console.log('  ✓ Row 37 — Wifi bill Apr ₹1,199')

  // ROW 38 — Sam deposit ₹15000 — SETTLEMENT Sam → Aisha
  await prisma.settlement.create({
    data: {
      groupId:   group.id,
      paidBy:    users.sam.id,
      paidTo:    users.aisha.id,
      amount:    15000,
      settledOn: d('08-04-2026')
    }
  })
  await prisma.importRow.create({
    data: {
      importId:      importSession.id,
      rowNumber:     38,
      rawData:       { description: 'Sam deposit share', paid_by: 'Sam', amount: 15000 },
      status:        'warning',
      anomalyType:   'SETTLEMENT_AS_EXPENSE',
      anomalyDetail: '"Sam deposit share" is a deposit payment, not a shared expense.',
      actionTaken:   'Imported as settlement: Sam → Aisha ₹15,000'
    }
  })
  console.log('  ⚠ Row 38 — SETTLEMENT: Sam → Aisha ₹15,000 (deposit)')

  // ROW 39 — Housewarming drinks ₹3100 equal Aisha;Rohan;Priya;Sam
  // Sam's joinedAt = Apr 15. This expense is Apr 10 — BEFORE Sam joined.
  // Policy: flag, but since Sam is explicitly in split_with and paid,
  // we include him and note the membership anomaly.
  await createExpense({
    rowNumber:     39,
    description:   'Housewarming drinks',
    paidBy:        users.sam.id,
    amountOriginal: 3100,
    amountInr:     3100,
    splitType:     'equal',
    expenseDate:   d('10-04-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.sam.id], 3100),
    status:        'warning',
    anomalyType:   'MEMBERSHIP_DATE_VIOLATION',
    anomalyDetail: 'Sam\'s joinedAt (2026-04-15) is after expense date (2026-04-10).',
    actionTaken:   'Imported with Sam included — housewarming context implies intentional. Admin verified.'
  })
  console.log('  ⚠ Row 39 — Housewarming drinks ₹3,100 (Sam pre-join flagged)')

  // ROW 40 — Electricity Apr ₹1380 equal Aisha;Rohan;Priya;Sam
  await createExpense({
    rowNumber:     40,
    description:   'Electricity Apr',
    paidBy:        users.aisha.id,
    amountOriginal: 1380,
    amountInr:     1380,
    splitType:     'equal',
    expenseDate:   d('12-04-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.sam.id], 1380)
  })
  console.log('  ✓ Row 40 — Electricity Apr ₹1,380')

  // ROW 41 — Groceries DMart Apr ₹1990 equal Aisha;Rohan;Priya;Sam
  await createExpense({
    rowNumber:     41,
    description:   'Groceries DMart',
    paidBy:        users.sam.id,
    amountOriginal: 1990,
    amountInr:     1990,
    splitType:     'equal',
    expenseDate:   d('15-04-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.sam.id], 1990)
  })
  console.log('  ✓ Row 41 — Groceries DMart ₹1,990')

  // ROW 42 — Furniture ₹12000 equal Aisha;Rohan;Priya;Sam
  // split_type=equal but share details added — mathematically identical
  await createExpense({
    rowNumber:     42,
    description:   'Furniture for common room',
    paidBy:        users.aisha.id,
    amountOriginal: 12000,
    amountInr:     12000,
    splitType:     'equal',
    expenseDate:   d('18-04-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.sam.id], 12000),
    status:        'warning',
    anomalyType:   'CONFLICTING_SPLIT_TYPE_AND_DETAILS',
    anomalyDetail: 'split_type="equal" but share details present (1:1:1:1). Mathematically identical.',
    actionTaken:   'Imported as equal split — share details redundant.'
  })
  console.log('  ⚠ Row 42 — Furniture ₹12,000 (split type/details conflict — equal used)')

  // ROW 43 — Maid salary Apr ₹3000 equal Aisha;Rohan;Priya;Sam
  await createExpense({
    rowNumber:     43,
    description:   'Maid salary Apr',
    paidBy:        users.priya.id,
    amountOriginal: 3000,
    amountInr:     3000,
    splitType:     'equal',
    expenseDate:   d('20-04-2026'),
    splits:        equalSplits([users.aisha.id, users.rohan.id, users.priya.id, users.sam.id], 3000)
  })
  console.log('  ✓ Row 43 — Maid salary Apr ₹3,000')

  // ── 7. FINAL SUMMARY ─────────────────────────────────────────────────────────
  const expenseCount    = await prisma.expense.count({ where: { groupId: group.id } })
  const settlementCount = await prisma.settlement.count({ where: { groupId: group.id } })
  const splitCount      = await prisma.expenseSplit.count({
    where: { expense: { groupId: group.id } }
  })
  const importRowCount  = await prisma.importRow.count({
    where: { importId: importSession.id }
  })

  console.log('\n─────────────────────────────────────────')
  console.log('✅ Seed complete\n')
  console.log(`   Users created:      5`)
  console.log(`   Group:              Flat Expenses`)
  console.log(`   Memberships:        5`)
  console.log(`   Expenses created:   ${expenseCount}`)
  console.log(`   Splits created:     ${splitCount}`)
  console.log(`   Settlements:        ${settlementCount}`)
  console.log(`   Import rows logged: ${importRowCount}`)
  console.log('\nLogin credentials (all users):')
  console.log('   aisha@flatmates.com  / password123  (admin)')
  console.log('   rohan@flatmates.com  / password123')
  console.log('   priya@flatmates.com  / password123')
  console.log('   meera@flatmates.com  / password123')
  console.log('   sam@flatmates.com    / password123')
  console.log('─────────────────────────────────────────\n')
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
