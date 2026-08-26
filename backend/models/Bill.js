const mongoose = require('mongoose')

const AffectedMemberSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  relationship: { type: String, default: '' },
  status: { type: String, default: 'Harmful' },
  trigger: { type: String, default: '' },
  clinicalDetail: { type: String, default: '' }
}, { _id: false })

const BillItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  category: { type: String, default: 'Grocery' },
  quantity: { type: String, default: '1' },
  price: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Safe', 'Caution', 'Harmful'], 
    default: 'Safe' 
  },
  healthScore: { type: Number, default: 70 },
  riskReason: { type: String, default: '' },
  matchedAllergens: [{ type: String }],
  matchedConditions: [{ type: String }],
  affectedMembers: [AffectedMemberSchema],
  safeAlternatives: [{
    name: { type: String, required: true },
    reason: { type: String, default: '' },
    category: { type: String, default: 'Healthy Alternative' },
    healthScore: { type: Number, default: 90 }
  }]
})

const BillSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  storeName: {
    type: String,
    default: 'Supermarket / Grocery Store'
  },
  billDate: {
    type: String,
    default: () => new Date().toLocaleDateString()
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: '₹'
  },
  overallSafety: {
    type: String,
    enum: ['Safe', 'Caution', 'Harmful'],
    default: 'Safe'
  },
  cartHealthScore: {
    type: Number,
    default: 75
  },
  summary: {
    type: String,
    default: ''
  },
  items: [BillItemSchema],
  safeCount: { type: Number, default: 0 },
  cautionCount: { type: Number, default: 0 },
  harmfulCount: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  rawOcrText: { type: String, default: '' },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
})

module.exports = mongoose.model('Bill', BillSchema)
