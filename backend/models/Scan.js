const mongoose = require('mongoose')

const ScanSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'anonymous',
    index: true
  },
  barcode: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    default: ''
  },
  healthScore: {
    type: Number,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
})

module.exports = mongoose.model('Scan', ScanSchema)
