const mongoose = require('mongoose')

const PrescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  doctorName: {
    type: String,
    default: ''
  },
  clinicName: {
    type: String,
    default: ''
  },
  patientName: {
    type: String,
    default: ''
  },
  prescriptionDate: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String, // URL or dataUrl to uploaded image
    default: ''
  },
  ocrText: {
    type: String, // Extracted raw text
    default: ''
  },
  detectedConditions: {
    type: [String], // e.g. ['Diabetes', 'Hypertension', 'High Cholesterol']
    default: []
  },
  restrictedNutrients: {
    type: [String], // e.g. ['High Sugar', 'High Sodium', 'Saturated Fat']
    default: []
  },
  avoidFoods: {
    type: [String], // e.g. ['Sweets', 'Pickles & Salty Snacks', 'Grapefruit']
    default: []
  },
  medicines: [{
    name: String,
    dosage: String,
    frequency: String,
    purpose: String,
    timing: String
  }],
  aiExplanation: {
    type: String, // AI explanation of the prescription
    default: ''
  },
  foodInteractions: {
    type: [String], // Food interaction warnings
    default: []
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Prescription', PrescriptionSchema)
