import prisma from '../config/prisma.js'
import authMiddleware from '../middleware/auth.js'
import { calculateGroupBalances } from '../services/balanceService.js'
import express from 'express'

const router = express.Router()
const connectionString = `${globalThis.process?.env?.DATABASE_URL || ''}`
const adapter = new PrismaPg({ connectionString })
// const prisma = new PrismaClient({ adapter })

router.use(authMiddleware)

// GET /api/balances/:groupId
// Returns net balances, simplified transactions, and expense breakdown
router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params

  // Confirm requester is an active member
  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  try {
    const result = await calculateGroupBalances(groupId)
    res.json(result)
  } catch (err) {
    console.error('Balance calculation error:', err)
    res.status(500).json({ error: 'Failed to calculate balances' })
  }
})

// GET /api/balances/:groupId/user/:userId
// Individual balance with full expense breakdown (Rohan's requirement)
router.get('/:groupId/user/:userId', async (req, res) => {
  const { groupId, userId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  try {
    const result = await calculateGroupBalances(groupId)

    const userBalance = result.balances[userId]
    if (!userBalance) {
      return res.status(404).json({ error: 'User not found in this group' })
    }

    res.json({
      balance:   userBalance,
      breakdown: result.expenseBreakdown[userId] || [],
      // Which transactions involve this user
      transactions: result.transactions.filter(
        t => t.from.id === userId || t.to.id === userId
      )
    })
  } catch (err) {
    console.error('User balance error:', err)
    res.status(500).json({ error: 'Failed to calculate user balance' })
  }
})

export default router