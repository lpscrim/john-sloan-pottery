# Supabase & Stripe Workflow

A full technical reference for how the database, payments, and email are wired together in this project.

---

## Architecture Overview

```
Browser Cart
    │
    ▼
POST /api/payment-intent
    ├── Supabase RPC: reserve_stock          ← decrements stock atomically
    ├── Stripe: prices.retrieve              ← get product names/images
    ├── Supabase: products.select (type)     ← get artwork/print type
    ├── Supabase: settings.select            ← get per-region shipping rates
    └── Stripe: paymentIntents.create        ← direct charge on connected account
            │
            ▼
    Customer enters address at /checkout
            │
            ▼
    POST /api/payment-intent/update-shipping
            │                               ← recalculates rate for customer's country
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
(Resend email)
```

---

## Supabase

### Client Singleton

**File:** `app/_lib/supabase.ts`

Uses the **service-role key** (full database access, bypasses Row Level Security). Only used server-side: Server Components, Server Actions, Route Handlers.

```ts
createServerSupabase() // returns a singleton SupabaseClient
```

Environment variables required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database Tables

#### `products`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Product name |
| `description` | text | |
| `price_hw` | integer | Price in **pence** |
| `stock_level` | integer | Available stock |
| `categories` | text[] | e.g. `['LANDSCAPE', 'BW']` |
| `medium` | text | e.g. `Oil on canvas` |
| `dimensions` | text | |
| `year` | text | |
| `image_url` | text | Public Supabase Storage URL |
| `stripe_product_id` | text | Stripe Product ID |
| `stripe_price_id` | text | Stripe Price ID (used as cart key) |
| `type` | text | `'artwork'` or `'print'` |

#### `settings`
Key-value store. All values are stored as text strings.

| key | value | Notes |
|---|---|---|
| `print_shipping_rate_pence` | e.g. `"350"` | UK rate, print-only orders |
| `artwork_shipping_rate_pence` | e.g. `"800"` | UK rate, orders with any artwork |
| `eu_print_shipping_rate_pence` | e.g. `"700"` | EU/EEA rate, print-only orders |
| `eu_artwork_shipping_rate_pence` | e.g. `"1500"` | EU/EEA rate, orders with any artwork |
| `int_print_shipping_rate_pence` | e.g. `"1200"` | International rate, print-only orders |
| `int_artwork_shipping_rate_pence` | e.g. `"2500"` | International rate, orders with any artwork |
| `shipping_region` | `"gb"` \| `"eu"` \| `"international"` | Which countries can check out |
| `categories_visible` | `"true"` or `"false"` | Show/hide filter buttons on /work |
| `home_about_text` | Plain text | Home page About section intro paragraph(s) |
| `home_about_images` | JSON array of URLs | Home page About section gallery images |

#### `about_content`
| Column | Type | Notes |
|---|---|---|
| `id` | integer | Always 1 (single row) |
| `statement` | text | Italic quote shown on /about |
| `bio` | text | Multi-paragraph bio (double-newline separated) |
| `portrait_url` | text | Public URL of portrait image |
| `exhibitions` | jsonb | Array of `{ year, title, location, type }` |
| `education` | jsonb | Array of `{ year, qualification, institution }` |
| `awards` | jsonb | Array of `{ year, title }` |
| `press` | jsonb | Array of `{ year, title, publication, url? }` |
| `gallery_images` | jsonb | Array of URLs for the studio/exhibition gallery |

#### `order_tracking`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `payment_intent_id` | text | Stripe PI ID |
| `charge_id` | text | Stripe Charge ID |
| `customer_name` | text | |
| `customer_email` | text | |
| `amount` | integer | Total in pence |
| `status` | text | e.g. `'paid'`, `'dispatched'` |
| `items` | jsonb | Snapshot of ordered items |
| `shipping_address` | jsonb | |
| `created_at` | timestamptz | |

### Supabase Storage

Bucket: `product-images`
- Cover images: `uploads/{timestamp}_{uuid}.{ext}`
- Gallery images: `{productId}/{index}_{uuid}.{ext}`

