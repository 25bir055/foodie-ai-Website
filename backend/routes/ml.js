const express = require('express')
const router = express.Router()
const { predictHealthScore, loadModel } = require('../services/mlService')
const { calculatePersonalizedScore } = require('../services/personalization')

// Initialize the model on startup
loadModel()

/**
 * POST /api/ml/predict-health
 * 
 * Predicts the health score of a product based on its nutritional values
 * and applies personalization based on the user's profile.
 */
router.post('/predict-health', (req, res) => {
  try {
    const nutritionData = req.body.nutrition || req.body
    const userProfile = req.body.profile || null

    // Ensure we received data
    if (!nutritionData || typeof nutritionData !== 'object') {
      return res.status(400).json({ error: 'Nutrition data is required in the request body' })
    }

    const basePredictedScore = predictHealthScore(nutritionData)

    if (basePredictedScore === null) {
      return res.status(503).json({ 
        error: 'ML Model is not available',
        message: 'The Random Forest model has not been trained yet. Please run the training script.'
      })
    }

    // Apply personalization
    const { score: personalizedScore, insights } = calculatePersonalizedScore(nutritionData, userProfile, basePredictedScore)

    // Assign a grade based on the predicted score (similar to NutriScore logic)
    // 80+ = A, 60-79 = B, 45-59 = C, 30-44 = D, <30 = E
    let grade = 'e'
    if (personalizedScore >= 80) grade = 'a'
    else if (personalizedScore >= 60) grade = 'b'
    else if (personalizedScore >= 45) grade = 'c'
    else if (personalizedScore >= 30) grade = 'd'

    res.json({
      status: 'success',
      baseHealthScore: basePredictedScore,
      predictedHealthScore: personalizedScore,
      suggestedGrade: grade,
      insights: insights,
      model: 'RandomForestRegression + PersonalizationRules'
    })

  } catch (error) {
    console.error('ML Route Error:', error)
    res.status(500).json({ error: 'Failed to predict health score' })
  }
})

module.exports = router
