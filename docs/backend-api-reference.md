# Backend & API Reference

A complete guide to how the backend was built — Supabase, Stripe, email, Etsy integration, admin auth, and every API route.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Variables](#environment-variables)
3. [Supabase](#supabase)
   - [Client Singletons](#client-singletons)
   - [Database Tables](#database-tables)
   - [Storage Buckets](#storage-buckets)
   - [RPC Functions (Stored Procedures)](#rpc-functions)
4. [Stripe](#stripe)
   - [Client Singleton](#stripe-client-singleton)
   - [Stripe Connect (Direct Charges)](#stripe-connect)
5. [Payment Flow — Step by Step](#payment-flow)
6. [Shipping Logic](#shipping-logic)
7. [Webhook Handler](#webhook-handler)
8. [Order Email (Resend)](#order-email)
9. [Admin Authentication](#admin-authentication)
10. [API Routes Reference](#api-routes-reference)
11. [Server Actions Reference](#server-actions-reference)
12. [Etsy Integration](#etsy-integration)
13. [Custom Mug System](#custom-mug-system)
14. [Caching & Revalidation](#caching--revalidation)

---

## Architecture Overview

```
Browser Cart
    │
    ▼
POST /api/payment-intent
    ├── Supabase RPC: reserve_stock      ← decrements stock atomically
    ├── Supabase: products.select        ← get glaze notes, mug shape prices
    ├── Stripe: prices.retrieve          ← get product names/images
    ├── Supabase: settings.select        ← get shipping rates
    └── Stripe: paymentIntents.create    ← creates PI on connected account
            │
            ▼
    Customer enters address at /checkout
            │
            ▼
    POST /api/payment-intent/update-shipping
            │                            ← recalculates rate for customer's country
            ▼
    Customer pays via Stripe Elements
            │
    ┌───────┴───────────────────┐
    │                           │
    ▼                           ▼
charge.succeeded        payment_intent.canceled
    │                           │
    ▼                           ▼
notifyClientFromCharge()  Supabase RPC: restore_stock
syncEtsyStockAfterSale()
(Resend email + Make.com)
```

Everything that touches money, stock, or the database runs **server-side only** — Server Components, Server Actions, and Route Handlers. No sensitive keys ever reach the browser.

---

## Environment Variables

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full DB access — **never expose to browser** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (auth UI) | Public key for Supabase Auth login form |
| `STRIPE_SECRET_KEY` | Server only | `sk_test_...` dev / `sk_live_...` prod |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | `pk_test_...` dev / `pk_live_...` prod |
| `STRIPE_WEBHOOK_SECRET` | Webhook handler | Standard account webhook secret |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Webhook handler | Connect forwarded events secret (preferred) |
| `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` | Payment routes | Artist's `acct_...` connected account ID |
| `RESEND_API_KEY` | Webhook + contact | From Resend dashboard |
| `RESEND_FROM_EMAIL` | Webhook + contact | Must be a verified Resend sender domain |
| `NOTIFY_EMAIL` | Webhook + contact | Comma-separated order/contact notification recipients |
| `ADMIN_EMAIL_ALLOWLIST` | Auth | Comma-separated admin email addresses |
| `NEXT_PUBLIC_SITE_URL` | Auth, Etsy OAuth | e.g. `https://yourdomain.com` |
| `REVALIDATE_SECRET` | `/api/revalidate` | Bearer token for external cache busting |
| `ETSY_API_KEY` | Etsy OAuth | Etsy app API key |
| `ETSY_WEBHOOK_SECRET` | `/api/etsy/sync-stock` | Bearer token for Make.com sync calls |
| `ETSY_MOCK` | Etsy lib | Set `"true"` in dev to use mock Etsy data |
| `MAKE_ETSY_WEBHOOK_URL` | Webhook handler | Make.com webhook URL for post-sale Etsy stock sync |

---

## Supabase

### Client Singletons

There are two Supabase clients — one for the server, one for the browser.

**Server client** — `app/_lib/supabase.ts`

```ts
createServerSupabase() // singleton using the service-role key
```

- Uses `SUPABASE_SERVICE_ROLE_KEY` — bypasses Row Level Security.
- Only called in Server Components, Server Actions, and Route Handlers.
- Cached as a module-level singleton so one connection is reused per cold start.

**Browser client** — `app/_lib/supabaseBrowser.ts`

```ts
createBrowserSupabase() // uses the public anon key
```

- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Only used for the **admin login form** (Supabase Auth on the client).
- The returned `access_token` is then sent to `POST /api/admin/session` which validates it server-side and sets an HTTP-only cookie.

---

### Database Tables

#### `products`

The main product catalogue. Each row represents one purchasable item.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Product name |
| `description` | text | |
| `price_hw` | integer | Price in **pence** (e.g. 2500 = £25.00) |
| `stock_level` | integer | Available stock, decremented atomically by RPC |
| `categories` | text[] | e.g. `['BOWLS', 'GLAZED']` — filter tags on /shop |
| `image_url` | text | Cover image public URL from Supabase Storage |
| `stripe_product_id` | text | Stripe Product ID (`prod_...`) |
| `stripe_price_id` | text | Stripe Price ID (`price_...`) — used as the cart key |
| `type` | text | Always `'pottery'` for this project |
| `glaze` | jsonb | Array of `{ name, note, colour?, slug? }` — glaze info shown in emails |
| `mug_shape_slug` | text | Slug of the associated mug shape (optional) |
| `shape_label` | text | Display label for the shape (optional) |
| `etsy_listing_id` | text | Etsy listing ID if imported from/linked to Etsy |

#### `settings`

A key-value store. All values are plain text strings. Used for admin-configurable runtime settings — no code deploy needed to change them.

| key | value | Purpose |
|---|---|---|
| `artwork_shipping_rate_pence` | e.g. `"800"` | GB shipping rate (pence) |
| `eu_artwork_shipping_rate_pence` | e.g. `"1500"` | EU/EEA shipping rate (pence) |
| `int_artwork_shipping_rate_pence` | e.g. `"2500"` | International shipping rate (pence) |
| `shipping_region` | `"gb"` / `"eu"` / `"international"` | Which countries can check out |
| `categories_visible` | `"true"` / `"false"` | Show/hide category filter buttons on /shop |
| `home_about_text` | Plain text | Home page About section text |
| `home_about_images` | JSON array of URLs | Home page About section gallery images |
| `home_featured_collections` | JSON | 3-slide homepage carousel content |

> **How settings writes work:** every Server Action that updates a setting calls `supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })` then `revalidatePath()` to bust the Next.js cache.

#### `order_tracking`

Stores a record per completed order (written by the webhook on `charge.succeeded`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `payment_intent_id` | text | Stripe PI ID (`pi_...`) |
| `charge_id` | text | Stripe Charge ID (`ch_...`) |
| `customer_name` | text | |
| `customer_email` | text | |
| `amount` | integer | Total in pence |
| `status` | text | `'paid'` or `'dispatched'` |
| `items` | jsonb | Snapshot of ordered items from PI metadata |
| `shipping_address` | jsonb | |
| `dispatched` | boolean | Set by admin via Dispatch button |
| `dispatched_at` | timestamptz | |
| `created_at` | timestamptz | |

#### `glazes`

Glaze options available in the Custom Mug configurator.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Display name |
| `slug` | text | URL-safe identifier, used in tile image filenames |
| `note` | text | Glaze description / notes shown in order emails |
| `colour` | text | Hex colour for the UI picker (optional) |
| `active` | boolean | Only active glazes are served to the front-end |

#### `mug_shapes`

Available mug shapes for the Custom Mug configurator.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Display name |
| `slug` | text | Used to build image URL (`mug-shapes/{slug}.jpg`) |
| `description` | text | Optional description |
| `price_pence` | integer | Server-authoritative price — never trust client |
| `active` | boolean | Only active shapes are served |

#### `about_content`

Single-row table (always id = 1) for the `/about` page.

| Column | Type | Notes |
|---|---|---|
| `id` | integer | Always 1 |
| `statement` | text | Italic quote shown at the top |
| `bio` | text | Multi-paragraph bio (double-newline separated) |
| `portrait_url` | text | Public URL of portrait image |
| `exhibitions` | jsonb | `[{ year, title, location, type }]` |
| `education` | jsonb | `[{ year, qualification, institution }]` |
| `awards` | jsonb | `[{ year, title }]` |
| `press` | jsonb | `[{ year, title, publication, url? }]` |
| `gallery_images` | jsonb | Array of image URLs for the studio gallery |

---

### Storage Buckets

**`product-images`** — All shop product photos

- Cover image path: `uploads/{timestamp}_{uuid}.{ext}`
- Gallery images path: `{productId}/{index}_{uuid}.{ext}`

**`about-images`** — About page content

- Portrait: `portrait/{timestamp}_{uuid}.{ext}`
- Gallery: `gallery/{timestamp}_{uuid}.{ext}`
- Home about gallery: `home/{timestamp}_{uuid}.{ext}`

**`mug-examples`** — Custom Mug page example photos

- Files listed and served directly: `mug-examples/{filename}`

**`glaze-tiles`** — Pre-rendered glaze combination preview images

- Filename convention (slugs sorted alphabetically): `{slug_a}-{slug_b}.jpg`
- e.g. for glazes `"tenmoku"` + `"ash"` → `ash-tenmoku.jpg`

**`mug-shapes`** — Shape preview photos for the configurator

- `{slug}.jpg`

---

### RPC Functions

These are Postgres stored procedures called via Supabase's `.rpc()` method. They run atomically — no partial failures.

#### `reserve_stock(items)`

Decrements `stock_level` for each item in the array. Called at PaymentIntent creation time.

**Input:** `[{ stripe_price_id: string, qty: number }]`

**Returns:** `[{ stripe_price_id, title, reserved: boolean }]`

- `reserved: false` means the item was out of stock.
- If **any** item is out of stock, the route handler immediately calls `restore_stock` for all the succeeded items (rollback), then returns HTTP 409.

#### `restore_stock(items)`

Increments `stock_level` back. Called in two places:
1. `POST /api/payment-intent/cancel` — when the customer clicks Back in checkout
2. `payment_intent.canceled` webhook — safety net for timed-out sessions

---

## Stripe

### Stripe Client Singleton

**File:** `app/_lib/stripe.ts`

```ts
getStripe() // returns a singleton Stripe instance
```

Uses `STRIPE_SECRET_KEY`. The API version is pinned to `'2026-01-28.clover'` so breaking changes don't silently affect the app.

### Stripe Connect

All payments are **direct charges** on the artist's connected account (`STRIPE_CONNECT_CLIENT_ACCOUNT_ID`).

- The platform retains **5%** as `application_fee_amount` on every PaymentIntent.
- Stripe fees come out of the artist's balance.
- Every Stripe API call that relates to orders passes `{ stripeAccount: clientAccountId }` as a request option.
- If `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` is not set, the app falls back to a single-account setup (no fee splitting, no `stripeAccount` option).

---

## Payment Flow

### Step 1 — Create PaymentIntent

**`POST /api/payment-intent`** — `app/api/payment-intent/route.ts`

This is the most complex route. Here's what it does in order:

1. **Validates** the cart: each item must have a valid `priceId` string and a positive integer `quantity`.
2. **Separates** regular shop items from custom mug items.
3. **Reserves stock** (regular items only) via `supabase.rpc('reserve_stock', { items })`. If any item is out of stock → 409 response, all reservations rolled back.
4. **Fetches Stripe price + product metadata** for regular items (`stripe.prices.retrieve` with `expand: ['product']`).
5. **Fetches glaze notes** from `products` table for inclusion in order emails.
6. **Resolves custom mug prices** from the `mug_shapes` table (server-authoritative — client price is ignored).
7. **Calculates shipping** at GB rate (country unknown at this stage).
8. **Creates the PaymentIntent** on the connected account with:
   - `application_fee_amount` = 5% of total
   - `metadata.reserved_items` = JSON snapshot of all items (title, qty, price, image, type/glaze notes)
   - `metadata.shipping_amount` = shipping in pence
   - `metadata.cancel_token` = a UUID used to authenticate cancel/update calls
9. **Returns** `{ clientSecret, paymentIntentId, cancelToken, total, shippingRate, stripeAccount }` to the browser.

> **Metadata size safety:** Stripe metadata values are capped at 500 chars, total at 50 KB. If `reserved_items` JSON exceeds 40 KB, image URLs are stripped. If it still exceeds 50 KB, a 400 error is returned rather than truncating silently.

---

### Step 2 — Update Shipping

**`POST /api/payment-intent/update-shipping`** — `app/api/payment-intent/update-shipping/route.ts`

Fired whenever the customer changes their country in the `AddressElement`.

1. Validates `paymentIntentId`, `cancelToken`, and `country` (must be a valid 2-letter ISO code).
2. Retrieves the PI from Stripe, verifies `cancel_token` in metadata.
3. Checks PI status is still updatable (`requires_payment_method`, `requires_confirmation`, `requires_action`).
4. Calls `resolveRateForCountry(rates, country)` to get the new shipping amount.
5. Calculates new total: `newTotal = (currentAmount - prevShipping) + newShipping`.
6. Updates the PI amount and `shipping_amount` metadata in Stripe.
7. Returns `{ shippingRate, total }` — the checkout UI updates displayed amounts immediately.

---

### Step 3 — Customer Pays

The `/checkout` page uses Stripe Elements (`PaymentElement` + `AddressElement`). When the customer confirms, `stripe.confirmPayment()` is called client-side. Stripe handles 3DS/authentication.

---

### Step 4 — Cancel / Go Back

**`POST /api/payment-intent/cancel`** — `app/api/payment-intent/cancel/route.ts`

1. Validates `paymentIntentId` and `cancelToken`.
2. Retrieves PI from Stripe, checks `cancel_token` matches (prevents spoofed cancellations).
3. Checks PI is in a cancellable status.
4. Calls `stripe.paymentIntents.cancel()`.
5. **Immediately** calls `restore_stock` for the reserved items (the webhook does this too as a safety net).

---

## Shipping Logic

**Files:** `app/_lib/shippingRules.ts` (pure logic), `app/_lib/shippingSettings.ts` (DB reads)

### Regions and Countries

| Region | Countries included |
|---|---|
| `gb` | GB only |
| `eu` | GB + 30 EU/EEA countries (AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE, CH, NO, IS) |
| `international` | EU region + US, CA, AU, NZ, JP, SG, HK, AE, SA |

The `shipping_region` setting in Supabase controls which `ALLOWED_COUNTRIES` list is passed to Stripe's `AddressElement`.

### Rate Resolution

```ts
// PI creation — country unknown, use GB rate
resolveShippingRate(rates)
// → rates.gbRate

// Address entered — country known
resolveRateForCountry(rates, country)
// country === 'GB'          → rates.gbRate
// country in EU_COUNTRY_SET → rates.euRate
// otherwise                 → rates.intRate
```

Three rates are stored in `settings`:
- `artwork_shipping_rate_pence` → GB rate
- `eu_artwork_shipping_rate_pence` → EU rate
- `int_artwork_shipping_rate_pence` → International rate

These are fetched via `getShippingRates()` which reads all three in a single Supabase query.

---

## Webhook Handler

**`POST /api/webhooks/stripe`** — `app/api/webhooks/stripe/route.ts`

Stripe calls this endpoint after each significant event. The route:

1. Reads the raw request body as text (required for signature verification).
2. Verifies the Stripe signature using `stripe.webhooks.constructEvent()`. Tries `STRIPE_CONNECT_WEBHOOK_SECRET` first (for Connect events), falls back to `STRIPE_WEBHOOK_SECRET`.
3. Returns 400 if verification fails — this prevents spoofed webhook calls.

### `charge.succeeded`

Fired after a successful payment. The route:

- Calls `notifyClientFromCharge()` — sends the order confirmation email via Resend.
- Calls `syncEtsyStockAfterSale()` — triggers Make.com to update Etsy listing quantities.
- Stock is **not** restored — the reservation made at PI creation time becomes the sale.

> Why `charge.succeeded` instead of `payment_intent.succeeded`? Because `balance_transaction` (needed for fee reporting in the email) is guaranteed to be populated by the time `charge.succeeded` fires. On `payment_intent.succeeded` it may still be null.

### `payment_intent.canceled`

Fired when a PI is cancelled (either by the cancel route or by Stripe's automatic timeout). The route:

- Parses `reserved_items` from PI metadata.
- Calls `supabase.rpc('restore_stock', { items: reserved })` to return items to stock.

---

## Order Email

Implemented inside `notifyClientFromCharge()` in the webhook handler.

**What's included in the email:**

- Customer name, email, phone
- Shipping address
- Item grid: thumbnail image, title, glaze/type notes, quantity, price
- Financial summary table:
  - Subtotal (total − shipping)
  - Shipping
  - **Total**
  - Platform fee (5%)
  - Stripe processing fee (from `balance_transaction.fee`, or "See dashboard" if unavailable)
  - **Net to you** (Total − platform fee − Stripe fee)
- Charge ID and PI ID in the footer

The `replyTo` of the email is set to the customer's address so the artist can reply directly.

**Contact form emails** — `POST /api/contact` — use the same `RESEND_API_KEY` / `NOTIFY_EMAIL` setup. All user input is HTML-escaped before insertion into the email template.

---

## Admin Authentication

**Files:** `app/_lib/adminAuth.ts`, `app/api/admin/session/route.ts`

### Login Flow

1. Admin visits `/admin`. A `<AdminAuthGate>` client component renders the Supabase Auth UI (email/password).
2. On success, `supabase.auth.signInWithPassword()` returns an `access_token`.
3. The client POSTs `{ accessToken }` to **`POST /api/admin/session`**.
4. The route verifies the token with `supabase.auth.getUser(accessToken)`.
5. Checks the user's email against `ADMIN_EMAIL_ALLOWLIST` (comma-separated env var).
6. Sets an **HTTP-only, Secure, SameSite=Lax** cookie: `admin_access_token` with 1-hour expiry.
7. Returns `{ ok: true }`.

### Request Authorisation

Every Server Action calls `requireAdminUser()` at the top:

```ts
export async function requireAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access_token')?.value;
  if (!token) throw new Error('Unauthorized');

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) throw new Error('Unauthorized');
  if (!isAllowedEmail(data.user.email)) throw new Error('Unauthorized');

  return data.user;
}
```

This re-validates the token on every action — an expired or revoked session is caught immediately.

### Logout

**`DELETE /api/admin/session`** — clears the `admin_access_token` cookie by setting `maxAge: 0`.

---

## API Routes Reference

### Payment

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/payment-intent` | None | Create PI, reserve stock, return client secret |
| POST | `/api/payment-intent/update-shipping` | cancel_token | Recalculate shipping for selected country |
| POST | `/api/payment-intent/cancel` | cancel_token | Cancel PI, restore stock |

### Webhooks

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe signature | Handle `charge.succeeded` and `payment_intent.canceled` |

### Stock & Shipping

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/stock?ids=price_xxx,price_yyy` | None | Live stock levels (max 50 IDs, `Cache-Control: no-store`) |
| GET | `/api/shipping-rate` | None | Current GB shipping rate in pence |

### Contact

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/contact` | None | Send contact form email via Resend |

### Admin

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/admin/session` | Supabase token | Exchange Supabase access token for HTTP-only session cookie |
| DELETE | `/api/admin/session` | Cookie | Clear session cookie (logout) |

### Custom Mug

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/glazes` | None | List active glazes from `glazes` table |
| GET | `/api/mug-shapes` | None | List active mug shapes from `mug_shapes` table |

### Cache

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/revalidate` | Bearer `REVALIDATE_SECRET` | Bust Next.js cache for `/` and `/shop`; pings Supabase to prevent free-tier pause |

### Etsy

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/etsy/auth` | Admin cookie | Start Etsy OAuth PKCE flow |
| GET | `/api/etsy/auth/callback` | PKCE state cookie | Exchange code for tokens, store in Supabase |
| GET | `/api/etsy/listings` | Admin cookie | Fetch active Etsy listings |
| GET | `/api/etsy/cached-listings` | Admin cookie | Return cached listings from Supabase |
| POST | `/api/etsy/cache-listings` | Admin cookie | Cache Etsy listings in Supabase |
| POST | `/api/etsy/import` | Admin cookie | Import a single Etsy listing as a Supabase product + Stripe product |
| POST | `/api/etsy/import-bulk` | Admin cookie | Bulk import multiple Etsy listings |
| POST | `/api/etsy/sync-stock` | Bearer `ETSY_WEBHOOK_SECRET` | Called by Make.com — reduces Supabase stock where Etsy qty is lower |
| GET | `/api/etsy/sold` | Admin cookie | Fetch sold Etsy listings |
| POST | `/api/etsy/poll` | Admin cookie | Poll Etsy for stock updates |
| POST | `/api/etsy/trigger-import` | Admin cookie | Trigger a manual import run |

---

## Server Actions Reference

Server Actions are Next.js "use server" functions — they run on the server but are called directly from client or server components as if they were async functions. Every action calls `requireAdminUser()` first.

### Product Actions

**`app/admin/add-product/actions.ts` → `addProduct(formData)`**

Full lifecycle for creating a new product:
1. Validates all form fields (name, price, stock, image type/size).
2. Uploads cover image to `product-images/uploads/{timestamp}_{uuid}.{ext}`.
3. Inserts row in `products` table.
4. Creates a Stripe Product and Price on the connected account.
5. Updates the Supabase row with `stripe_product_id` and `stripe_price_id`.
6. Uploads up to 4 gallery images to `product-images/{productId}/{index}_{uuid}.{ext}`.
7. Revalidates `/` and `/shop`.

**`app/admin/edit-product/actions.ts` → `updateProduct(formData)`**

1. Validates fields.
2. Optionally replaces the cover image (removes old from Storage).
3. Removes selected gallery images from Storage.
4. Uploads new gallery images.
5. Updates the `products` row in Supabase.
6. Updates the Stripe Product name/description.
7. If price changed: creates a new Stripe Price, archives the old one, updates `stripe_price_id` in Supabase.
8. If product has an `etsy_listing_id`: calls `updateListingInventory()` to sync stock to Etsy.
9. Revalidates relevant paths.

**`app/admin/edit-product/actions.ts` → `deleteProduct(productId)`**

1. Fetches product to get image URLs and Stripe IDs.
2. Removes all Storage files (cover + gallery).
3. Archives the Stripe Product (sets `active: false`).
4. Deletes the Supabase row.
5. Revalidates caches.

### Settings Actions

**`app/admin/settings/actions.ts`**

| Function | What it does |
|---|---|
| `updateGbShippingRate(pence)` | Upserts `artwork_shipping_rate_pence` in `settings` |
| `updateEuShippingRate(pence)` | Upserts `eu_artwork_shipping_rate_pence` |
| `updateIntShippingRate(pence)` | Upserts `int_artwork_shipping_rate_pence` |
| `updateShippingRegion(region)` | Upserts `shipping_region`; revalidates `/checkout` |
| `updateCategoriesVisible(bool)` | Upserts `categories_visible`; revalidates `/shop` |

### Orders Actions

**`app/admin/orders/actions.ts` → `setDispatched(sessionId, dispatched)`**

Upserts a row in `order_tracking` with `dispatched: true/false` and a timestamp. Revalidates `/admin/orders`.

### About & Home Content Actions

**`app/admin/about/actions.ts`** — Updates `about_content` (single row, id=1). Handles portrait and gallery image uploads to the `about-images` bucket.

**`app/admin/home-about/actions.ts`** — Upserts `home_about_text` and `home_about_images` keys in `settings`. Revalidates `/`.

**`app/admin/home-featured/actions.ts`** — Upserts `home_featured_collections` JSON key in `settings`. Revalidates `/`.

### Etsy Actions

**`app/admin/etsy/actions.ts` → `deleteAllProducts()`**

Nuclear option — deletes all products:
1. Lists and removes all files in `product-images` bucket per product.
2. Archives each Stripe product.
3. Deletes all rows from `products` table.
4. Revalidates caches.

---

## Etsy Integration

The Etsy integration lets the admin import Etsy listings as products and keep stock levels in sync. It has two directions:

### Outbound: Website → Etsy (post-sale sync)

After `charge.succeeded`, `syncEtsyStockAfterSale()` in the webhook handler:
1. Retrieves the PI to get `reserved_items`.
2. Queries `products` for rows where `etsy_listing_id` is not null and `stripe_price_id` matches a sold item.
3. POSTs to `MAKE_ETSY_WEBHOOK_URL` with `{ listing_id, quantity: product.stock_level }`.
4. Make.com receives this and calls the Etsy API to update the listing quantity.

### Inbound: Etsy → Website (stock sync)

Make.com runs on a schedule (every 4 hours) and calls **`POST /api/etsy/sync-stock`**:
1. Authenticated with `Bearer ETSY_WEBHOOK_SECRET`.
2. Receives the raw Etsy listings response `{ results: [{ listing_id, quantity }] }`.
3. For each product with an `etsy_listing_id`: if Etsy quantity is **lower** than Supabase stock, updates Supabase to match.
4. Never increases Supabase stock — the website is source of truth for additions.

### Etsy OAuth (PKCE)

The admin connects their Etsy shop via OAuth 2.0 with PKCE:
1. **`GET /api/etsy/auth`** — generates a `code_verifier` + `code_challenge` (SHA-256), stores the verifier in an HTTP-only cookie, redirects to `https://www.etsy.com/oauth/connect`.
2. **`GET /api/etsy/auth/callback`** — Etsy redirects back here. The route reads the verifier cookie, exchanges the code for `access_token` + `refresh_token`, stores them in Supabase `settings`, and redirects to `/admin/etsy?connected=1`.

### Importing Etsy Listings

**`POST /api/etsy/import`** — imports a single listing:
1. Guards against duplicate import (checks `etsy_listing_id`).
2. Downloads listing images from Etsy CDN and uploads to `product-images` bucket.
3. Creates a Supabase `products` row with `etsy_listing_id` set.
4. Creates a Stripe Product + Price.
5. Updates the row with Stripe IDs.

**`POST /api/etsy/import-bulk`** — calls the single import for each listing in the request body.

---

## Custom Mug System

The custom mug configurator lets customers design a bespoke mug — choose a shape and two glazes.

### Data Flow

1. `GET /api/mug-shapes` → serves active shapes from `mug_shapes` table.
2. `GET /api/glazes` → serves active glazes from `glazes` table.
3. Customer selects shape + 2 glazes. The cart item stores `{ priceId: 'custom-mug', quantity, customMug: { shapeId, glaze1Name, glaze1Note, glaze2Name, glaze2Note } }`.
4. At checkout, `POST /api/payment-intent` handles custom mug items differently from regular items:
   - No stock reservation (they're made to order).
   - Price is resolved server-side from `mug_shapes.price_pence` — the client-side price is ignored.
   - A human-readable description (glaze names + notes) is stored in `reserved_items` metadata for the order email.

### Image Assets

- **Glaze tiles** — `glaze-tiles/{slug_a}-{slug_b}.jpg` (slugs sorted alphabetically). Used as a preview of the glaze combination in the configurator.
- **Mug shapes** — `mug-shapes/{slug}.jpg`. Shape photo for the configurator.
- **Example mugs** — files in the `mug-examples` bucket. Shown as inspiration on the custom mug page.

---

## Caching & Revalidation

The app uses Next.js static generation with on-demand revalidation. Pages like `/shop` and `/` are statically rendered at build time and cached.

When content changes (admin saves product, updates settings), Server Actions call `revalidatePath('/shop')` etc. to purge specific cached routes.

**External revalidation** — `POST /api/revalidate`:
- Protected by `Bearer REVALIDATE_SECRET`.
- Called by an external cron (e.g. Vercel Cron or an uptime monitor) on a schedule.
- Revalidates `/` and `/shop`.
- Also pings the Supabase `products` table with a `SELECT ... LIMIT 1` — this keeps the Supabase free-tier database from auto-pausing after 7 days of inactivity.

**Live stock** — `GET /api/stock`:
- Has `Cache-Control: no-store` — always fetches fresh from Supabase.
- Called by the shop gallery on mount to update sold-out badges without a full page reload.
