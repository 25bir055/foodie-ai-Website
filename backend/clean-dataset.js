const fs = require("fs");
const zlib = require("zlib");
const csv = require("csv-parser");

// Dataset file is inside the backend folder
const INPUT_FILE = "./en.openproductsfacts.org.products.csv";
// Output file
const OUTPUT_FILE = "./indian-packaged-food-products.json";

// Number of products required
const MAX_PRODUCTS = 1000;

const products = [];
const usedBarcodes = new Set();

console.log("Starting Indian packaged food dataset cleaning...");
console.log("Target:", MAX_PRODUCTS, "products");

const input = fs.createReadStream(INPUT_FILE);

input
  .pipe(zlib.createGunzip())
  .pipe(
    csv({
      separator: "\t",
      strict: false,
    })
  )
  .on("data", (row) => {
    if (products.length >= MAX_PRODUCTS) return;

    const barcode = row.code?.trim();
    const productName = row.product_name?.trim();
    const countries = row.countries?.toLowerCase() || "";

    // Accept products marked as India
    // OR products with Indian GS1 barcode prefix 890
    const isIndianProduct =
      countries.includes("india") ||
      barcode?.startsWith("890");

    if (!isIndianProduct) return;

    // Validate barcode
    if (!barcode || barcode.length < 8) return;

    // Validate product name
    if (!productName || productName.length < 2) return;

    // Avoid duplicate products
    if (usedBarcodes.has(barcode)) return;

    const brands = row.brands?.trim() || "";
    const categories = row.categories?.trim() || "";

    // Nutrition information
    const calories =
      parseFloat(row["energy-kcal_100g"]) ||
      parseFloat(row["energy-kcal"]) ||
      0;

    const protein =
      parseFloat(row["proteins_100g"]) || 0;

    const carbs =
      parseFloat(row["carbohydrates_100g"]) || 0;

    const fat =
      parseFloat(row["fat_100g"]) || 0;

    const sugar =
      parseFloat(row["sugars_100g"]) || 0;

    const fiber =
      parseFloat(row["fiber_100g"]) || 0;

    const ingredients =
      row.ingredients_text?.trim() || "";

    const allergens =
      row.allergens?.trim() ||
      row.allergens_tags?.trim() ||
      "";

    const image =
      row.image_url?.trim() ||
      row.image_front_url?.trim() ||
      "";

    // Simple health score calculation
    let healthScore = 70;

    if (sugar > 15) healthScore -= 15;
    if (sugar > 30) healthScore -= 10;
    if (fat > 20) healthScore -= 10;
    if (fiber >= 3) healthScore += 5;
    if (protein >= 8) healthScore += 5;

    healthScore = Math.max(0, Math.min(100, healthScore));

    const product = {
      barcode,
      name: productName,
      brand: brands,
      category: categories,

      nutrition: {
        calories,
        protein,
        carbs,
        fat,
        sugar,
        fiber,
      },

      ingredients,
      allergens,
      image,
      healthScore,
      country: "India",
    };

    products.push(product);
    usedBarcodes.add(barcode);

    if (products.length % 100 === 0) {
      console.log(
        `Collected ${products.length}/${MAX_PRODUCTS} products`
      );
    }
  })
  .on("end", () => {
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(products, null, 2)
    );

    console.log("\nDataset created successfully!");
    console.log(`Total products: ${products.length}`);
    console.log(`Saved to: ${OUTPUT_FILE}`);
  })
  .on("error", (error) => {
    console.error("Error:", error);
  });