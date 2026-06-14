import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const { PrismaPg } = require('@prisma/adapter-pg')
const connectionString = `${globalThis.process?.env?.DATABASE_URL || ''}`
const adapter = new PrismaPg({ connectionString })

const prisma = globalThis.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma