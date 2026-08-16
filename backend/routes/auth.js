const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { authMiddleware, JWT_SECRET } = require('../middleware/auth')
const { sendWelcomeEmail } = require('../services/mailer')

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
}

/** POST /api/auth/signup — Register new user */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@foodie.ai'
    const role = email.toLowerCase().trim() === adminEmail.toLowerCase() ? 'admin' : 'user'

    const newUser = new User({
      email: email.toLowerCase().trim(),
      password,
      displayName: displayName?.trim() || email.split('@')[0],
      role
    })

    await newUser.save()

    const token = generateToken(newUser)
    const userJson = newUser.toObject()
    delete userJson.password

    // Trigger welcome email asynchronously
    sendWelcomeEmail(newUser.email, newUser.displayName, 'Email Registration').catch(console.warn)

    res.status(201).json({
      token,
      user: {
        uid: userJson._id,
        ...userJson
      }
    })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({ error: err.message || 'Signup failed' })
  }
})

/** POST /api/auth/google — Google OAuth / One-tap sign in */
router.post('/google', async (req, res) => {
  try {
    const { email, displayName } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required for Google Sign In' })
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() })
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@foodie.ai'
    const isNewUser = !user

    if (!user) {
      const role = email.toLowerCase().trim() === adminEmail.toLowerCase() ? 'admin' : 'user'
      user = new User({
        email: email.toLowerCase().trim(),
        password: `google_oauth_${Date.now()}_${Math.random().toString(36)}`,
        displayName: displayName || email.split('@')[0],
        role
      })
      await user.save()
    }

    const token = generateToken(user)
    const userJson = user.toObject()
    delete userJson.password

    // Send Welcome / Login notification email asynchronously
    sendWelcomeEmail(
      user.email,
      user.displayName || displayName || 'Foodie User',
      isNewUser ? 'Google Sign-Up' : 'Google Login'
    ).catch(console.warn)

    res.json({
      token,
      user: {
        uid: userJson._id,
        ...userJson
      }
    })
  } catch (err) {
    console.error('Google auth error:', err)
    res.status(500).json({ error: err.message || 'Google authentication failed' })
  }
})

/** POST /api/auth/login — Login user */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = generateToken(user)
    const userJson = user.toObject()
    delete userJson.password

    res.json({
      token,
      user: {
        uid: userJson._id,
        ...userJson
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: err.message || 'Login failed' })
  }
})

/** GET /api/auth/me — Get authenticated user details */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      uid: req.user._id,
      ...req.user.toObject()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** PUT /api/auth/profile — Update user profile & preferences */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { displayName, profile, favorites, shoppingList } = req.body
    const user = req.user

    if (displayName !== undefined) user.displayName = displayName
    if (profile) {
      user.profile = {
        ...user.profile.toObject(),
        ...profile
      }
    }
    if (Array.isArray(favorites)) {
      user.favorites = favorites
    }
    if (Array.isArray(shoppingList)) {
      user.shoppingList = shoppingList
    }

    await user.save()
    const userJson = user.toObject()
    delete userJson.password

    res.json({
      uid: userJson._id,
      ...userJson
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** PUT /api/auth/change-password — Update password */
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const user = await User.findById(req.user._id)
    user.password = newPassword
    await user.save()

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** DELETE /api/auth/account — Delete account */
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id)
    res.json({ message: 'Account deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
