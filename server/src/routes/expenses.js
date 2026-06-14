import { getActiveMembersOnDate, wasMemberOnDate } from '../utils/membershipUtils.js'

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import authMiddleware from '../middleware/auth.js'
import { convertToInr } from '../utils/currencyConverter.js'
import express from 'express'

const router = express.Router()
const connectionString = `${globalThis.process?.env?.DATABASE_URL || ''}`
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

router.use(authMiddleware)

// ─── POST /api/expenses/:groupId ──────────────────────────────────────────────
// Create a new expense manually (not via import).
// Validates membership, builds splits, writes atomically.

router.post('/:groupId', async (req, res) => {
  const { groupId } = req.params
  const {
    description,
    amount,
    currency = 'INR',
    splitType = 'equal',
    expenseDate,
    paidBy,
    participants  // array of { userId, share?, percent?, units? }
  } = req.body

  // ── Validate required fields ───────────────────────────────────────────────
  if (!description?.trim()) {
    return res.status(400).json({ error: 'description is required' })
  }
  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'valid amount is required' })
  }
  if (!expenseDate) {
    return res.status(400).json({ error: 'expenseDate is required' })
  }
  if (!paidBy) {
    return res.status(400).json({ error: 'paidBy is required' })
  }

  const date = new Date(expenseDate)
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: 'expenseDate is not a valid date' })
  }

  // ── Confirm requester is active member ────────────────────────────────────
  const requesterMembership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!requesterMembership) {
    return res.status(403).json({ error: 'Not an active member of this group' })
  }

  // ── Confirm payer was a member on the expense date ────────────────────────
  const payerWasMember = await wasMemberOnDate(groupId, paidBy, date)
  if (!payerWasMember) {
    return res.status(400).json({
      error: `Payer was not a member of this group on ${expenseDate}`
    })
  }

  // ── Currency conversion ───────────────────────────────────────────────────
  const rawAmount = parseFloat(amount)
  const conversion = convertToInr(rawAmount, currency)
  if (!conversion.success) {
    return res.status(400).json({ error: conversion.error })
  }

  // ── Resolve participants ───────────────────────────────────────────────────
  // If no participants provided, use all members active on expense date
  let resolvedParticipants = participants

  if (!resolvedParticipants || resolvedParticipants.length === 0) {
    const activeMembers = await getActiveMembersOnDate(groupId, date)
    resolvedParticipants = activeMembers.map(m => ({ userId: m.id }))
  }

  // Validate every participant was a member on the expense date
  for (const p of resolvedParticipants) {
    const wasMember = await wasMemberOnDate(groupId, p.userId, date)
    if (!wasMember) {
      return res.status(400).json({
        error: `User ${p.userId} was not a member on ${expenseDate}`
      })
    }
  }

  // ── Build splits ──────────────────────────────────────────────────────────
  const splits = buildSplits(
    splitType,
    conversion.amountInr,
    resolvedParticipants
  )

  if (!splits || splits.error) {
    return res.status(400).json({ error: splits?.error || 'Invalid split configuration' })
  }

  // ── Write expense + splits atomically ─────────────────────────────────────
  try {
    const expense = await prisma.expense.create({
      data: {
        groupId,
        paidBy,
        description:     description.trim(),
        amountOriginal:  rawAmount,
        currency:        currency.toUpperCase(),
        amountInr:       conversion.amountInr,
        fxRate:          conversion.fxRate,
        splitType:       normalizeSplitType(splitType),
        expenseDate:     date,
        isSettlement:    false,
        splits: {
          create: splits
        }
      },
      include: {
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        payer: { select: { id: true, name: true, email: true } }
      }
    })

    res.status(201).json({ expense })
  } catch (err) {
    console.error('Create expense error:', err)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// ─── GET /api/expenses/:groupId ───────────────────────────────────────────────
// List all expenses for a group.
// Supports optional filters: ?from=date&to=date&paidBy=userId

router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params
  const { from, to, paidBy } = req.query

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  try {
    const where = {
      groupId,
      isSettlement: false
    }

    if (from || to) {
      where.expenseDate = {}
      if (from) where.expenseDate.gte = new Date(from)
      if (to)   where.expenseDate.lte = new Date(to)
    }

    if (paidBy) where.paidBy = paidBy

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        payer:  { select: { id: true, name: true, email: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { expenseDate: 'desc' }
    })

    res.json({ expenses })
  } catch (err) {
    console.error('List expenses error:', err)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// ─── GET /api/expenses/:groupId/:expenseId ────────────────────────────────────
// Get a single expense with full split breakdown.
// This is Rohan's drill-down view.

router.get('/:groupId/:expenseId', async (req, res) => {
  const { groupId, expenseId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  try {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, groupId },
      include: {
        payer:  { select: { id: true, name: true, email: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        importSession: {
          select: { id: true, createdAt: true, status: true }
        }
      }
    })

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    res.json({ expense })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense' })
  }
})

// ─── PATCH /api/expenses/:groupId/:expenseId ──────────────────────────────────
// Edit an expense. Only the creator or a group admin can edit.
// Deletes old splits and rebuilds them — atomic via transaction.

router.patch('/:groupId/:expenseId', async (req, res) => {
  const { groupId, expenseId } = req.params
  const {
    description,
    amount,
    currency,
    splitType,
    expenseDate,
    participants
  } = req.body

  // Load expense
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, groupId }
  })
  if (!existing) {
    return res.status(404).json({ error: 'Expense not found' })
  }

  // Only creator or admin can edit
  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  const isAdmin   = membership.role === 'admin'
  const isCreator = existing.paidBy === req.user.id

  if (!isAdmin && !isCreator) {
    return res.status(403).json({
      error: 'Only the expense creator or a group admin can edit this expense'
    })
  }

  try {
    const newAmount     = amount     ? parseFloat(amount)    : toNumber(existing.amountOriginal)
    const newCurrency   = currency   || existing.currency
    const newSplitType  = splitType  || existing.splitType
    const newDate       = expenseDate ? new Date(expenseDate) : existing.expenseDate
    const newDesc       = description?.trim() || existing.description

    const conversion = convertToInr(newAmount, newCurrency)
    if (!conversion.success) {
      return res.status(400).json({ error: conversion.error })
    }

    // Resolve participants for new splits
    let resolvedParticipants = participants
    if (!resolvedParticipants || resolvedParticipants.length === 0) {
      const activeMembers = await getActiveMembersOnDate(groupId, newDate)
      resolvedParticipants = activeMembers.map(m => ({ userId: m.id }))
    }

    const splits = buildSplits(newSplitType, conversion.amountInr, resolvedParticipants)
    if (!splits || splits.error) {
      return res.status(400).json({ error: splits?.error || 'Invalid split configuration' })
    }

    // Atomic: delete old splits, update expense, create new splits
    const updated = await prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId } })

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          description:    newDesc,
          amountOriginal: newAmount,
          currency:       newCurrency.toUpperCase(),
          amountInr:      conversion.amountInr,
          fxRate:         conversion.fxRate,
          splitType:      normalizeSplitType(newSplitType),
          expenseDate:    newDate,
          splits: { create: splits }
        },
        include: {
          payer:  { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true } } } }
        }
      })
    })

    res.json({ expense: updated })
  } catch (err) {
    console.error('Update expense error:', err)
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// ─── DELETE /api/expenses/:groupId/:expenseId ─────────────────────────────────
// Delete an expense. Admin or creator only.
// Deletes splits via cascade (set up in Prisma schema).

router.delete('/:groupId/:expenseId', async (req, res) => {
  const { groupId, expenseId } = req.params

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, groupId }
  })
  if (!existing) {
    return res.status(404).json({ error: 'Expense not found' })
  }

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  const isAdmin   = membership.role === 'admin'
  const isCreator = existing.paidBy === req.user.id

  if (!isAdmin && !isCreator) {
    return res.status(403).json({
      error: 'Only the expense creator or a group admin can delete this expense'
    })
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId } })
      await tx.expense.delete({ where: { id: expenseId } })
    })

    res.json({ message: 'Expense deleted' })
  } catch (err) {
    console.error('Delete expense error:', err)
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

function normalizeSplitType(raw) {
  const map = {
    equal:      'equal',
    equally:    'equal',
    unequal:    'unequal',
    exact:      'unequal',
    percentage: 'percentage',
    percent:    'percentage',
    share:      'share',
    shares:     'share',
    ratio:      'share'
  }
  return map[(raw || '').toLowerCase().trim()] || 'equal'
}

function buildSplits(splitType, totalAmountInr, participants) {
  const type  = normalizeSplitType(splitType)
  const total = parseFloat(totalAmountInr)

  if (type === 'equal') {
    if (participants.length === 0) {
      return { error: 'No participants provided' }
    }
    const base      = Math.floor((total / participants.length) * 100) / 100
    const remainder = +(total - base * participants.length).toFixed(2)

    return participants.map((p, i) => ({
      userId:      p.userId,
      shareAmount: i === 0 ? +(base + remainder).toFixed(2) : base
    }))
  }

  if (type === 'unequal') {
    // participants must have { userId, share: number }
    const splits = participants.map(p => ({
      userId:      p.userId,
      shareAmount: +(parseFloat(p.share || 0)).toFixed(2)
    }))

    const sum = splits.reduce((acc, s) => acc + s.shareAmount, 0)
    if (Math.abs(sum - total) > 0.02) {
      return { error: `Unequal shares sum to ${sum.toFixed(2)} but expense total is ${total.toFixed(2)}` }
    }
    return splits
  }

  if (type === 'percentage') {
    // participants must have { userId, percent: number }
    const percentSum = participants.reduce((acc, p) => acc + parseFloat(p.percent || 0), 0)
    if (Math.abs(percentSum - 100) > 0.01) {
      return { error: `Percentages sum to ${percentSum.toFixed(2)}%, must equal 100%` }
    }

    return participants.map(p => ({
      userId:       p.userId,
      shareAmount:  +(total * parseFloat(p.percent) / 100).toFixed(2),
      sharePercent: parseFloat(p.percent)
    }))
  }

  if (type === 'share') {
    // participants must have { userId, units: number }
    const totalUnits = participants.reduce((acc, p) => acc + parseFloat(p.units || 1), 0)

    return participants.map(p => ({
      userId:      p.userId,
      shareAmount: +(total * parseFloat(p.units || 1) / totalUnits).toFixed(2),
      shareUnits:  parseFloat(p.units || 1)
    }))
  }

  return { error: `Unknown split type: ${splitType}` }
}

function toNumber(decimal) {
  return parseFloat(decimal.toString())
}

export default router