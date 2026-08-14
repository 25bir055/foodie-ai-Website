// Realistic sample data — swap fetchProduct()/searchProducts() for Open Food Facts calls when ready.

export const PRODUCTS = [
  {
    id: 'p1',
    barcode: '8901058851126',
    name: 'Crunchy Masala Oats',
    brand: 'FieldFresh',
    category: 'Breakfast & Cereal',
    image: '🥣',
    price: 149,
    healthScore: 78,
    calories: 340,
    protein: 11,
    carbs: 58,
    sugar: 4,
    fat: 7,
    saturatedFat: 1.5,
    fiber: 9,
    sodium: 380,
    servingSize: '100 g',
    allergens: ['Gluten'],
    ingredients: [
      'Rolled oats', 'Onion flakes', 'Iodised salt', 'Turmeric', 'Cumin',
      'Sunflower oil', 'Dehydrated vegetables', 'Natural spices', 'Citric acid'
    ],
    concerningIngredients: [],
    insight: 'A genuinely good everyday breakfast — high fibre, moderate protein, and sugar stays low. Sodium runs a little high for a single serving, so pair it with a low-salt lunch.',
    tags: ['High Fibre', 'Low Sugar']
  },
  {
    id: 'p2',
    barcode: '7622210996488',
    name: 'Choco Fudge Cream Biscuits',
    brand: 'Sweetline',
    category: 'Snacks & Biscuits',
    image: '🍪',
    price: 40,
    healthScore: 32,
    calories: 502,
    protein: 5,
    carbs: 68,
    sugar: 34,
    fat: 22,
    saturatedFat: 11,
    fiber: 1.2,
    sodium: 210,
    servingSize: '100 g',
    allergens: ['Milk', 'Gluten', 'Soy'],
    ingredients: [
      'Refined wheat flour', 'Sugar', 'Palm oil', 'Cocoa solids', 'Invert syrup',
      'Milk solids', 'Emulsifier (E322, E471)', 'Raising agent (E503)', 'Artificial flavour', 'Salt'
    ],
    concerningIngredients: ['Palm oil', 'Emulsifier (E322, E471)', 'Artificial flavour'],
    insight: 'This is a dessert-tier snack, not an everyday one. A third of it is sugar and saturated fat is high — fine occasionally, but it will eat most of a daily sugar budget in one sitting.',
    tags: ['High Sugar Alert', 'High Saturated Fat', 'Contains Allergens']
  },
  {
    id: 'p3',
    barcode: '8904004400152',
    name: 'Roasted Chana Snack Mix',
    brand: 'Farmhouse Bites',
    category: 'Snacks & Biscuits',
    image: '🫘',
    price: 60,
    healthScore: 84,
    calories: 380,
    protein: 19,
    carbs: 47,
    sugar: 2,
    fat: 11,
    saturatedFat: 1.8,
    fiber: 12,
    sodium: 320,
    servingSize: '100 g',
    allergens: [],
    ingredients: ['Roasted chickpeas', 'Peanuts', 'Curry leaves', 'Sunflower oil', 'Black salt', 'Red chilli powder'],
    concerningIngredients: [],
    insight: 'Excellent protein-to-calorie ratio for a packaged snack, and fibre is well above average. A great swap if you usually reach for fried chips.',
    tags: ['High Protein', 'Good Source of Fiber']
  },
  {
    id: 'p4',
    barcode: '8906079940017',
    name: 'Classic Cola',
    brand: 'FizzUp',
    category: 'Beverages',
    image: '🥤',
    price: 45,
    healthScore: 18,
    calories: 180,
    protein: 0,
    carbs: 45,
    sugar: 44,
    fat: 0,
    saturatedFat: 0,
    fiber: 0,
    sodium: 30,
    servingSize: '500 ml bottle',
    allergens: [],
    ingredients: ['Carbonated water', 'Sugar', 'Caramel colour (E150d)', 'Phosphoric acid', 'Caffeine', 'Natural flavouring'],
    concerningIngredients: ['Caramel colour (E150d)', 'Phosphoric acid'],
    insight: 'Almost all of the calories here come from sugar — a single bottle is close to the WHO daily added-sugar limit on its own. Fine as an occasional treat, not a daily habit.',
    tags: ['High Sugar Alert', 'Low Nutrient Density']
  },
  {
    id: 'p5',
    barcode: '8901491101273',
    name: 'Greek Style Curd',
    brand: 'DairyPure',
    category: 'Dairy',
    image: '🥣',
    price: 55,
    healthScore: 88,
    calories: 98,
    protein: 10,
    carbs: 4,
    sugar: 3.5,
    fat: 4.5,
    saturatedFat: 2.9,
    fiber: 0,
    sodium: 45,
    servingSize: '100 g',
    allergens: ['Milk'],
    ingredients: ['Toned milk', 'Live active cultures'],
    concerningIngredients: [],
    insight: 'A clean, minimally processed protein source with live cultures and almost no added sugar. One of the better everyday dairy picks in this category.',
    tags: ['High Protein', 'Low Sodium']
  },
  {
    id: 'p6',
    barcode: '8901063020015',
    name: 'Multigrain Bread',
    brand: 'BakeHouse',
    category: 'Bakery',
    image: '🍞',
    price: 55,
    healthScore: 71,
    calories: 265,
    protein: 9,
    carbs: 46,
    sugar: 3,
    fat: 4,
    saturatedFat: 0.8,
    fiber: 6.5,
    sodium: 460,
    servingSize: '100 g',
    allergens: ['Gluten', 'Soy'],
    ingredients: ['Whole wheat flour', 'Water', 'Mixed seeds (flax, sunflower, oats)', 'Yeast', 'Sugar', 'Salt', 'Soy lecithin', 'Preservative (E282)'],
    concerningIngredients: ['Preservative (E282)'],
    insight: 'Solid fibre content thanks to whole grain and seeds. Sodium is on the higher side for bread — check it against your other meals if you\'re watching salt.',
    tags: ['Good Source of Fiber', 'Contains Allergens']
  },
  {
    id: 'p7',
    barcode: '8901030811123',
    name: 'Instant Noodles - Masala',
    brand: 'QuickBite',
    category: 'Ready-to-eat',
    image: '🍜',
    price: 14,
    healthScore: 28,
    calories: 450,
    protein: 9,
    carbs: 58,
    sugar: 2,
    fat: 18,
    saturatedFat: 8.5,
    fiber: 2,
    sodium: 980,
    servingSize: '1 pack (70 g dry)',
    allergens: ['Gluten', 'Soy'],
    ingredients: ['Refined wheat flour', 'Palm oil', 'Salt', 'Wheat gluten', 'Flavour enhancer (E621)', 'Dehydrated vegetables', 'Spices', 'Acidity regulator (E501)'],
    concerningIngredients: ['Palm oil', 'Flavour enhancer (E621)', 'Acidity regulator (E501)'],
    insight: 'Sodium is the headline issue — one pack uses up nearly two-thirds of a full day\'s recommended salt. Convenient, but not something to build a daily habit around.',
    tags: ['High Sodium', 'High Saturated Fat']
  },
  {
    id: 'p8',
    barcode: '8904191760023',
    name: 'Cold-Pressed Almond Milk',
    brand: 'PureLeaf',
    category: 'Beverages',
    image: '🥛',
    price: 120,
    healthScore: 80,
    calories: 60,
    protein: 2,
    carbs: 3,
    sugar: 1,
    fat: 4.5,
    saturatedFat: 0.4,
    fiber: 1,
    sodium: 65,
    servingSize: '200 ml',
    allergens: ['Nuts'],
    ingredients: ['Filtered water', 'Almonds (7%)', 'Sea salt', 'Natural vanilla extract'],
    concerningIngredients: [],
    insight: 'Short, recognisable ingredient list and unsweetened. A good dairy alternative if you\'re not managing a nut allergy.',
    tags: ['Low Sugar', 'Contains Allergens']
  },
  {
    id: 'p9',
    barcode: '8906060050012',
    name: 'Protein Granola Bar',
    brand: 'FitSnack',
    category: 'Snacks & Biscuits',
    image: '🍫',
    price: 80,
    healthScore: 72,
    calories: 220,
    protein: 15,
    carbs: 28,
    sugar: 8,
    fat: 7,
    saturatedFat: 2.5,
    fiber: 5,
    sodium: 180,
    servingSize: '1 bar (55 g)',
    allergens: ['Milk', 'Nuts', 'Gluten'],
    ingredients: ['Oats', 'Whey protein isolate', 'Honey', 'Dark chocolate chips', 'Peanut butter', 'Flaxseeds', 'Natural flavour'],
    concerningIngredients: [],
    insight: 'Solid protein content for a snack bar, with reasonable sugar levels. Makes a good post-workout snack or breakfast replacement when you\'re in a rush.',
    tags: ['High Protein', 'Good Source of Fiber']
  },
  {
    id: 'p10',
    barcode: '8904072300027',
    name: 'Orange Juice - No Added Sugar',
    brand: 'TropicFresh',
    category: 'Beverages',
    image: '🍊',
    price: 90,
    healthScore: 65,
    calories: 110,
    protein: 1.5,
    carbs: 26,
    sugar: 22,
    fat: 0.3,
    saturatedFat: 0,
    fiber: 0.5,
    sodium: 10,
    servingSize: '250 ml',
    allergens: [],
    ingredients: ['100% orange juice (not from concentrate)', 'Vitamin C', 'Vitamin D3'],
    concerningIngredients: [],
    insight: 'No added sugar, but natural fruit sugar is still high at 22g per serving. The vitamin C is a bonus, but whole fruit is a better choice — you get the fibre too.',
    tags: ['No Added Sugar', 'Low Sodium']
  },
  {
    id: 'p11',
    barcode: '8901030007056',
    name: 'Sprouts Salad Mix',
    brand: 'FreshStart',
    category: 'Ready-to-eat',
    image: '🥗',
    price: 75,
    healthScore: 95,
    calories: 120,
    protein: 8,
    carbs: 18,
    sugar: 3,
    fat: 2,
    saturatedFat: 0.3,
    fiber: 7,
    sodium: 85,
    servingSize: '150 g pack',
    allergens: [],
    ingredients: ['Moong sprouts', 'Chickpea sprouts', 'Lemon juice', 'Rock salt', 'Coriander', 'Green chilli'],
    concerningIngredients: [],
    insight: 'One of the cleanest packaged foods available — minimal processing, excellent fibre and protein, very low sodium. Highly recommended as a snack or light meal.',
    tags: ['High Protein', 'Good Source of Fiber', 'Low Sodium', 'Low Sugar']
  },
  {
    id: 'p12',
    barcode: '8901063111023',
    name: 'Dark Chocolate 70%',
    brand: 'CocoaBliss',
    category: 'Snacks & Biscuits',
    image: '🍫',
    price: 180,
    healthScore: 67,
    calories: 580,
    protein: 8,
    carbs: 30,
    sugar: 18,
    fat: 42,
    saturatedFat: 25,
    fiber: 11,
    sodium: 12,
    servingSize: '100 g',
    allergens: ['Milk', 'Nuts'],
    ingredients: ['Cocoa mass', 'Sugar', 'Cocoa butter', 'Emulsifier (soy lecithin)', 'Vanilla extract', 'Milk solids'],
    concerningIngredients: [],
    insight: 'Dark chocolate at 70%+ is genuinely beneficial in small portions — antioxidants, minerals, and fibre. The key is keeping servings to 20-30g. Calories add up fast at larger amounts.',
    tags: ['Good Source of Fiber', 'Low Sodium']
  }
]

