import 'dotenv/config'

import authRoutes from './routes/auth.js'
import balancesRoutes from './routes/balances.js'
import cors from 'cors'
import expensesRoutes from './routes/expenses.js'
import express from 'express'
import groupsRoutes from './routes/groups.js'
import importRoutes from './routes/import.js'
import settlementsRoutes from './routes/settlements.js'
import usersRoutes from './routes/users.js'
import invitesRoutes from './routes/invites.js'

const app = express()
const allowedOrigins = new Set([
	globalThis.process?.env?.CLIENT_URL,
	'http://localhost:5173',
	'http://localhost:5174',
	'http://localhost:5175'
].filter(Boolean))

app.use(cors({
	origin(origin, callback) {
		if (!origin || allowedOrigins.has(origin)) {
			return callback(null, true)
		}

		return callback(new Error(`CORS blocked origin: ${origin}`))
	}
}))

app.use(express.json())

app.use('/api/auth',        authRoutes)
app.use('/api/groups',      groupsRoutes)
app.use('/api/expenses',    expensesRoutes)
app.use('/api/settlements', settlementsRoutes)
app.use('/api/balances',    balancesRoutes)
app.use('/api/import',      importRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/invites', invitesRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok' }))

const PORT = globalThis.process?.env?.PORT || 4000
app.listen(PORT, () => console.log(`Server running on ${PORT}`))