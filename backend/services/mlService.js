/**
 * mlService.js
 * 
 * Service for loading the trained Random Forest model and making health score predictions.
 */

const fs = require('fs')
const path = require('path')
const { RandomForestRegression } = require('ml-random-forest')

const MODEL_PATH = path.join(__dirname, '../scripts/health_model.json')
let model = null

/**
 * Loads the ML model from disk if it exists.
 */
function loadModel() {
  if (model) return model

  try {
    if (fs.existsSync(MODEL_PATH)) {
      const modelJSON = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'))
      model = RandomForestRegression.load(modelJSON)
      console.log('✅ ML Model (Random Forest) loaded successfully')
      return model
    } else {
      console.warn('⚠️ ML Model not found at', MODEL_PATH)
      console.warn('⚠️ Run `node scripts/train-ml-model.js` to train it.')
      return null
    }
  } catch (error) {
    console.error('❌ Failed to load ML Model:', error)
    return null
  }
}

/**
 * Predicts the health score for a given set of nutritional values.
 * @param {Object} nutrition 
 * @returns {Number|null} Predicted health score (0-100) or null if model unavailable
 */
function predictHealthScore(nutrition = {}) {
  const rf = loadModel()
  if (!rf) return null

  // Ensure all features are present and are numbers, defaulting to 0
  const features = [
    Number(nutrition.calories) || 0,
    Number(nutrition.fat) || 0,
    Number(nutrition.saturatedFat) || 0,
    Number(nutrition.carbohydrates) || 0,
    Number(nutrition.sugar) || 0,
    Number(nutrition.fiber) || 0,
    Number(nutrition.protein) || 0,
    Number(nutrition.sodium) || 0
  ]

  try {
    const prediction = rf.predict([features])
    // The result is an array with one value
    let score = prediction[0]
    
    // Clamp to 0-100 just in case
    score = Math.max(0, Math.min(100, score))
    
    return Math.round(score)
  } catch (error) {
    console.error('❌ ML Prediction error:', error)
    return null
  }
}

module.exports = {
  loadModel,
  predictHealthScore
}
