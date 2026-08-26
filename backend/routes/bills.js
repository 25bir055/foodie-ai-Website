const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authMiddleware, optionalAuth } = require('../middleware/auth')
const {
  analyzeAndSaveBill,
  getUserBills,
  getBillById,
  deleteBill
} = require('../controllers/billController')

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `bill_${Date.now()}_${file.originalname || 'receipt.jpg'}`)
})

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
})

// POST /api/bills/analyze - Analyze grocery bill, compare with user health & auto-save
router.post('/analyze', optionalAuth, upload.single('image'), analyzeAndSaveBill)

// GET /api/bills - Get all saved bills for logged-in user
router.get('/', optionalAuth, getUserBills)

// GET /api/bills/:id - Get specific bill details
router.get('/:id', optionalAuth, getBillById)

// DELETE /api/bills/:id - Delete a saved bill
router.delete('/:id', optionalAuth, deleteBill)

module.exports = router