export const RECENT_SCANS = [
  { ...PRODUCTS[0], scannedAt: 'Today, 8:12 AM' },
  { ...PRODUCTS[2], scannedAt: 'Yesterday, 6:40 PM' },
  { ...PRODUCTS[4], scannedAt: 'Yesterday, 1:05 PM' },
  { ...PRODUCTS[1], scannedAt: '2 days ago' },
  { ...PRODUCTS[8], scannedAt: '3 days ago' }
]

export const FAVORITES = [PRODUCTS[2], PRODUCTS[4], PRODUCTS[7], PRODUCTS[10]]

export const SHOPPING_LIST_INITIAL = [
  { ...PRODUCTS[0], qty: 2, purchased: false },
  { ...PRODUCTS[4], qty: 3, purchased: false },
  { ...PRODUCTS[5], qty: 1, purchased: true },
  { ...PRODUCTS[7], qty: 1, purchased: false },
  { ...PRODUCTS[8], qty: 2, purchased: false }
]

export const WEEKLY_NUTRITION = [
  { day: 'Mon', calories: 1820, target: 2100, score: 74 },
  { day: 'Tue', calories: 1950, target: 2100, score: 69 },
  { day: 'Wed', calories: 2040, target: 2100, score: 81 },
  { day: 'Thu', calories: 1760, target: 2100, score: 88 },
  { day: 'Fri', calories: 2210, target: 2100, score: 62 },
  { day: 'Sat', calories: 2380, target: 2100, score: 58 },
  { day: 'Sun', calories: 1990, target: 2100, score: 76 }
]

