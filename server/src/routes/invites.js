import express from 'express'
import crypto from 'crypto'
import authMiddleware from '../middleware/auth.js'
import { sendInviteEmail } from '../utils/mailer.js'
import prisma from '../config/prisma.js'

const router = express.Router()

// ─── POST /api/invites/:groupId ───────────────────────────────────────────────
// Admin sends invite to an email address.
// Creates a GroupInvite row and sends the email.
// Does NOT add the user to the group yet.

router.post('/:groupId', authMiddleware, async (req, res) => {
  const { groupId } = req.params
  const { email, role = 'member' } = req.body

  if (!email?.trim()) {
    return res.status(400).json({ error: 'email is required' })
  }

  // Confirm requester is admin
  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, role: 'admin', leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // Load group for email content
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true }
  })
  if (!group) return res.status(404).json({ error: 'Group not found' })

  // Check if email already has an active membership
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  })
  if (existingUser) {
    const alreadyMember = await prisma.groupMembership.findFirst({
      where: { groupId, userId: existingUser.id, leftAt: null }
    })
    if (alreadyMember) {
      return res.status(409).json({ error: 'This person is already a member' })
    }
  }

  // Check for existing pending invite to same email
  const existingInvite = await prisma.groupInvite.findFirst({
    where: {
      groupId,
      email:  email.toLowerCase().trim(),
      status: 'pending',
      expiresAt: { gt: new Date() }
    }
  })
  if (existingInvite) {
    return res.status(409).json({
      error: 'A pending invite already exists for this email'
    })
  }

  // Generate a secure random token
  const token     = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  try {
    // Create invite record
    const invite = await prisma.groupInvite.create({
      data: {
        groupId,
        email:     email.toLowerCase().trim(),
        token,
        role,
        invitedBy: req.user.id,
        status:    'pending',
        expiresAt
      }
    })

    // Send the email
    await sendInviteEmail({
      to:          email.trim(),
      inviterName: req.user.name,
      groupName:   group.name,
      inviteToken: token
    })

    res.status(201).json({
      message: `Invite sent to ${email}`,
      invite: {
        id:        invite.id,
        email:     invite.email,
        status:    invite.status,
        expiresAt: invite.expiresAt
      }
    })
  } catch (err) {
    console.error('Invite error:', err)
    // If email fails, delete the invite record
    await prisma.groupInvite.deleteMany({ where: { token } })
    res.status(500).json({ error: 'Failed to send invite email' })
  }
})

// ─── GET /api/invites/accept/:token ──────────────────────────────────────────
// Called when user clicks the link in their email.
// No auth required — token is the proof.
// Returns invite details so frontend can show "Join [group name]?" screen.

router.get('/accept/:token', async (req, res) => {
  const { token } = req.params

  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: {
      group:   { select: { id: true, name: true } },
      inviter: { select: { name: true } }
    }
  })

  if (!invite) {
    return res.status(404).json({ error: 'Invite not found or already used' })
  }

  if (invite.status !== 'pending') {
    return res.status(400).json({
      error: `This invite has already been ${invite.status}`
    })
  }

  if (new Date() > invite.expiresAt) {
    await prisma.groupInvite.update({
      where: { token },
      data:  { status: 'expired' }
    })
    return res.status(400).json({ error: 'This invite link has expired' })
  }

  // Return invite details for the accept screen
  res.json({
    invite: {
      token,
      email:       invite.email,
      groupId:     invite.group.id,
      groupName:   invite.group.name,
      inviterName: invite.inviter.name,
      role:        invite.role,
      expiresAt:   invite.expiresAt
    }
  })
})

// ─── POST /api/invites/accept/:token ─────────────────────────────────────────
// User confirms they want to join.
// Auth required — we need to know who is accepting.
// The accepting user's email must match the invite email.

router.post('/accept/:token', authMiddleware, async (req, res) => {
  const { token } = req.params

  const invite = await prisma.groupInvite.findUnique({
    where: { token },
    include: {
      group: { select: { id: true, name: true } }
    }
  })

  if (!invite) {
    return res.status(404).json({ error: 'Invite not found' })
  }

  if (invite.status !== 'pending') {
    return res.status(400).json({
      error: `This invite has already been ${invite.status}`
    })
  }

  if (new Date() > invite.expiresAt) {
    await prisma.groupInvite.update({
      where: { token },
      data:  { status: 'expired' }
    })
    return res.status(400).json({ error: 'This invite has expired' })
  }

  // Email must match
  if (req.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return res.status(403).json({
      error: `This invite was sent to ${invite.email}. Please sign in with that account.`
    })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Check not already a member
      const existing = await tx.groupMembership.findFirst({
        where: { groupId: invite.groupId, userId: req.user.id, leftAt: null }
      })

      if (!existing) {
        // Add to group
        await tx.groupMembership.create({
          data: {
            groupId:  invite.groupId,
            userId:   req.user.id,
            role:     invite.role,
            joinedAt: new Date()
          }
        })
      }

      // Mark invite as accepted
      await tx.groupInvite.update({
        where: { token },
        data: {
          status:     'accepted',
          acceptedAt: new Date()
        }
      })
    })

    res.json({
      message:   `You've joined ${invite.group.name}`,
      groupId:   invite.group.id,
      groupName: invite.group.name
    })
  } catch (err) {
    console.error('Accept invite error:', err)
    res.status(500).json({ error: 'Failed to join group' })
  }
})

// ─── DELETE /api/invites/:groupId/:inviteId ───────────────────────────────────
// Admin cancels a pending invite.

router.delete('/:groupId/:inviteId', authMiddleware, async (req, res) => {
  const { groupId, inviteId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, role: 'admin', leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const invite = await prisma.groupInvite.findFirst({
    where: { id: inviteId, groupId, status: 'pending' }
  })
  if (!invite) {
    return res.status(404).json({ error: 'Pending invite not found' })
  }

  await prisma.groupInvite.update({
    where: { id: inviteId },
    data:  { status: 'cancelled' }
  })

  res.json({ message: 'Invite cancelled' })
})

// ─── GET /api/invites/:groupId/pending ───────────────────────────────────────
// List pending invites for a group (admin view).

router.get('/:groupId/pending', authMiddleware, async (req, res) => {
  const { groupId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, role: 'admin', leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const invites = await prisma.groupInvite.findMany({
    where:   { groupId, status: 'pending', expiresAt: { gt: new Date() } },
    include: { inviter: { select: { name: true } } },
    orderBy: { createdAt: 'desc' }
  })

  res.json({ invites })
})

export default router