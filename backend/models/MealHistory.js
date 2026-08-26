const mongoose = require('mongoose')

const MealHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  totalCalories: {
    type: Number,
    default: 0
  },
  waterIntake: {
    type: Number, // in ml
    default: 0
  },
  meals: {
    breakfast: [{ name: String, calories: Number, productId: String }],
    lunch: [{ name: String, calories: Number, productId: String }],
    dinner: [{ name: String, calories: Number, productId: String }],
    snacks: [{ name: String, calories: Number, productId: String }]
  }
}, {
  timestamps: true
})

// Compound index to ensure one record per user per day
MealHistorySchema.index({ userId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('MealHistory', MealHistorySchema)
