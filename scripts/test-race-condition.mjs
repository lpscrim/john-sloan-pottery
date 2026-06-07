/**
 * Race-condition test for reserve_stock.
 *
 * 1. Picks the first product in the table.
 * 2. Sets its stock_level to 1.
 * 3. Fires 5 concurrent reserve_stock calls each requesting qty 1.
 * 4. Checks that exactly ONE succeeded and stock is 0.
 * 5. Restores original stock level.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

// --- Pick a product with a stripe_price_id ---
const { data: products, error: fetchErr } = await supabase
  .from("products")
  .select("id, name, stock_level, stripe_price_id")
  .not("stripe_price_id", "is", null)
  .limit(1)
  .single();

if (fetchErr || !products) {
  console.error("No products with a stripe_price_id found:", fetchErr?.message);
  process.exit(1);
}

const product = products;
const originalStock = product.stock_level;
console.log(`\nUsing product: "${product.name}" (id=${product.id})`);
console.log(`stripe_price_id: ${product.stripe_price_id}`);
console.log(`Original stock: ${originalStock}`);

// --- Set stock to 1 ---
await supabase
  .from("products")
  .update({ stock_level: 1 })
  .eq("id", product.id);

console.log("Stock set to 1");
console.log("\nFiring 5 concurrent reserve_stock(qty=1) calls...\n");

const reserveItems = JSON.stringify([
  { stripe_price_id: product.stripe_price_id, qty: 1 },
]);

// --- Fire 5 concurrent reserve_stock calls ---
const results = await Promise.all(
  Array.from({ length: 5 }, (_, i) =>
    supabase
      .rpc("reserve_stock", { items: reserveItems })
      .then(({ data, error }) => {
        const rows = Array.isArray(data) ? data : [];
        const reserved = rows[0]?.reserved === true;
        console.log(
          `  Call ${i + 1}: ${reserved ? "✅ RESERVED" : "🚫 BLOCKED (out of stock)"}` +
          (error ? ` [error: ${error.message}]` : "")
        );
        return reserved;
      })
  )
);

const successCount = results.filter(Boolean).length;

// --- Check final stock ---
const { data: after } = await supabase
  .from("products")
  .select("stock_level")
  .eq("id", product.id)
  .single();

console.log(`\n--- Results ---`);
console.log(`Calls that reserved:  ${successCount} / 5`);
console.log(`Final stock_level:    ${after?.stock_level}`);

const pass = successCount === 1 && after?.stock_level === 0;
if (pass) {
  console.log("\n✅ PASS — Only 1 caller reserved stock. No double purchase.");
} else {
  console.log("\n❌ FAIL — Race condition detected!");
}

// --- Restore original stock ---
await supabase
  .from("products")
  .update({ stock_level: originalStock })
  .eq("id", product.id);

console.log(`\nStock restored to ${originalStock}.`);
process.exit(pass ? 0 : 1);

// --- Restore original stock ---
await supabase
  .from("products")
  .update({ stock_level: originalStock })
  .eq("id", product.id);

console.log(`\nStock restored to ${originalStock}.`);