Bucket: `about-images`
- /about portrait: `portrait/{timestamp}_{uuid}.{ext}`
- /about gallery: `gallery/{timestamp}_{uuid}.{ext}`
- Home about gallery: `home/{timestamp}_{uuid}.{ext}`

### RPC Functions (Postgres stored procedures)

#### `reserve_stock(items)`
Atomically decrements `stock_level` for each item. Returns an array of `{ stripe_price_id, title, reserved }` where `reserved: false` means out of stock.

#### `restore_stock(items)`
Increments `stock_level` back. Called on PI cancellation.

---

## Shipping

**File:** `app/_lib/shippingSettings.ts`

### Rates

Six rates are stored in the `settings` table — prints and artwork for each of three regions:

| Region | Countries |
|---|---|
| `gb` | GB only |
| `eu` | GB + EU/EEA (AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE, CH, NO, IS) |
| `international` | EU + US, CA, AU, NZ, JP, SG, HK, AE, SA |

The `shipping_region` setting controls which countries are offered at checkout via `ALLOWED_COUNTRIES[region]`.

### Rate Resolution

```ts
// At PI creation time (country not yet known — use UK rate as initial amount)
resolveShippingRate(rates, itemTypes) // → GB rate

// After customer enters their address (country known)
resolveRateForCountry(rates, itemTypes, country)
//   country === 'GB'           → GB rate
//   country in EU_COUNTRY_SET  → EU rate
//   otherwise                  → International rate
```

Orders with only prints get the print rate. Orders with any artwork/painting get the artwork rate.

---

## Stripe

### Client Singleton

**File:** `app/_lib/stripe.ts`

```ts
getStripe() // returns a singleton Stripe instance
```

Environment variable:
- `STRIPE_SECRET_KEY` (`sk_test_...` dev / `sk_live_...` prod)

### Stripe Connect (Direct Charges)

All payments are **direct charges** on the connected account (`STRIPE_CONNECT_CLIENT_ACCOUNT_ID`). This means:
- Stripe fees come out of the artist's balance (not the platform's)
- Platform retains 6.5% as `application_fee_amount`
- The artist receives the remainder automatically

If `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` is not set, no fee splitting occurs.

---

## Payment Flow

### Step 1 — Create PaymentIntent (`POST /api/payment-intent`)

**File:** `app/api/payment-intent/route.ts`

1. Validates cart items
2. Calls `reserve_stock` RPC — returns HTTP 409 if any item is out of stock, rolling back all reservations
3. Fetches Stripe price/product metadata
4. Fetches product `type` from Supabase
5. Calculates shipping at UK rate (country not yet known)
6. Creates PI as a direct charge on the connected account with 6.5% `application_fee_amount`
7. Stores `reserved_items`, `shipping_amount`, `cancel_token` (and `collection: 'true'` if applicable) in PI metadata
8. Returns `{ clientSecret, paymentIntentId, cancelToken, total, shippingRate, stripeAccount, collect }`

### Step 2 — Country selected at checkout (`POST /api/payment-intent/update-shipping`)

**File:** `app/api/payment-intent/update-shipping/route.ts`

Fired by `AddressElement`'s `onChange` whenever the customer's country changes.

1. Validates `paymentIntentId`, `cancelToken`, `country`
2. Verifies `cancel_token` in PI metadata matches (prevents tampering)
3. Looks up the correct rate via `resolveRateForCountry`
4. Updates PI `amount` and `shipping_amount` metadata in Stripe
5. Returns `{ shippingRate, total }` — checkout UI updates displayed amounts immediately

Collection orders are skipped (shipping always 0).

### Step 3 — Customer pays (Stripe Elements)

`/checkout` uses Stripe Elements (`PaymentElement` + `AddressElement`).

- **Standard order:** `AddressElement mode='shipping'` (restricted to `allowedCountries`). For UK-only, country is pre-filled to GB. For EU/International, country selector appears first. `PaymentElement` always shows billing name + address.
- **Collection order:** `AddressElement mode='billing'` (no country restriction). `PaymentElement` suppresses all billing fields (already captured).

### Step 4 — Back / cancel (`POST /api/payment-intent/cancel`)

