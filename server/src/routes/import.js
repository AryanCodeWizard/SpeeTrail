import { commitImport, detectAnomalies, normalizeHeaders, parseCSV } from '../services/importService.js'

// import { PrismaClient } from '@prisma/client'
// import { PrismaPg } from '@prisma/adapter-pg'
import authMiddleware from '../middleware/auth.js'
import express from 'express'
import multer from 'multer'
import prisma from '../config/prisma.js'

const router = express.Router()
const connectionString = `${globalThis.process?.env?.DATABASE_URL || ''}`
// using shared prisma client from config/prisma.js
const upload = multer({ storage: multer.memoryStorage() })

router.use(authMiddleware)

// ─── POST /api/import/:groupId/analyze ───────────────────────────────────────
// Stage 1–3: Parse, normalize, detect anomalies.
// Returns a preview. Nothing is written to the database yet.
// This is the screen Meera sees before approving.

router.post('/:groupId/analyze', upload.single('file'), async (req, res) => {
  const { groupId } = req.params

  // Confirm requester is group admin
  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, role: 'admin', leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required to import' })
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  try {
    // Stage 1: Parse CSV
    const parseResult = parseCSV(req.file.buffer)
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error })
    }

    // Stage 2: Normalize headers
    const normalizedRows = normalizeHeaders(parseResult.records)

    // Load known members for this group (all time, not just current)
    const memberships = await prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    const knownMembers = memberships.map(m => m.user)

    // Load existing expenses for duplicate check
    const existingExpenses = await prisma.expense.findMany({
      where: { groupId },
      select: {
        id: true, description: true, expenseDate: true,
        amountInr: true, paidBy: true
      }
    })

    // Stage 3: Detect anomalies
    const analyzedRows = detectAnomalies(normalizedRows, knownMembers, existingExpenses)

    // Create a pending import session — no expenses written yet
    const importSession = await prisma.importSession.create({
      data: {
        groupId,
        initiatedBy:   req.user.id,
        status:        'pending_review',
        anomalyReport: {
          totalRows:     analyzedRows.length,
          cleanRows:     analyzedRows.filter(r => r.status === 'clean').length,
          warningRows:   analyzedRows.filter(r => r.status === 'warning').length,
          errorRows:     analyzedRows.filter(r => r.status === 'error').length,
          anomalies:     analyzedRows.flatMap(r => r.anomalies)
        }
      }
    })

    res.json({
      importSessionId: importSession.id,
      summary: {
        totalRows:   analyzedRows.length,
        cleanRows:   analyzedRows.filter(r => r.status === 'clean').length,
        warningRows: analyzedRows.filter(r => r.status === 'warning').length,
        errorRows:   analyzedRows.filter(r => r.status === 'error').length
      },
      rows: analyzedRows.map(r => ({
        rowNumber:   r.rowNumber,
        status:      r.status,
        canImport:   r.canImport,
        description: r.normalized.description,
        date:        r.parsedDate,
        amount:      r.parsedAmount,
        amountInr:   r.conversionResult?.amountInr || r.parsedAmount,
        currency:    r.currency,
        payer:       r.payer?.name,
        anomalies:   r.anomalies
      }))
    })
  } catch (err) {
    console.error('Analyze error:', err)
    res.status(500).json({ error: 'Analysis failed' })
  }
})

// ─── POST /api/import/:groupId/approve/:sessionId ────────────────────────────
// Stage 4: User reviewed the preview and clicked Approve.
// NOW we write to the database.

router.post('/:groupId/approve/:sessionId', upload.single('file'), async (req, res) => {
  const { groupId, sessionId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, role: 'admin', leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // Confirm session exists and is still pending
  const session = await prisma.importSession.findUnique({
    where: { id: sessionId }
  })
  if (!session || session.status !== 'pending_review') {
    return res.status(400).json({ error: 'Import session not found or already processed' })
  }

  // Re-run analysis to get the rows (stateless — we don't store analyzed rows,
  // we store the raw anomaly report and re-derive on approve)
  // In production you'd cache this in Redis. For this assignment,
  // we require the client to re-send the file on approve.
  const fileBuffer = req.file?.buffer
  if (!fileBuffer) {
    return res.status(400).json({
      error: 'Please re-upload the file to confirm import'
    })
  }

  try {
    const parseResult    = parseCSV(fileBuffer)
    const normalizedRows = normalizeHeaders(parseResult.records)

    const memberships = await prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    const knownMembers = memberships.map(m => m.user)

    const existingExpenses = await prisma.expense.findMany({
      where: { groupId },
      select: {
        id: true, description: true, expenseDate: true,
        amountInr: true, paidBy: true
      }
    })

    const analyzedRows = detectAnomalies(normalizedRows, knownMembers, existingExpenses)
    const created      = await commitImport(sessionId, analyzedRows, groupId, knownMembers)

    res.json({
      message:         'Import approved and committed',
      expensesCreated: created.length,
      importSessionId: sessionId
    })
  } catch (err) {
    console.error('Approve error:', err)
    res.status(500).json({ error: 'Import commit failed' })
  }
})

// ─── POST /api/import/:groupId/reject/:sessionId ─────────────────────────────
// User reviewed and rejected. Mark session, write no expenses.

router.post('/:groupId/reject/:sessionId', async (req, res) => {
  const { groupId, sessionId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, role: 'admin', leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  await prisma.importSession.update({
    where: { id: sessionId },
    data:  { status: 'rejected' }
  })

  res.json({ message: 'Import rejected. No data was written.' })
})

// ─── GET /api/import/:groupId/sessions ───────────────────────────────────────
// List all import sessions for audit trail.

router.get('/:groupId/sessions', async (req, res) => {
  const { groupId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  const sessions = await prisma.importSession.findMany({
    where:   { groupId },
    include: { initiator: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  })

  res.json({ sessions })
})

// ─── GET /api/import/:groupId/sessions/:sessionId/report ─────────────────────
// Full import report for a completed session — the required deliverable.

router.get('/:groupId/sessions/:sessionId/report', async (req, res) => {
  const { groupId, sessionId } = req.params

  const membership = await prisma.groupMembership.findFirst({
    where: { groupId, userId: req.user.id, leftAt: null }
  })
  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this group' })
  }

  const session = await prisma.importSession.findUnique({
    where:   { id: sessionId },
    include: {
      rows:      true,
      initiator: { select: { id: true, name: true } }
    }
  })

  if (!session) {
    return res.status(404).json({ error: 'Import session not found' })
  }

  res.json({ report: session })
})

export default router