import jwt from 'jsonwebtoken'

export default function authMiddleware(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = header.split(' ')[1]

  try {
    const secret = globalThis.process?.env?.JWT_SECRET || import.meta.env?.VITE_JWT_SECRET
    const decoded = jwt.verify(token, secret)
    req.user = decoded  // { id, email, name }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}