Verifies `cancelToken`, cancels the PI in Stripe, which triggers the `payment_intent.canceled` webhook to restore stock.

---

## Webhook Handler

**File:** `app/api/webhooks/stripe/route.ts`

Verifies Stripe's signature. Supports both a standard webhook secret (`STRIPE_WEBHOOK_SECRET`) and a Connect webhook secret (`STRIPE_CONNECT_WEBHOOK_SECRET`) — tries the Connect secret first if set.

### `charge.succeeded`

- Calls `notifyClientFromCharge()` to send order email via Resend
- Stock is **not** restored — the reservation becomes the sale
- Retrieves the full charge with `expand: ['balance_transaction']` from the connected account to get Stripe fee info (may be null for Connect charges — shown as "See dashboard" in email)

### `payment_intent.canceled`

- Parses `reserved_items` from PI metadata
- Calls `restore_stock` RPC to return items to stock

---

## Order Email (Resend)

**File:** `app/api/webhooks/stripe/route.ts` → `notifyClientFromCharge()`

Environment variables:
- `RESEND_API_KEY`
- `NOTIFY_EMAIL` — comma-separated recipient addresses
- `RESEND_FROM_EMAIL` — sender (must be a verified Resend domain)

Email contents:
- Customer name, email, phone
- **Collection orders:** amber banner "Customer has chosen to collect from Edinburgh — no shipping required"
- **Standard orders:** shipping address
- Items: thumbnail, title, type (Artwork/Print), quantity, price
- Financial table: Subtotal / Shipping / Total / Platform fee (6.5%) / Stripe fee (or "See dashboard") / Net to you

---

## Admin

### Authentication

**Files:** `app/_lib/adminAuth.ts`, `app/api/admin/session/route.ts`

1. Admin logs in via Supabase Auth (email/password) at `/admin`
2. Client sends the Supabase `access_token` to `POST /api/admin/session`
3. Server verifies the token, checks email against `ADMIN_EMAIL_ALLOWLIST`
4. Sets an HTTP-only cookie: `admin_access_token` (1hr expiry, secure in prod)
5. Every Server Action calls `requireAdminUser()` which re-validates the cookie against Supabase

Environment variable:
- `ADMIN_EMAIL_ALLOWLIST` — comma-separated admin emails

### Admin Pages

| Route | Purpose |
|---|---|
| `/admin` | Nav hub |
| `/admin/add-product` | Add a new product (creates Stripe Product + Price) |
| `/admin/edit-product` | Edit existing products |
| `/admin/orders` | View order history, mark dispatched, export CSV |
| `/admin/about` | Edit `/about` page content, CV, portrait, gallery |
| `/admin/home-about` | Edit home page About section text and gallery images |
| `/admin/settings` | Shipping rates (UK/EU/International × prints/artwork), shipping region, category filters |

---

## Live Stock Polling

**File:** `GET /api/stock`

`WorkGallery` polls this endpoint on mount to get current stock levels by `stripe_price_id`. Response is `Cache-Control: no-store`.

---

## Environment Variables Summary

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full DB access — never expose to browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (auth UI) | Public key for Supabase Auth |
| `STRIPE_SECRET_KEY` | Server only | `sk_test_...` dev / `sk_live_...` prod |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | `pk_test_...` dev / `pk_live_...` prod |
| `STRIPE_WEBHOOK_SECRET` | Webhook handler | Standard account webhook secret |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Webhook handler | Connect forwarded events secret (optional, preferred) |
| `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` | Payment routes | Artist's `acct_...` connected account ID |
| `RESEND_API_KEY` | Webhook handler | From Resend dashboard |
| `RESEND_FROM_EMAIL` | Webhook handler | Must be a verified Resend sender domain |
| `NOTIFY_EMAIL` | Webhook handler | Comma-separated order notification recipients |
| `ADMIN_EMAIL_ALLOWLIST` | Auth | Comma-separated admin email addresses |
| `NEXT_PUBLIC_SITE_URL` | Checkout route | e.g. `https://yourdomain.com` |


---

## Architecture Overview

