const fs = require('fs');
const zlib = require('zlib');
const csv = require('csv-parser');

const INPUT = './products_actual.tsv';
const OUTPUT = './products_final.csv';

let total = 0;
let saved = 0;
let skipped = 0;
let duplicate = 0;

const seenBarcodes = new Set();

const output = fs.createWriteStream(OUTPUT, {
  encoding: 'utf8'
});

output.write(
  [
    'barcode',
    'product_name',
    'brand',
    'categories',
    'ingredients',
    'allergens',
    'quantity',
    'countries',
    'image_url',
    'image_small_url',
    'image_ingredients_url',
    'image_nutrition_url',
    'energy_kcal_100g',
    'fat_100g',
    'saturated_fat_100g',
    'carbohydrates_100g',
    'sugars_100g',
    'fiber_100g',
    'proteins_100g',
    'salt_100g',
    'sodium_100g',
    'vitamin_c_100g',
    'calcium_100g',
    'iron_100g'
  ].join(',') + '\n'
);

function clean(value) {
  if (value === undefined || value === null) return '';

  return String(value)
    .replace(/\r?\n|\r/g, ' ')
    .replace(/"/g, '""')
    .trim();
}

function csvValue(value) {
  return `"${clean(value)}"`;
}
fs.createReadStream(INPUT)
  .pipe(zlib.createGunzip())
  .pipe(
    csv({
      separator: '\t'
    })
  )
  .on('data', (row) => {
    total++;

    const barcode = String(row.code || '').trim();
    const productName = String(row.product_name || '').trim();

    if (!barcode || !productName) {
      skipped++;
      return;
    }

    if (seenBarcodes.has(barcode)) {
      duplicate++;
      return;
    }

    seenBarcodes.add(barcode);

    const cleaned = [
      barcode,
      productName,
      row.brands || '',
      row.categories_en || row.categories || '',
      row.ingredients_text || '',
      row.allergens || '',
      row.quantity || '',
      row.countries_en || row.countries || '',

      row.image_url || '',
      row.image_small_url || '',
      row.image_ingredients_url || '',
      row.image_nutrition_url || '',

      row['energy-kcal_100g'] || '',
      row['fat_100g'] || '',
      row['saturated-fat_100g'] || '',
      row['carbohydrates_100g'] || '',
      row['sugars_100g'] || '',
      row['fiber_100g'] || '',
      row['proteins_100g'] || '',
      row['salt_100g'] || '',
      row['sodium_100g'] || '',

      row['vitamin-c_100g'] || '',
      row['calcium_100g'] || '',
      row['iron_100g'] || ''
    ];

    output.write(
      cleaned.map(csvValue).join(',') + '\n'
    );

    saved++;

    if (saved % 10000 === 0) {
      console.log(
        `Processed: ${total} | Saved: ${saved} | Skipped: ${skipped} | Duplicate: ${duplicate}`
      );
    }
  })
  .on('end', () => {
    output.end(() => {
      console.log('');
      console.log('======================================');
      console.log(' CLEANING COMPLETED');
      console.log('======================================');
      console.log(`Total rows       : ${total}`);
      console.log(`Saved rows       : ${saved}`);
      console.log(`Skipped rows     : ${skipped}`);
      console.log(`Duplicate rows   : ${duplicate}`);
      console.log(`Unique barcodes  : ${seenBarcodes.size}`);
      console.log(`Output file      : ${OUTPUT}`);
      console.log('======================================');
    });
  })
  .on('error', (err) => {
    console.error('');
    console.error('❌ Cleaning failed:', err.message);
    output.end();
  });