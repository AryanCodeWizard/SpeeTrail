import prisma from '../config/prisma.js'

/**
 * Returns user IDs who were active members of a group on a specific date.
 * This is the function that makes Sam's requirement work.
 *
 * Logic: a user was active on `date` if:
 *   - joinedAt <= date AND (leftAt is null OR leftAt > date)
 *
 * Interview explanation: we check membership windows, not current state.
 * Sam joining mid-April won't appear in March expenses because
 * his joinedAt (mid-April) is after the March expense date.
 */
async function getActiveMembersOnDate(groupId, date) {
  const memberships = await prisma.groupMembership.findMany({
    where: {
      groupId,
      joinedAt: { lte: date },
      OR: [
        { leftAt: null },
        { leftAt: { gt: date } }
      ]
    },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  })

  return memberships.map(m => m.user)
}

/**
 * Checks if a specific user was active in a group on a specific date.
 * Used during import to validate split assignments.
 */
async function wasMemberOnDate(groupId, userId, date) {
  const membership = await prisma.groupMembership.findFirst({
    where: {
      groupId,
      userId,
      joinedAt: { lte: date },
      OR: [
        { leftAt: null },
        { leftAt: { gt: date } }
      ]
    }
  })
  return !!membership
}

export { getActiveMembersOnDate, wasMemberOnDate }