```
Browser Cart
  │
  ▼
POST /api/payment-intent
  ├── Supabase RPC: reserve_stock          ← reserves stock atomically
  ├── Stripe: prices.retrieve              ← get product names/images
  ├── Supabase: products.select            ← get glaze and custom mug metadata
  └── Stripe: paymentIntents.create        ← returns client secret
      │
      ▼
  Browser stores checkout state and routes to /checkout
      │
      ▼
  Stripe Elements confirmation
      │
  ┌───────┴───────────────────┐
  │                           │
  ▼                           ▼
charge.succeeded         payment_intent.canceled
  │                           │
  ▼                           ▼
notifyClient() +         Supabase RPC: restore_stock
syncEtsyStockAfterSale()
```

---

## Supabase

### Client Singleton

**File:** `app/_lib/supabase.ts`

Uses the **service-role key** (full database access, bypasses Row Level Security). Only used server-side: Server Components, Server Actions, Route Handlers.

```ts
createServerSupabase() // returns a singleton SupabaseClient
```

Environment variables required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database Tables

#### `products`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Product name |
| `description` | text | |
| `price_hw` | integer | Price in **pence** |
| `stock_level` | integer | Available stock |
| `categories` | text[] | e.g. `['LANDSCAPE', 'BW']` |
| `medium` | text | e.g. `Oil on canvas` |
| `dimensions` | text | |
| `year` | text | |
| `image_url` | text | Public Supabase Storage URL |
| `stripe_product_id` | text | Stripe Product ID |
| `stripe_price_id` | text | Stripe Price ID (used as cart key) |
| `type` | text | `'artwork'` or `'print'` |

#### `settings`
| key | value |
|---|---|
| `shipping_rate_pence` | Integer as string, e.g. `"500"` |
| `categories_visible` | `"true"` or `"false"` |

### Supabase Storage

Bucket: `product-images`

- **Cover images:** stored at `uploads/{timestamp}_{uuid}.{ext}`
- **Gallery images:** stored at `{productId}/{index}_{uuid}.{ext}`

### RPC Functions (Postgres stored procedures)

These must exist in your Supabase project:

#### `reserve_stock(items)`
Atomically decrements `stock_level` for each item. Returns an array of `{ stripe_price_id, title, reserved }` where `reserved: false` means out of stock.

#### `restore_stock(items)`
Increments `stock_level` back. Called on:
- Session expiry (webhook)
- Partial cart failure (if some items fail reservation, successful ones are rolled back)

---

## Stripe

### Client Singleton

**File:** `app/_lib/stripe.ts`

```ts
getStripe() // returns a singleton Stripe instance
```

Environment variable required:
- `STRIPE_SECRET_KEY` (use `sk_test_...` in dev, `sk_live_...` in prod)

### Stripe Connect (Payment Splitting)

The site uses **Stripe Connect destination charges**. The platform (your) Stripe account receives the full payment, retains the application fee, and automatically transfers the remainder to the artist's connected account.

Environment variable:
- `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` — the artist's connected Stripe account ID (e.g. `acct_...`)

**Fee logic** (`app/api/payment-intent/route.ts`):
```ts
applicationFeeAmount = Math.round(totalAmount * 0.065);
```

If `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` is not set, no fee splitting occurs — the full payment stays on the platform account.

### Stripe Products & Prices

Each product in Supabase has a matching Stripe Product and Stripe Price:
- Created automatically when a product is added via admin
- Stripe Prices are **immutable** — if a price is edited in admin, a new Stripe Price is created and the `stripe_price_id` in Supabase is updated
- Stripe Products are **deactivated** (not deleted) when a product is removed from admin — Stripe requires payment records to be kept

---

## Checkout Flow

**File:** `app/api/payment-intent/route.ts`

### Step 1 — Validate cart
Accepts `{ items: [{ priceId, quantity, customMug? }] }`.

### Step 2 — Reserve stock for regular items
Calls `reserve_stock` RPC. If any items are out of stock:
- Rolls back successful reservations via `restore_stock`
- Returns HTTP 409 with `outOfStock` array

### Step 3 — Resolve order metadata server-side
- Fetches Stripe price/product data for regular items
- Fetches glaze notes and custom mug shape pricing from Supabase
- Builds the `reserved_items` metadata payload used by the success page and notification email

