const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

// Configure multer for temp file uploads
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
})
const upload = multer({ storage })

/** POST /api/ocr/paddle — Run local PaddleOCR on uploaded image */
router.post('/paddle', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' })
  }

  const filePath = req.file.path
  const scriptPath = path.join(__dirname, '../scripts/paddle_ocr.py')

  // Run the Python PaddleOCR script
  // Note: We use "python" command. On some systems it might be "python3"
  const command = `python "${scriptPath}" "${filePath}"`

  exec(command, (error, stdout, stderr) => {
    // Always clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp file:', err)
    })

    if (error) {
      console.error('PaddleOCR exec error:', error.message)
      return res.status(500).json({ 
        error: 'PaddleOCR execution failed. Make sure Python is installed and added to PATH.', 
        details: error.message 
      })
    }

    try {
      const match = stdout.match(/__OCR_JSON_OUT__(.*)/)
      if (!match) {
        throw new Error('JSON output marker not found in python stdout')
      }
      const output = JSON.parse(match[1].trim())
      if (output.error) {
        return res.status(500).json({ error: output.error })
      }
      return res.json(output)
    } catch (parseErr) {
      console.error('Failed to parse Python script output:', stdout)
      return res.status(500).json({ 
        error: 'Invalid response from PaddleOCR engine.', 
        details: stdout 
      })
    }
  })
})

module.exports = router
