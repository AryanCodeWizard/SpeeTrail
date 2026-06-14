// import { PrismaClient } from '@prisma/client'
// import { PrismaPg } from '@prisma/adapter-pg'
import authMiddleware from '../middleware/auth.js'
import express from 'express'

const router = express.Router()
const connectionString = `${globalThis.process?.env?.DATABASE_URL || ''}`
const adapter = new PrismaPg({ connectionString })
// const prisma = new PrismaClient({ adapter })

// All group routes require authentication
router.use(authMiddleware)

// ─── POST /api/groups ─────────────────────────────────────────────────────────
// Create a group. Creator becomes admin automatically.
router.post('/', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Group name is required' })
  }

  try {
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        createdBy: req.user.id,
        memberships: {
          create: {
            userId: req.user.id,
            role: 'admin',
            joinedAt: new Date()
          }
        }
      },
      include: { memberships: { include: { user: { select: { id: true, name: true, email: true } } } } }
    })
    res.status(201).json({ group })
  } catch (err) {
    console.error('Create group error:', err)
    res.status(500).json({ error: 'Failed to create group' })
  }
})

// ─── GET /api/groups ──────────────────────────────────────────────────────────
// List all groups the current user is an active member of.
router.get('/', async (req, res) => {
  try {
    const memberships = await prisma.groupMembership.findMany({
      where: {
        userId: req.user.id,
        leftAt: null             // only active memberships
      },
      include: {
        group: {
          include: {
            memberships: {
              where: { leftAt: null },
              include: { user: { select: { id: true, name: true, email: true } } }
            }
          }
        }
      }
    })

    const groups = memberships.map(m => m.group)
    res.json({ groups })
  } catch (err) {
    console.error('List groups error:', err)
    res.status(500).json({ error: 'Failed to fetch groups' })
  }
})

// ─── GET /api/groups/:id ──────────────────────────────────────────────────────
// Get a single group. Only accessible to active members.
router.get('/:id', requireActiveMember, async (req, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: 'asc' }
        }
      }
    })
    res.json({ group })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group' })
  }
})

// ─── POST /api/groups/:id/members ─────────────────────────────────────────────
// Add a member to a group. Admin only.
// If user was previously a member (leftAt is set), re-activates with new joinedAt.
router.post('/:id/members', requireAdmin, async (req, res) => {
  const { userId, role = 'member' } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if already an active member
    const existing = await prisma.groupMembership.findFirst({
      where: { groupId: req.params.id, userId, leftAt: null }
    })
    if (existing) {
      return res.status(409).json({ error: 'User is already an active member' })
    }

    // Check if previously a member (re-join case — Sam's scenario)
    const previous = await prisma.groupMembership.findFirst({
      where: { groupId: req.params.id, userId, leftAt: { not: null } }
    })

    let membership
    if (previous) {
      // Create a NEW membership row — preserve the old one for audit history
      membership = await prisma.groupMembership.create({
        data: {
          groupId: req.params.id,
          userId,
          role,
          joinedAt: new Date()
        },
        include: { user: { select: { id: true, name: true, email: true } } }
      })
    } else {
      membership = await prisma.groupMembership.create({
        data: {
          groupId: req.params.id,
          userId,
          role,
          joinedAt: new Date()
        },
        include: { user: { select: { id: true, name: true, email: true } } }
      })
    }

    res.status(201).json({ membership })
  } catch (err) {
    console.error('Add member error:', err)
    res.status(500).json({ error: 'Failed to add member' })
  }
})

// ─── DELETE /api/groups/:id/members/:userId ───────────────────────────────────
// Remove a member. Admin only. Sets leftAt to now — never deletes the row.
router.delete('/:id/members/:userId', requireAdmin, async (req, res) => {
  const { userId } = req.params

  // Prevent removing the last admin
  if (userId === req.user.id) {
    const adminCount = await prisma.groupMembership.count({
      where: { groupId: req.params.id, role: 'admin', leftAt: null }
    })
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the only admin' })
    }
  }

  try {
    const membership = await prisma.groupMembership.findFirst({
      where: { groupId: req.params.id, userId, leftAt: null }
    })

    if (!membership) {
      return res.status(404).json({ error: 'Active membership not found' })
    }

    const updated = await prisma.groupMembership.update({
      where: { id: membership.id },
      data: { leftAt: new Date() }
    })

    res.json({ message: 'Member removed', membership: updated })
  } catch (err) {
    console.error('Remove member error:', err)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

// ─── PATCH /api/groups/:id/members/:userId/role ───────────────────────────────
// Promote or demote a member. Admin only.
router.patch('/:id/members/:userId/role', requireAdmin, async (req, res) => {
  const { role } = req.body
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or member' })
  }

  try {
    const membership = await prisma.groupMembership.findFirst({
      where: { groupId: req.params.id, userId: req.params.userId, leftAt: null }
    })
    if (!membership) {
      return res.status(404).json({ error: 'Active membership not found' })
    }

    const updated = await prisma.groupMembership.update({
      where: { id: membership.id },
      data: { role }
    })

    res.json({ membership: updated })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' })
  }
})

// ─── MIDDLEWARE HELPERS ────────────────────────────────────────────────────────

// Confirms current user is an active member of the group
async function requireActiveMember(req, res, next) {
  const membership = await prisma.groupMembership.findFirst({
    where: {
      groupId: req.params.id,
      userId: req.user.id,
      leftAt: null
    }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }
  req.membership = membership
  next()
}

// Confirms current user is an admin of the group
async function requireAdmin(req, res, next) {
  const membership = await prisma.groupMembership.findFirst({
    where: {
      groupId: req.params.id,
      userId: req.user.id,
      role: 'admin',
      leftAt: null
    }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  req.membership = membership
  next()
}

export default router