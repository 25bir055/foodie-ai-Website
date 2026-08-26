const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const authRouter = require('./routes/auth')
const productsRouter = require('./routes/products')
const scansRouter = require('./routes/scans')
const adminRouter = require('./routes/admin')
const ocrRouter = require('./routes/ocr')
const mlRouter = require('./routes/ml')
const chatRouter = require('./routes/chat')

// New V2 Routes
const familyRouter = require('./routes/family')
const prescriptionRouter = require('./routes/prescription')
const recommendationsRouter = require('./routes/recommendations')
const mealsRouter = require('./routes/meals')
const settingsRouter = require('./routes/settings')
const billsRouter = require('./routes/bills')
console.log("Groq API Key:", process.env.GROQ_API_KEY ? "LOADED ✅" : "MISSING ❌");

const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie-ai'

let mongoConnected = false

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    mongoConnected = true
    console.log('✅ Connected to MongoDB successfully:', MONGODB_URI)
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message)
    console.warn('⚠️ Server will run with in-memory fallbacks if MongoDB is unavailable.')
  })

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Health check endpoint (both /api/health and /health)
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    message: 'Foodie AI Express Backend Server is running',
    database: 'MongoDB',
    mongoConnected: mongoose.connection.readyState === 1
  })
}
app.get('/api/health', healthHandler)
app.get('/health', healthHandler)

// API Routes (supports both /api/* and root /*)
app.use('/api/auth', authRouter)
app.use('/auth', authRouter)

app.use('/api/products', productsRouter)
app.use('/products', productsRouter)

app.use('/api/scans', scansRouter)
app.use('/scans', scansRouter)

app.use('/api/admin', adminRouter)
app.use('/admin', adminRouter)

app.use('/api/ocr', ocrRouter)
app.use('/ocr', ocrRouter)

app.use('/api/ml', mlRouter)
app.use('/ml', mlRouter)

app.use('/api/chat', chatRouter)
app.use('/chat', chatRouter)

// New V2 Routes
app.use('/api/family', familyRouter)
app.use('/family', familyRouter)

app.use('/api/prescription', prescriptionRouter)
app.use('/prescription', prescriptionRouter)
app.use('/api/prescriptions', prescriptionRouter)
app.use('/prescriptions', prescriptionRouter)

app.use('/api/recommendations', recommendationsRouter)
app.use('/recommendations', recommendationsRouter)

app.use('/api/meals', mealsRouter)
app.use('/meals', mealsRouter)

app.use('/api/settings', settingsRouter)
app.use('/settings', settingsRouter)

app.use('/api/bills', billsRouter)
app.use('/bills', billsRouter)

app.listen(PORT, () => {
  console.log(`🚀 Foodie AI Backend Server listening on http://localhost:${PORT}`)
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`)
})