export const MACROS_TODAY = [
  { name: 'Protein', value: 62, goal: 90, unit: 'g', color: '#4CAE7A' },
  { name: 'Carbs',   value: 210, goal: 260, unit: 'g', color: '#E3A23D' },
  { name: 'Sugar',   value: 38,  goal: 50,  unit: 'g', color: '#D9534F' },
  { name: 'Fat',     value: 54,  goal: 70,  unit: 'g', color: '#3E7CB1' },
  { name: 'Fiber',   value: 21,  goal: 30,  unit: 'g', color: '#173C2C' }
]

export const AI_SUGGESTED_QUESTIONS = [
  'Is this product healthy?',
  'How much sugar should I consume daily?',
  'Suggest a healthier alternative.',
  'Is this suitable for weight management?',
  'What ingredients should I avoid?',
  'Check for allergens in this product.',
  'What is the protein content?'
]

// AI Food Insight tags — shown on dashboard
export const AI_INSIGHTS = [
  { label: 'High Sugar Alert',      icon: '🍬', color: '#D9534F', bg: '#FBEAE9', products: ['Classic Cola', 'Choco Fudge Cream Biscuits'] },
  { label: 'Good Source of Fiber',  icon: '🌾', color: '#2C7C51', bg: '#EAF3EE', products: ['Roasted Chana Snack Mix', 'Multigrain Bread'] },
  { label: 'High Protein',          icon: '💪', color: '#3E7CB1', bg: '#E8F0F8', products: ['Greek Style Curd', 'Protein Granola Bar'] },
  { label: 'Low Sodium',            icon: '🧂', color: '#2C7C51', bg: '#EAF3EE', products: ['Greek Style Curd', 'Dark Chocolate 70%'] },
  { label: 'Contains Allergens',    icon: '⚠️', color: '#B8791A', bg: '#FBF3E4', products: ['Multigrain Bread', 'Choco Fudge Cream Biscuits'] },
  { label: 'High Sodium',           icon: '🚨', color: '#D9534F', bg: '#FBEAE9', products: ['Instant Noodles - Masala'] }
]

