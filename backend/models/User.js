const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    default: 'Foodie User'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profile: {
    // Personal
    age: { type: Number, default: 27 },
    dob: { type: Date, default: null },
    gender: { type: String, default: '' },
    
    // Body
    height: { type: Number, default: 165 }, // in cm
    weight: { type: Number, default: 60 },  // in kg
    bmi: { type: Number, default: null },

    // Lifestyle
    activityLevel: { type: String, default: 'Moderately Active' },
    waterGoal: { type: Number, default: 2.5 }, // in L
    sleepHours: { type: Number, default: 8 },

    // Health
    medicalConditions: { type: [String], default: [] }, // Diseases
    allergies: { type: [String], default: [] },
    dietaryPreferences: { type: [String], default: ['Vegetarian'] }, // Food Preference
    calorieGoal: { type: Number, default: 2100 },
    goals: { type: [String], default: ['Low Sugar', 'High Protein'] }, // Dietary Goal

    // Location
    country: { type: String, default: '' },
    state: { type: String, default: '' },
    preferredLanguage: { type: String, default: 'English' },

    profileCompleted: { type: Boolean, default: false }
  },
  favorites: {
    type: [String],
    default: []
  },
  shoppingList: {
    type: Array,
    default: []
  }
}, {
  timestamps: true
})

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password helper
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', UserSchema)
