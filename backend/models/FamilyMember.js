const mongoose = require('mongoose')

const FamilyMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  relationship: {
    type: String,
    default: 'Other'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'Male', 'Female', 'Other'],
    default: 'male'
  },
  age: {
    type: Number,
    default: null
  },
  dob: {
    type: String,
    default: ''
  },
  height: {
    type: Number,
    default: null
  },
  weight: {
    type: Number,
    default: null
  },
  bmi: {
    type: Number,
    default: null
  },
  calories: {
    type: Number,
    default: 2000
  },
  waterGoal: {
    type: String,
    default: '2.5'
  },
  sleepHours: {
    type: Number,
    default: 8
  },
  activityLevel: {
    type: String,
    default: 'moderately_active'
  },
  goal: {
    type: String,
    default: 'maintenance'
  },
  healthConditions: {
    type: [String],
    default: []
  },
  diseases: {
    type: [String],
    default: []
  },
  allergies: {
    type: [String],
    default: []
  },
  dietaryPreferences: {
    type: [String],
    default: []
  },
  recommendations: {
    type: [String],
    default: []
  },
  scanHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan'
  }]
}, {
  timestamps: true
})

module.exports = mongoose.model('FamilyMember', FamilyMemberSchema)