export function scoreLabel(score) {
  if (score >= 70) return { label: 'Healthy',  color: '#2C7C51', bg: '#EAF3EE' }
  if (score >= 45) return { label: 'Moderate', color: '#B8791A', bg: '#FBF3E4' }
  return               { label: 'Poor',     color: '#B84540', bg: '#FBEAE9' }
}

export function findByBarcode(barcode) {
  return PRODUCTS.find((p) => p.barcode === barcode) ?? null
}

export function findById(id) {
  return PRODUCTS.find((p) => p.id === id) ?? null
}

export function betterAlternatives(product) {
  return PRODUCTS
    .filter((p) => p.category === product.category && p.id !== product.id && p.healthScore > product.healthScore)
    .sort((a, b) => b.healthScore - a.healthScore)
    .slice(0, 3)
}

export const ADMIN_STATS = {
  totalUsers: 12480,
  totalProducts: PRODUCTS.length * 640,
  totalScans: 58230,
  avgHealthScore: 61,
  mostScanned: [
    { name: 'Classic Cola',            scans: 3120 },
    { name: 'Instant Noodles - Masala', scans: 2870 },
    { name: 'Crunchy Masala Oats',     scans: 2410 },
    { name: 'Roasted Chana Snack Mix', scans: 1990 },
    { name: 'Greek Style Curd',        scans: 1745 }
  ],
  scansByDay: [
    { day: 'Mon', scans: 780 },
    { day: 'Tue', scans: 920 },
    { day: 'Wed', scans: 1100 },
    { day: 'Thu', scans: 860 },
    { day: 'Fri', scans: 1230 },
    { day: 'Sat', scans: 1560 },
    { day: 'Sun', scans: 1045 }
  ],
  categoryBreakdown: [
    { category: 'Snacks & Biscuits', count: 18430 },
    { category: 'Beverages',         count: 14200 },
    { category: 'Breakfast & Cereal', count: 9800 },
    { category: 'Dairy',             count: 7200 },
    { category: 'Ready-to-eat',      count: 5100 },
    { category: 'Bakery',            count: 3500 }
  ]
}

export const ADMIN_USERS = [
  { id: 'u1', name: 'Ananya Rao',           email: 'ananya.rao@example.com',     scans: 142, joined: 'Jan 2026', status: 'Active'   },
  { id: 'u2', name: 'Karthik Subramaniam',  email: 'karthik.s@example.com',      scans: 89,  joined: 'Feb 2026', status: 'Active'   },
  { id: 'u3', name: 'Meera Pillai',         email: 'meera.pillai@example.com',   scans: 231, joined: 'Nov 2025', status: 'Active'   },
  { id: 'u4', name: 'Rohan Verma',          email: 'rohan.verma@example.com',    scans: 54,  joined: 'Apr 2026', status: 'Inactive' },
  { id: 'u5', name: 'Fatima Sheikh',        email: 'fatima.sheikh@example.com',  scans: 176, joined: 'Mar 2026', status: 'Active'   },
  { id: 'u6', name: 'Arjun Nair',           email: 'arjun.nair@example.com',     scans: 310, joined: 'Dec 2025', status: 'Active'   },
  { id: 'u7', name: 'Priya Patel',          email: 'priya.patel@example.com',    scans: 67,  joined: 'May 2026', status: 'Active'   }
]
