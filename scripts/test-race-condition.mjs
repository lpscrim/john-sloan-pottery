/**
 * Race-condition test for decrement_stock.
 *
 * 1. Picks the first product in the table.
 * 2. Sets its stock_level to 1.
 * 3. Fires 5 concurrent decrement_stock(id, 1) calls.
 * 4. Checks that exactly ONE returned true and stock is 0.
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

// --- Pick a product ---
const { data: products, error: fetchErr } = await supabase
  .from("products")
  .select("id, name, stock_level")
  .limit(1)
  .single();

if (fetchErr || !products) {
  console.error("No products found:", fetchErr?.message);
  process.exit(1);
}

const product = products;
const originalStock = product.stock_level;
console.log(`\nUsing product: "${product.name}" (id=${product.id})`);
console.log(`Original stock: ${originalStock}`);

// --- Set stock to 1 ---
await supabase
  .from("products")
  .update({ stock_level: 1 })
  .eq("id", product.id);

console.log("Stock set to 1");
console.log("\nFiring 5 concurrent decrement_stock(1) calls...\n");

// --- Fire 5 concurrent calls ---
const results = await Promise.all(
  Array.from({ length: 5 }, (_, i) =>
    supabase
      .rpc("decrement_stock", { product_id: product.id, quantity: 1 })
      .then(({ data, error }) => {
        const success = data === true;
        console.log(`  Call ${i + 1}: ${success ? "SUCCESS (got the stock)" : "BLOCKED (no stock)"} ${error ? `[error: ${error.message}]` : ""}`);
        return success;
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
console.log(`Calls that succeeded: ${successCount} / 5`);
console.log(`Final stock_level:    ${after?.stock_level}`);

if (successCount === 1 && after?.stock_level === 0) {
  console.log("\n✅ PASS — Only 1 caller got the stock. No double purchase.");
} else {
  console.log("\n❌ FAIL — Race condition detected!");
}

// --- Restore original stock ---
await supabase
  .from("products")
  .update({ stock_level: originalStock })
  .eq("id", product.id);

console.log(`\nStock restored to ${originalStock}.`);
