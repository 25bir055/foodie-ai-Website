const jwt = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET || 'foodie_ai_super_secret_jwt_key_2026'

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' })
    }

    req.user = user
    req.userId = user._id
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', message: err.message })
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      if (decoded && decoded.userId) {
        req.userId = decoded.userId
        req.user = { _id: decoded.userId }
      }
    } catch {
      req.userId = 'guest_user'
      req.user = { _id: 'guest_user' }
    }
  } else {
    req.userId = 'guest_user'
    req.user = { _id: 'guest_user' }
  }
  next()
}

module.exports = { authMiddleware, optionalAuth, JWT_SECRET }
