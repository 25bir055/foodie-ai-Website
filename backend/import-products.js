const fs = require('fs');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

const INPUT = './products.csv';

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'foodie-ai';
const COLLECTION = 'products';

const BATCH_SIZE = 500;

async function importProducts() {
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    console.log('✅ Connected to MongoDB');

    const indexes = await collection.listIndexes().toArray();

const barcodeIndexExists = indexes.some(
  index => index.name === 'barcode_1'
);

if (!barcodeIndexExists) {
  await collection.createIndex(
    { barcode: 1 },
    { unique: true, name: 'barcode_1' }
);

  console.log('✅ Barcode index created');
} else {
  console.log('✅ Barcode index already exists');
}

    let batch = [];
    let total = 0;
    let imported = 0;

    const processBatch = async () => {
      if (batch.length === 0) return;

      const operations = batch.map(product => ({
        updateOne: {
          filter: { barcode: product.barcode },
          update: { $set: product },
          upsert: true
        }
      }));

      const result = await collection.bulkWrite(
        operations,
        { ordered: false }
      );

      imported += result.upsertedCount + result.modifiedCount;

      batch = [];

      console.log(
        `Processed: ${total} | Imported/Updated: ${imported}`
      );
    };

    const stream = fs
      .createReadStream(INPUT)
      .pipe(
        csv({
          separator: ',',
          mapHeaders: ({ header }) =>
            header.replace(/^\uFEFF/, '').trim()
        })
      );

    stream.on('data', async (row) => {
      stream.pause();

      total++;

      const barcode = String(row.barcode || '').trim();
const productName = String(row.product_name || '').trim();

      if (barcode && productName) {
        batch.push({
          barcode,
          product_name: productName,

          brand: row.brands || '',

          categories:
            row.categories_en ||
            row.categories ||
            '',

          ingredients:
            row.ingredients_text || '',

          allergens:
            row.allergens || '',

          quantity:
            row.quantity || '',

          countries:
            row.countries_en ||
            row.countries ||
            '',

          image_url:
            row.image_url || '',

          image_small_url:
            row.image_small_url || '',

          image_ingredients_url:
            row.image_ingredients_url || '',

          image_nutrition_url:
            row.image_nutrition_url || '',

          nutrition: {
            energy_kcal_100g:
              row['energy-kcal_100g'] || '',

            fat_100g:
              row['fat_100g'] || '',

            saturated_fat_100g:
              row['saturated-fat_100g'] || '',

            carbohydrates_100g:
              row['carbohydrates_100g'] || '',

            sugars_100g:
              row['sugars_100g'] || '',

            fiber_100g:
              row['fiber_100g'] || '',

            proteins_100g:
              row['proteins_100g'] || '',

            salt_100g:
              row['salt_100g'] || '',

            sodium_100g:
              row['sodium_100g'] || ''
          },

          nutriscore:
            row.nutriscore_grade || '',

          nova_group:
            row.nova_group || ''
        });

        if (batch.length >= BATCH_SIZE) {
          await processBatch();
        }
      }

      stream.resume();
    });

    stream.on('end', async () => {
      await processBatch();

      console.log('');
      console.log('================================');
      console.log(' PRODUCT IMPORT COMPLETED');
      console.log('================================');
      console.log(`Total rows: ${total}`);
      console.log(`Imported/Updated: ${imported}`);
      console.log('Collection: products');
      console.log('================================');

      await client.close();
    });

    stream.on('error', async (error) => {
      console.error('❌ Dataset error:', error.message);
      await client.close();
    });

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    await client.close();
  }
}

importProducts();