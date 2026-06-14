import authRoutes from './routes/auth.js'
import balancesRoutes from './routes/balances.js'
import cors from 'cors'
import dotenv from 'dotenv'
import expensesRoutes from './routes/expenses.js'
import express from 'express'
import groupsRoutes from './routes/groups.js'
import importRoutes from './routes/import.js'
import settlementsRoutes from './routes/settlements.js'

dotenv.config()

const app = express()
app.use(cors({ origin: globalThis.process?.env?.CLIENT_URL }))
app.use(express.json())

app.use('/api/auth',        authRoutes)
app.use('/api/groups',      groupsRoutes)
app.use('/api/expenses',    expensesRoutes)
app.use('/api/settlements', settlementsRoutes)
app.use('/api/balances',    balancesRoutes)
app.use('/api/import',      importRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

const PORT = globalThis.process?.env?.PORT || 4000
app.listen(PORT, () => console.log(`Server running on ${PORT}`))