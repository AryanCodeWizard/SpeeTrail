import prisma from '../config/prisma.js'
import authMiddleware from '../middleware/auth.js'
import bcrypt from 'bcryptjs'
import express from 'express'
import jwt from 'jsonwebtoken'

const router = express.Router()
const connectionString = `${globalThis.process?.env?.DATABASE_URL || ''}`
const adapter = new PrismaPg({ connectionString })
// const prisma = new PrismaClient({ adapter })

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, name, password } = req.body

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name and password are required' })
  }

  try {
    const JWT_SECRET = globalThis?.process?.env?.JWT_SECRET

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'JWT secret is not configured' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true }
    })

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ user, token })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  try {
    const JWT_SECRET = globalThis?.process?.env?.JWT_SECRET

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'JWT secret is not configured' })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me  — verify token, return current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, createdAt: true }
    })
    res.json({ user })
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user:', })
  }
})

export default router