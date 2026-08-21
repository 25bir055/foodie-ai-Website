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
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Foodie AI Express Backend Server is running',
    database: 'MongoDB',
    mongoConnected: mongoose.connection.readyState === 1
  })
})

// API Routes
app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/scans', scansRouter)
app.use('/api/admin', adminRouter)
app.use('/api/ocr', ocrRouter)
app.use('/api/ml', mlRouter)

app.listen(PORT, () => {
  console.log(`🚀 Foodie AI Backend Server listening on http://localhost:${PORT}`)
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`)
})
