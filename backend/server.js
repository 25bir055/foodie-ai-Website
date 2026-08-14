const express = require('express')
const cors = require('cors')
require('dotenv').config()

const productsRouter = require('./routes/products')
const { firebaseInitialized } = require('./firebase-config')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Foodie AI Express Backend Server is running',
    firebaseInitialized
  })
})

// Products API
app.use('/api/products', productsRouter)

app.listen(PORT, () => {
  console.log(`🚀 Foodie AI Backend Server listening on http://localhost:${PORT}`)
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`)
})