### Step 4 — Create PaymentIntent
```ts
stripe.paymentIntents.create({
  amount: totalAmount,
  currency: 'gbp',
  automatic_payment_methods: { enabled: true },
  application_fee_amount: Math.round(totalAmount * 0.05),
  metadata: {
    reserved_items: JSON.stringify(allReservedItems),
    shipping_amount: String(shippingRatePence),
    cancel_token: uuid,
  },
})
```

Returns `{ clientSecret, paymentIntentId, cancelToken, total, shippingRate }`.

---

## Post-Checkout

### Success — `/purchase/success`

**File:** `app/purchase/success/page.tsx`

Server component. Retrieves the PaymentIntent from Stripe, verifies `status === 'succeeded'`, displays order summary, and renders `<ClearCart />`.

### Cancelled — `/purchase/cancelled`

**File:** `app/purchase/cancelled/page.tsx`

Static page. The live checkout flow restores stock via `POST /api/payment-intent/cancel` when the customer backs out of `/checkout`, and also via Stripe's `payment_intent.canceled` webhook as a safety net.

---

## Webhook Handler

**File:** `app/api/webhooks/stripe/route.ts`

Verifies Stripe's signature using `STRIPE_WEBHOOK_SECRET` before processing any event.

### `charge.succeeded`
- Logs the order
- Calls `notifyClientFromCharge()` to send order email via Resend
- Calls `syncEtsyStockAfterSale()` for linked Etsy listings

### `payment_intent.canceled`
- Parses `reserved_items` from session metadata
- Calls `restore_stock` RPC to return items to available stock

---

## Order Email (Resend)

**File:** `app/api/webhooks/stripe/route.ts` → `notifyClient()`

Environment variables:
- `RESEND_API_KEY`
- `NOTIFY_EMAIL` — comma-separated list of recipient addresses
- `RESEND_FROM_EMAIL` — sender address (must be a verified Resend domain)

Email contents:
- Customer name, email, phone
- Shipping address
- Items: image thumbnail, title, type (Artwork/Print), quantity, price
- Financial table: Subtotal / Shipping / Total / Fees / Net to you

Fee note in email is informational only — the actual fee deducted is calculated in the payment-intent route and applied by Stripe.

---

## Admin Authentication

**File:** `app/_lib/adminAuth.ts`, `app/api/admin/session/route.ts`

1. Admin logs in via Supabase Auth (email/password)
2. Client sends the Supabase `access_token` to `POST /api/admin/session`
3. Server verifies the token, checks email against `ADMIN_EMAIL_ALLOWLIST`
4. Sets an HTTP-only cookie: `admin_access_token` (1hr expiry, secure in prod)
5. Every Server Action calls `requireAdminUser()` which re-validates the cookie token against Supabase on every request

Environment variable:
- `ADMIN_EMAIL_ALLOWLIST` — comma-separated emails, e.g. `admin@example.com,other@example.com`

---

## Live Stock Polling

**File:** `GET /api/stock`

`WorkGallery` polls this endpoint on mount to get current stock levels by `stripe_price_id`. Response is `Cache-Control: no-store`. Updates the UI without a full page reload.

---

## Environment Variables Summary

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Full DB access — never expose to browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (auth UI) | Public key for Supabase Auth |
| `STRIPE_SECRET_KEY` | Server only | `sk_test_...` dev / `sk_live_...` prod |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | `pk_test_...` dev / `pk_live_...` prod |
| `STRIPE_WEBHOOK_SECRET` | Webhook handler | From Stripe dashboard → Webhooks |
| `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` | Checkout route | Artist's `acct_...` connected account ID |
| `RESEND_API_KEY` | Webhook handler | From Resend dashboard |
| `RESEND_FROM_EMAIL` | Webhook handler | Must be a verified Resend sender domain |
| `NOTIFY_EMAIL` | Webhook handler | Comma-separated order notification recipients |
| `ADMIN_EMAIL_ALLOWLIST` | Auth | Comma-separated admin email addresses |
| `NEXT_PUBLIC_SITE_URL` | Checkout route | e.g. `https://yourdomain.com` |
