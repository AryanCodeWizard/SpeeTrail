// import { PrismaClient } from '@prisma/client'
// import { PrismaPg } from '@prisma/adapter-pg'
import authMiddleware from '../middleware/auth.js'
import express from 'express'
import prisma from '../config/prisma.js'

const router = express.Router()
// using shared prisma client from config/prisma.js

router.use(authMiddleware)

// POST /api/settlements/:groupId
// Record a payment. Affects balance calculation immediately.
router.post('/:groupId', async (req, res) => {
  const { groupId } = req.params
  const { paidTo, amount, settledOn } = req.body

  if (!paidTo || !amount || !settledOn) {
    return res.status(400).json({ error: 'paidTo, amount, and settledOn are required' })
  }

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  // Cannot settle with yourself
  if (paidTo === req.user.id) {
    return res.status(400).json({ error: 'Cannot record a settlement with yourself' })
  }

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' })
  }

  try {
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        paidBy:    req.user.id,
        paidTo,
        amount:    parsedAmount,
        settledOn: new Date(settledOn)
      },
      include: {
        payer:    { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      }
    })

    res.status(201).json({ settlement })
  } catch (err) {
    console.error('Settlement error:', err)
    res.status(500).json({ error: 'Failed to record settlement' })
  }
})

// GET /api/settlements/:groupId
// List all settlements for a group.
router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  try {
    const settlements = await prisma.settlement.findMany({
      where:   { groupId },
      include: {
        payer:    { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      },
      orderBy: { settledOn: 'desc' }
    })

    res.json({ settlements })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settlements' })
  }
})

export default router