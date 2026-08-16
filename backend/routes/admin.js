const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Product = require('../models/Product')
const Scan = require('../models/Scan')

/** GET /api/admin/stats — Fetch aggregated stats for Admin Dashboard */
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalScans, recentScans, recentProducts] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Scan.countDocuments(),
      Scan.find().sort({ timestamp: -1 }).limit(10).lean(),
      Product.find().sort({ createdAt: -1 }).limit(10).lean()
    ])

    // Average Health Score calculation
    const scoredProducts = await Product.find({
      healthScore: { $ne: null, $exists: true }
    }).select('healthScore').lean()

    const avgHealthScore = scoredProducts.length > 0
      ? Math.round(scoredProducts.reduce((sum, p) => sum + Number(p.healthScore || 0), 0) / scoredProducts.length)
      : 0

    // Top categories for chart
    const categoryStats = await Product.aggregate([
      { $match: { category: { $ne: null, $ne: '' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ])

    const categoryData = categoryStats.map(c => ({
      cat: String(c._id).split(',')[0].trim().substring(0, 20),
      count: c.count
    }))

    res.json({
      totalUsers,
      totalProducts,
      totalScans,
      avgHealthScore,
      recentScans: recentScans.map(s => ({ ...s, id: s._id.toString() })),
      recentProducts: recentProducts.map(p => ({ ...p, id: p.id || p._id.toString() })),
      categoryData
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
