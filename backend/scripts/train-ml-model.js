/**
 * train-ml-model.js
 * 
 * Trains a Random Forest Regression model using ml-random-forest
 * to predict Health Scores based on nutritional values.
 */

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config()
const { RandomForestRegression } = require('ml-random-forest')

const Product = require('../models/Product')
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/foodie-ai'
const MODEL_PATH = path.join(__dirname, 'health_model.json')

async function trainModel() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  🧠 Train Health Score ML Model (Random Forest)  ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Fetch products that have a valid healthScore and nutrition data
    const products = await Product.find({
      healthScore: { $ne: null },
      calories: { $ne: null },
      fat: { $ne: null },
      protein: { $ne: null },
      carbohydrates: { $ne: null }
    }).lean()

    console.log(`📦 Found ${products.length} suitable products for training`)

    if (products.length === 0) {
      console.error('❌ Not enough data to train the model.')
      process.exit(1)
    }

    const X = [] // Features
    const Y = [] // Targets (Health Score)

    // Feature order: Calories, Fat, SaturatedFat, Carbohydrates, Sugar, Fiber, Protein, Sodium
    products.forEach(p => {
      const features = [
        p.calories || 0,
        p.fat || 0,
        p.saturatedFat || 0,
        p.carbohydrates || 0,
        p.sugar || 0,
        p.fiber || 0,
        p.protein || 0,
        p.sodium || 0
      ]
      X.push(features)
      Y.push(p.healthScore)
    })

    console.log('⚙️  Training Random Forest Regressor...')
    
    const options = {
      seed: 42,
      maxFeatures: 1.0,
      replacement: false,
      nEstimators: 100
    }

    const rf = new RandomForestRegression(options)
    rf.train(X, Y)

    console.log('✅ Model trained successfully')

    // Evaluate on the training set to get an idea of accuracy
    const predictions = rf.predict(X)
    let mae = 0
    for (let i = 0; i < Y.length; i++) {
      mae += Math.abs(Y[i] - predictions[i])
    }
    mae = mae / Y.length

    console.log(`📊 Training Mean Absolute Error (MAE): ${mae.toFixed(2)} points (out of 100)`)

    // Save the model
    const modelJSON = rf.toJSON()
    fs.writeFileSync(MODEL_PATH, JSON.stringify(modelJSON))

    console.log(`💾 Model saved to: ${MODEL_PATH}\n`)

  } catch (error) {
    console.error('❌ Error during training:', error)
  } finally {
    await mongoose.disconnect()
  }
}

trainModel()
