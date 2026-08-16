const express = require('express')
const router = express.Router()
const Scan = require('../models/Scan')
const { optionalAuth } = require('../middleware/auth')

/** POST /api/scans — Record product scan */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { barcode, productName, healthScore, userId } = req.body
    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' })
    }

    const scan = new Scan({
      userId: req.userId || userId || 'anonymous',
      barcode: String(barcode).trim(),
      productName: productName || '',
      healthScore: healthScore ?? null,
      timestamp: new Date()
    })

    await scan.save()
    res.status(201).json(scan)
  } catch (err) {
    console.error('Record scan error:', err)
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/scans/recent — Get recent scans for user */
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10
    const targetUserId = req.query.userId || req.userId
    const filter = targetUserId && targetUserId !== 'all' ? { userId: targetUserId } : {}
    const scans = await Scan.find(filter).sort({ timestamp: -1 }).limit(limit).lean()
    res.json(scans)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
