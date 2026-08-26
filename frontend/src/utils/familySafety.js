/**
 * Household & Family Member Food Safety Auditor
 * Compares any scanned product or ingredients against User Profile + Family Members
 */

const toArray = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean).map(String)
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

export function auditProductForFamily(product, userProfile = {}, familyMembers = []) {
  try {
    if (!product) return { overallStatus: 'Safe', affectedMembers: [], safeMembers: [], familyAlternatives: [], totalHouseholdCount: 1 }

    const textToScan = [
      product.name || '',
      product.brand || '',
      product.description || '',
      Array.isArray(product.ingredients) ? product.ingredients.join(' ') : (product.ingredients || ''),
      Array.isArray(product.allergens) ? product.allergens.join(' ') : (product.allergens || ''),
      Array.isArray(product.visibleText) ? product.visibleText.join(' ') : ''
    ].join(' ').toLowerCase()

    const nutrients = product.nutrition || product.nutrients || {}
    const sugars = parseFloat(nutrients.sugar || nutrients.sugars || product.sugar || 0)
    const sodium = parseFloat(nutrients.sodium || product.sodium || 0)

    const affectedMembers = []
    const safeMembers = []

    // Helper to check member
    const checkMember = (name, relationship, rawAllergies = [], rawConditions = [], rawDiet = '') => {
      const risks = []
      const allergies = toArray(rawAllergies)
      const conditions = toArray(rawConditions)

      // 1. Check Allergies
      const allergenMap = {
        'peanuts': ['peanut', 'groundnut', 'arachis'],
        'tree nuts': ['almond', 'cashew', 'walnut', 'pistachio', 'hazelnut', 'pecan', 'macadamia', 'brazil nut'],
        'milk': ['milk', 'dairy', 'cheese', 'butter', 'whey', 'casein', 'curd', 'ghee', 'cream', 'lactose', 'yogurt'],
        'eggs': ['egg', 'albumin', 'globulin', 'ovomucin', 'mayonnaise'],
        'gluten': ['wheat', 'gluten', 'barley', 'rye', 'maida', 'atta', 'spelt', 'semolina'],
        'soy': ['soy', 'soya', 'tofu', 'edamame', 'lecithin'],
        'fish': ['fish', 'salmon', 'tuna', 'cod', 'anchovy', 'tilapia'],
        'shellfish': ['shellfish', 'prawn', 'shrimp', 'crab', 'lobster', 'clam', 'oyster'],
        'sesame': ['sesame', 'til', 'tahini'],
        'mustard': ['mustard', 'sarson'],
        'high added sugar': ['sugar', 'glucose', 'fructose', 'syrup', 'caramel', 'dextrose'],
        'high sodium': ['salt', 'sodium', 'monosodium glutamate', 'msg']
      }

      allergies.forEach(allergy => {
        if (!allergy || allergy === 'None') return
        const lowerAllergy = String(allergy).toLowerCase().trim()
        const aliases = allergenMap[lowerAllergy] || [lowerAllergy]
        const foundMatch = aliases.some(alias => {
          const regex = new RegExp(`\\b${alias}\\b`, 'i')
          return regex.test(textToScan)
        })

        if (foundMatch) {
          risks.push({
            type: 'Allergy Trigger',
            severity: 'Harmful',
            detail: `Contains ${allergy} - Direct allergy contraindication.`
          })
        }
      })

      // 2. Check Medical Conditions
      conditions.forEach(cond => {
        if (!cond || cond === 'None') return
        const cLower = String(cond).toLowerCase()

        if (cLower.includes('diabetes')) {
          if (sugars >= 12 || textToScan.includes('sugar') || textToScan.includes('glucose syrup') || textToScan.includes('high fructose')) {
            risks.push({
              type: 'Diabetes Hazard',
              severity: 'Harmful',
              detail: `High sugar content (${sugars > 0 ? `${sugars}g` : 'refined sugars'}) spikes blood glucose.`
            })
          }
        }

        if (cLower.includes('hypertension') || cLower.includes('blood pressure') || cLower.includes('high bp')) {
          if (sodium >= 500 || textToScan.includes('high sodium') || textToScan.includes('salted')) {
            risks.push({
              type: 'Hypertension Risk',
              severity: 'Caution',
              detail: `Elevated sodium levels (${sodium > 0 ? `${sodium}mg` : 'high salt'}) can increase blood pressure.`
            })
          }
        }

        if (cLower.includes('cholesterol') || cLower.includes('heart')) {
          if (textToScan.includes('palm oil') || textToScan.includes('hydrogenated') || textToScan.includes('trans fat')) {
            risks.push({
              type: 'Heart / Cholesterol Warning',
              severity: 'Caution',
              detail: 'Contains hydrogenated fats/palm oil known to increase LDL cholesterol.'
            })
          }
        }

        if (cLower.includes('celiac') || cLower.includes('gluten')) {
          if (textToScan.includes('wheat') || textToScan.includes('gluten') || textToScan.includes('barley')) {
            risks.push({
              type: 'Celiac Disease Risk',
              severity: 'Harmful',
              detail: 'Contains gluten/wheat which damages small intestine lining.'
            })
          }
        }
      })

      if (risks.length > 0) {
        const hasHarmful = risks.some(r => r.severity === 'Harmful')
        affectedMembers.push({
          name: name || 'Member',
          relationship: relationship || 'Family',
          status: hasHarmful ? 'Harmful' : 'Caution',
          trigger: risks.map(r => r.type).join(' & '),
          clinicalDetail: risks.map(r => r.detail).join(' ')
        })
      } else {
        safeMembers.push({ name: name || 'Member', relationship: relationship || 'Family' })
      }
    }

    // 1. Check Primary User
    const uProfile = userProfile || {}
    const uName = uProfile.name || 'You (Primary User)'
    const uAllergies = toArray(uProfile.allergies)
    const uConds = toArray(uProfile.medicalConditions || uProfile.medicalCondition)
    const uDiet = uProfile.dietaryPreferences || uProfile.dietaryPreference || ''
    checkMember(uName, 'Primary User', uAllergies, uConds, uDiet)

    // 2. Check Family Members
    let membersList = familyMembers
    if (!membersList || membersList.length === 0) {
      try {
        const rawUser = localStorage.getItem('foodie_auth_user')
        const uid = rawUser ? JSON.parse(rawUser)?._id : null
        const cacheKey = uid ? `foodie_family_members_${uid}` : 'foodie_family_members_guest'
        const cached = localStorage.getItem(cacheKey) || localStorage.getItem('foodie_family_members')
        if (cached) membersList = JSON.parse(cached)
      } catch (e) {}
    }

    if (Array.isArray(membersList)) {
      membersList.forEach(m => {
        if (!m) return
        const mName = m.name || 'Member'
        const mRel = m.relationship || 'Family'
        const mAllergies = toArray(m.allergies)
        const mConds = toArray(m.healthConditions || m.diseases)
        const mDiet = m.dietaryPreferences || []
        checkMember(mName, mRel, mAllergies, mConds, mDiet)
      })
    }

    const hasAnyHarmful = affectedMembers.some(m => m.status === 'Harmful')
    const hasAnyCaution = affectedMembers.some(m => m.status === 'Caution')

    return {
      overallStatus: hasAnyHarmful ? 'Harmful' : (hasAnyCaution ? 'Caution' : 'Safe'),
      affectedMembers,
      safeMembers,
      totalHouseholdCount: 1 + (Array.isArray(membersList) ? membersList.length : 0)
    }
  } catch (err) {
    console.error('Audit product for family error:', err)
    return { overallStatus: 'Safe', affectedMembers: [], safeMembers: [], familyAlternatives: [], totalHouseholdCount: 1 }
  }
}
