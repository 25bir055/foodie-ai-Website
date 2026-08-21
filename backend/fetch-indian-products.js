/**
 * fetch-indian-products.js
 * 
 * Downloads Indian packaged food products from OpenFoodFacts API
 * and saves them as products_new.csv
 * 
 * Run: npm run fetch-data
 */

const fs = require('fs')
const path = require('path')

const OUTPUT_CSV = path.join(__dirname, 'products_new.csv')
const MAX_PRODUCTS = 1000
const PAGE_SIZE = 100
const DELAY_MS = 1500 // delay between API calls to respect rate limits

// ── Search Strategies ──────────────────────────────────────────────────────

const SEARCH_QUERIES = [
  // Country-based searches
  { tag: 'countries', value: 'india', type: 'contains' },
  // Popular Indian categories
  { tag: 'categories', value: 'snacks', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'dairy', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'beverages', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'cereals', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'biscuits', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'chocolates', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'instant-noodles', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'spices', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'chips', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'breads', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'sweets', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'juices', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'tea', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'coffee', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'oils', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'rice', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'flour', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'pickles', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'sauces', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'frozen-foods', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'peanut-butters', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'honey', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'nuts', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'dried-fruits', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'milks', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'yogurts', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'cheese', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'ready-meals', type: 'contains', extra: '&countries_tags_en=india' },
  { tag: 'categories', value: 'lentils', type: 'contains', extra: '&countries_tags_en=india' },
  // Brand-based searches for popular Indian brands
  { tag: 'brands', value: 'amul', type: 'contains' },
  { tag: 'brands', value: 'parle', type: 'contains' },
  { tag: 'brands', value: 'britannia', type: 'contains' },
  { tag: 'brands', value: 'dabur', type: 'contains' },
  { tag: 'brands', value: 'haldiram', type: 'contains' },
  { tag: 'brands', value: 'itc', type: 'contains' },
  { tag: 'brands', value: 'nestle-india', type: 'contains' },
  { tag: 'brands', value: 'mdh', type: 'contains' },
  { tag: 'brands', value: 'everest', type: 'contains' },
  { tag: 'brands', value: 'tata', type: 'contains' },
  { tag: 'brands', value: 'patanjali', type: 'contains' },
  { tag: 'brands', value: 'maggi', type: 'contains' },
  { tag: 'brands', value: 'kissan', type: 'contains' },
  { tag: 'brands', value: 'sunfeast', type: 'contains' },
  { tag: 'brands', value: 'kurkure', type: 'contains' },
  { tag: 'brands', value: 'bingo', type: 'contains' },
  { tag: 'brands', value: 'lays', type: 'contains' },
  { tag: 'brands', value: 'cadbury', type: 'contains' },
  { tag: 'brands', value: 'maaza', type: 'contains' },
  { tag: 'brands', value: 'frooti', type: 'contains' },
  { tag: 'brands', value: 'real', type: 'contains' },
  { tag: 'brands', value: 'paper-boat', type: 'contains' },
  { tag: 'brands', value: 'saffola', type: 'contains' },
  { tag: 'brands', value: 'fortune', type: 'contains' },
  { tag: 'brands', value: 'aashirvaad', type: 'contains' },
  { tag: 'brands', value: 'mother-dairy', type: 'contains' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function safeNum(val) {
  if (val === undefined || val === null || val === '') return 0
  const n = Number(val)
  return Number.isNaN(n) ? 0 : Math.round(n * 1000000) / 1000000
}

function escapeCSV(val) {
  if (val === undefined || val === null) return ''
  const str = String(val).replace(/\r?\n/g, ' ').trim()
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function computeNovaLabel(novaGroup) {
  const labels = {
    1: '1 - Unprocessed or minimally processed foods',
    2: '2 - Processed culinary ingredients',
    3: '3 - Processed foods',
    4: '4 - Ultra processed food and drink products'
  }
  return labels[novaGroup] || ''
}

/**
 * Parse an OFF product object into our CSV row format
 */
function parseProduct(p) {
  const barcode = String(p.code || '').trim()
  const productName = (p.product_name || p.product_name_en || '').trim()

  if (!barcode || barcode.length < 8 || !productName || productName.length < 2) {
    return null
  }

  const nutriments = p.nutriments || {}
  const brands = (p.brands || '').trim()
  const categories = (p.categories || '').trim()
  const ingredients = (p.ingredients_text || p.ingredients_text_en || '').trim()

  const energy_kcal = safeNum(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'])
  const fat_g = safeNum(nutriments.fat_100g || nutriments.fat)
  const saturated_fat_g = safeNum(nutriments['saturated-fat_100g'] || nutriments['saturated-fat'])
  const carbohydrates_g = safeNum(nutriments.carbohydrates_100g || nutriments.carbohydrates)
  const sugars_g = safeNum(nutriments.sugars_100g || nutriments.sugars)
  const fiber_g = safeNum(nutriments.fiber_100g || nutriments.fiber)
  const protein_g = safeNum(nutriments.proteins_100g || nutriments.proteins)
  const salt_g = safeNum(nutriments.salt_100g || nutriments.salt)
  const sodium_g = safeNum(nutriments.sodium_100g || nutriments.sodium)

  const nutriscore_grade = (p.nutriscore_grade || p.nutrition_grades || '').toLowerCase()
  const nutriscore_score = safeNum(p.nutriscore_score)
  const nova_group = p.nova_group ? computeNovaLabel(Number(p.nova_group)) : ''

  // Filter out products with completely missing core nutrition
  if (energy_kcal === 0 && fat_g === 0 && protein_g === 0 && carbohydrates_g === 0) {
    return null
  }

  return {
    barcode,
    product_name: productName,
    brands,
    categories,
    ingredients,
    energy_kcal,
    fat_g,
    saturated_fat_g,
    carbohydrates_g,
    sugars_g,
    fiber_g,
    protein_g,
    salt_g,
    sodium_g,
    nutriscore_grade,
    nutriscore_score,
    nova_group
  }
}

// ── CSV Writer ─────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'barcode', 'product_name', 'brands', 'categories', 'ingredients',
  'energy_kcal', 'fat_g', 'saturated_fat_g', 'carbohydrates_g', 'sugars_g',
  'fiber_g', 'protein_g', 'salt_g', 'sodium_g',
  'nutriscore_grade', 'nutriscore_score', 'nova_group'
]

function productToCSVRow(product) {
  return CSV_HEADERS.map(h => escapeCSV(product[h])).join(',')
}

// ── Fetch from OpenFoodFacts ───────────────────────────────────────────────

async function fetchPage(query, page) {
  const baseUrl = 'https://world.openfoodfacts.org/cgi/search.pl'
  const params = new URLSearchParams({
    action: 'process',
    json: 'true',
    page_size: String(PAGE_SIZE),
    page: String(page),
    [`tagtype_0`]: query.tag,
    [`tag_contains_0`]: query.type,
    [`tag_0`]: query.value,
    fields: [
      'code', 'product_name', 'product_name_en', 'brands', 'categories',
      'ingredients_text', 'ingredients_text_en',
      'nutriments', 'nutriscore_grade', 'nutrition_grades', 'nutriscore_score',
      'nova_group', 'countries_tags'
    ].join(',')
  })

  const url = `${baseUrl}?${params.toString()}${query.extra || ''}`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FoodieAI/1.0 (venkatdevaraj044@gmail.com)'
      }
    })

    if (!response.ok) {
      console.warn(`  ⚠️ HTTP ${response.status} for ${query.value} page ${page}`)
      return []
    }

    const data = await response.json()
    return data.products || []
  } catch (err) {
    console.warn(`  ⚠️ Fetch error for ${query.value}: ${err.message}`)
    return []
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  🍛 Foodie AI - Indian Products Fetcher          ║')
  console.log('║  Source: OpenFoodFacts API                       ║')
  console.log(`║  Target: ${MAX_PRODUCTS} products                           ║`)
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()

  const usedBarcodes = new Set()
  const allProducts = []

  for (let qi = 0; qi < SEARCH_QUERIES.length; qi++) {
    if (allProducts.length >= MAX_PRODUCTS) break

    const query = SEARCH_QUERIES[qi]
    const label = `${query.tag}:${query.value}`
    console.log(`\n🔍 [${qi + 1}/${SEARCH_QUERIES.length}] Searching: ${label}`)

    let page = 1
    let emptyPages = 0

    while (allProducts.length < MAX_PRODUCTS && page <= 40 && emptyPages < 2) {
      const products = await fetchPage(query, page)

      if (products.length === 0) {
        emptyPages++
        page++
        continue
      }

      let addedThisPage = 0
      for (const p of products) {
        if (allProducts.length >= MAX_PRODUCTS) break

        const barcode = String(p.code || '').trim()
        if (!barcode || usedBarcodes.has(barcode)) continue

        // Check if it's likely an Indian product (890 prefix or tagged with India)
        const countriesTags = (p.countries_tags || []).join(',').toLowerCase()
        const isIndian = barcode.startsWith('890') ||
                         countriesTags.includes('india') ||
                         query.tag === 'countries'

        if (!isIndian && query.tag !== 'brands') continue

        const parsed = parseProduct(p)
        if (!parsed) continue

        usedBarcodes.add(barcode)
        allProducts.push(parsed)
        addedThisPage++
      }

      console.log(`  📄 Page ${page}: got ${products.length} results, added ${addedThisPage} (total: ${allProducts.length})`)
      page++
      await sleep(DELAY_MS)
    }
  }

  // Write CSV
  console.log(`\n📝 Writing ${allProducts.length} products to ${OUTPUT_CSV}...`)

  const csvLines = [CSV_HEADERS.join(',')]
  for (const product of allProducts) {
    csvLines.push(productToCSVRow(product))
  }

  fs.writeFileSync(OUTPUT_CSV, csvLines.join('\n'), 'utf8')

  console.log()
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  ✅ DOWNLOAD COMPLETE                            ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  📦 Total products: ${String(allProducts.length).padEnd(28)}║`)
  console.log(`║  💾 Saved to: products_new.csv                   ║`)
  console.log('╠══════════════════════════════════════════════════╣')
  console.log('║  Next step: npm run replace-db                   ║')
  console.log('╚══════════════════════════════════════════════════╝')
}

main().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
