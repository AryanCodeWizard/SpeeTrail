import express from 'express'
import prisma from '../config/prisma.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/by-email', async (req, res) => {
  try {
    const { email } = req.query

    if (!email) {
      return res.status(400).json({
        error: 'email is required'
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim()
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      })
    }

    return res.json({ user })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Internal server error'
    })
  }
})

export default router