const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  barcode: { type: String, required: true, index: true },
  name: { type: String, default: '' },
  brand: { type: String, default: '' },
  category: { type: String, default: '' },
  price: { type: Number, default: 50 },

  // Health Score & NutriScore
  healthScore: { type: Number, default: null },
  nutriScore: { type: String, default: '' },
  nutriscoreGrade: { type: String, default: '' },
  nutriscore_grade: { type: String, default: '' },
  nutriscore_score: { type: Number, default: null },
  novaGroup: { type: String, default: '' },
  nova_group: { type: String, default: '' },

  // Nutrition Facts
  calories: { type: Number, default: null },
  energy_kcal: { type: Number, default: null },
  fat: { type: Number, default: null },
  fat_g: { type: Number, default: null },
  saturatedFat: { type: Number, default: null },
  saturated_fat_g: { type: Number, default: null },
  carbohydrates: { type: Number, default: null },
  carbohydrates_g: { type: Number, default: null },
  sugar: { type: Number, default: null },
  sugars_g: { type: Number, default: null },
  fiber: { type: Number, default: null },
  fiber_g: { type: Number, default: null },
  protein: { type: Number, default: null },
  protein_g: { type: Number, default: null },
  salt: { type: Number, default: null },
  salt_g: { type: Number, default: null },
  sodium: { type: Number, default: null },
  sodium_g: { type: Number, default: null },

  // Ingredients & Allergens
  ingredients: { type: [String], default: [] },
  ingredientList: { type: [String], default: [] },
  allergens: { type: [String], default: [] },
  concerningIngredients: { type: [String], default: [] },
  tags: { type: [String], default: [] },

  // Metadata
  servingSize: { type: String, default: '100 g' },
  insight: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  image: { type: String, default: '' },

  // CSV copies
  product_name: { type: String, default: '' },
  brands: { type: String, default: '' },
  categories: { type: String, default: '' }
}, {
  timestamps: true
})

// Text index for search
ProductSchema.index({ name: 'text', brand: 'text', category: 'text', barcode: 'text', product_name: 'text' })

module.exports = mongoose.model('Product', ProductSchema)
