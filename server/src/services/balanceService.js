import prisma from '../config/prisma.js'
import { simplifyDebts } from './debtSimplifier.js'

// use shared prisma client from config/prisma.js

/**
 * Calculates net balance for every member of a group.
 *
 * For each user:
 *   net += amount_inr for every expense they paid
 *         (only if they were a member on the expense date)
 *   net -= share_amount for every split assigned to them
 *         (only if they were a member on the expense date)
 *   net += amount for every settlement they paid
 *   net -= amount for every settlement they received
 *
 * Positive net  → others owe this person
 * Negative net  → this person owes others
 *
 * Returns:
 *   balances     — net per user
 *   transactions — simplified debt list (who pays whom)
 *   expenseBreakdown — per user, which expenses contribute (Rohan's requirement)
 */
async function calculateGroupBalances(groupId) {
  // ── 1. Load all data we need ──────────────────────────────────────────────

  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      isSettlement: false   // settlements are handled separately
    },
    include: {
      splits: true,
      payer: { select: { id: true, name: true } }
    }
  })

  const settlements = await prisma.settlement.findMany({
    where: { groupId }
  })

  const memberships = await prisma.groupMembership.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true } } }
  })

  // ── 2. Build a map of all users who ever belonged to this group ───────────

  const userMap = {}
  for (const m of memberships) {
    if (!userMap[m.userId]) {
      userMap[m.userId] = {
        id: m.userId,
        name: m.user.name,
        email: m.user.email
      }
    }
  }

  // ── 3. Initialize balance and breakdown trackers ──────────────────────────

  const balances = {}          // userId → net amount (Decimal as number)
  const breakdown = {}         // userId → array of contributing expense entries

  for (const userId of Object.keys(userMap)) {
    balances[userId] = 0
    breakdown[userId] = []
  }

  // ── 4. Process each expense ───────────────────────────────────────────────

  for (const expense of expenses) {
    const expenseDate = new Date(expense.expenseDate)

    // Who was active on this expense's date?
    const activeMemberIds = getActiveMemberIdsOnDate(memberships, expenseDate)

    // 4a. Credit the payer — but only if they were active on that date
    if (activeMemberIds.has(expense.paidBy)) {
      const amount = toNumber(expense.amountInr)
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) + amount

      breakdown[expense.paidBy] = breakdown[expense.paidBy] || []
      breakdown[expense.paidBy].push({
        expenseId:   expense.id,
        description: expense.description,
        date:        expense.expenseDate,
        role:        'paid',
        amount:      +amount.toFixed(2)
      })
    }

    // 4b. Debit each split — only if that person was active on the expense date
    for (const split of expense.splits) {
      if (!activeMemberIds.has(split.userId)) continue

      const share = toNumber(split.shareAmount)
      balances[split.userId] = (balances[split.userId] || 0) - share

      breakdown[split.userId] = breakdown[split.userId] || []
      breakdown[split.userId].push({
        expenseId:   expense.id,
        description: expense.description,
        date:        expense.expenseDate,
        role:        'owes',
        amount:      -share.toFixed(2)
      })
    }
  }

  // ── 5. Process settlements ────────────────────────────────────────────────

  for (const s of settlements) {
    const amount = toNumber(s.amount)

    // Person who paid reduces what they owe (net goes up)
    if (balances[s.paidBy] !== undefined) {
      balances[s.paidBy] = (balances[s.paidBy] || 0) + amount
    }

    // Person who received reduces what others owe them (net goes down)
    if (balances[s.paidTo] !== undefined) {
      balances[s.paidTo] = (balances[s.paidTo] || 0) - amount
    }
  }

  // ── 6. Round to 2 decimal places ─────────────────────────────────────────
  // Rounding happens ONCE here, at the final output stage.
  // Never round intermediate values — accumulate full precision first.

  const roundedBalances = {}
  for (const [userId, net] of Object.entries(balances)) {
    roundedBalances[userId] = {
      user:    userMap[userId],
      net:     +net.toFixed(2),
      // Positive = owed money, Negative = owes money
      summary: net > 0.005
        ? `${userMap[userId]?.name} is owed ₹${net.toFixed(2)}`
        : net < -0.005
          ? `${userMap[userId]?.name} owes ₹${Math.abs(net).toFixed(2)}`
          : `${userMap[userId]?.name} is settled up`
    }
  }

  // ── 7. Simplify debts into minimum transactions ───────────────────────────

  const transactions = simplifyDebts(roundedBalances, userMap)

  return {
    balances:          roundedBalances,
    transactions,      // Aisha's requirement: who pays whom
    expenseBreakdown:  breakdown  // Rohan's requirement: trace per expense
  }
}

// ─── HELPER: active members on a date (in-memory, no extra DB call) ──────────
// Uses the memberships already loaded above.
// This avoids N+1 queries — we load memberships once, check in memory per expense.

function getActiveMemberIdsOnDate(memberships, date) {
  const active = new Set()
  for (const m of memberships) {
    const joined = new Date(m.joinedAt)
    const left   = m.leftAt ? new Date(m.leftAt) : null

    if (joined <= date && (left === null || left > date)) {
      active.add(m.userId)
    }
  }
  return active
}

// ─── HELPER: Prisma Decimal → JS number ──────────────────────────────────────
// Prisma returns Decimal objects, not native JS numbers.
// Always convert before arithmetic or you get object concatenation bugs.

function toNumber(decimal) {
  return parseFloat(decimal.toString())
}

export { calculateGroupBalances }