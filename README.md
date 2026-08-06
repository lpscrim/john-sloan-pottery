# John Sloan Pottery

A fully featured artist shop and portfolio site for John Sloan Pottery, built with **Next.js 16**, **Tailwind CSS 4**, **Framer Motion**, **Supabase**, and **Stripe**.

## Features

- **Product Gallery** — Showcase work with categories, filters, and details
- **Shopping Cart** — localStorage-based cart with item counts in header, slide-out drawer
- **Stripe Payments** — Embedded checkout with Stripe Elements and automatic stock reservation
- **Photo Modal** — Swipe gestures, thumbnails, lazy loading, blur placeholders
- **Admin Dashboard** — Secure Supabase auth with email allowlist
  - Add products with cover + up to 4 gallery images
  - Edit product info, pricing, stock, images
  - Delete products with automatic cleanup
  - HTTP-only session cookies, server-side validation
- **Responsive Design** — Mobile-first, hero animations, touch-friendly
- **SEO & Cache** — Sitemap, robots.txt, Open Graph/Twitter meta, on-demand revalidation
- **Production-Ready** — Docker-friendly, serverless-compatible

---

## Architecture Overview

The app uses two external services:

- **Supabase** — Your database (PostgreSQL) and image storage. You own all the data.
- **Stripe** — Payment processing. Holds its own copy of product names and prices so checkout pages are tamper-proof.

They're linked: every product exists in both systems. Supabase stores Stripe's IDs (`stripe_product_id`, `stripe_price_id`) so the frontend can trigger checkout without exposing secrets.

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN ADDS PRODUCT                           │
│                                                                     │
│  1. Cover image ──────────► Supabase Storage (product-images bucket)│
│  2. Product row ──────────► Supabase DB (products table)            │
│  3. Product + Price ──────► Stripe API                              │
│  4. Stripe IDs ───────────► saved back to Supabase row              │
│  5. Gallery images ───────► Supabase Storage (product-images/{id}/) │
│  6. Revalidate cached pages (/ and /work)                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     CUSTOMER VIEWS GALLERY                          │
│                                                                     │
│  1. Server Component calls getProjects()                            │
│  2. Queries Supabase DB for all products                            │
│  3. Lists gallery images from Supabase Storage per product          │
│  4. Renders grid of Cards with BuyButton (has stripe_price_id)      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     CUSTOMER ADDS TO CART                            │
│                                                                     │
│  1. BuyButton calls addItem() from CartContext                      │
│  2. Checks quantity against stock_level (won't exceed it)           │
│  3. Reads/writes localStorage (key: "shop-cart")                    │
│  4. Opens CartDrawer (slides in from the right)                     │
│  No server calls — cart is entirely client-side until checkout.      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      CUSTOMER CHECKS OUT                            │
│                                                                     │
│  1. CartDrawer POSTs to /api/payment-intent                         │
│     { items: [{ priceId: "price_XYZ", quantity: 1 }] }            │
│  2. Server reserves stock and creates a Stripe PaymentIntent        │
│  3. Browser stores checkout state and routes to /checkout           │
│  4. Customer enters address + payment details via Stripe Elements   │
│  5. Shipping is recalculated when destination country changes       │
│  6. Stripe redirects to /purchase/success after confirmation        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  AFTER PAYMENT (WEBHOOK)                            │
│                                                                     │
│  Stripe POSTs to /api/webhooks/stripe (server-to-server)            │
│                                                                     │
│  1. Verify request signature with Stripe webhook secret(s)          │
│  2. On charge.succeeded: send order email + sync Etsy stock         │
│  3. On payment_intent.canceled: restore reserved stock              │
│  4. Stock is reserved before payment, not decremented afterwards    │
│  5. Next page load shows updated availability immediately           │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
| --- | --- |
| `app/_lib/supabase.ts` | Server-side Supabase client (service role key) |
| `app/_lib/supabaseBrowser.ts` | Browser-side Supabase client (anon key, for auth only) |
| `app/_lib/stripe.ts` | Server-side Stripe SDK instance |
| `app/_lib/adminAuth.ts` | Admin auth helpers (cookie check + email allowlist) |
| `app/_data/projects.ts` | Fetches products from Supabase + gallery images from Storage |
| `app/admin/add-product/actions.ts` | Server Action: upload images, insert DB row, create Stripe Product+Price |
| `app/admin/edit-product/actions.ts` | Server Action: update/delete product in both Supabase and Stripe |
| `app/api/payment-intent/route.ts` | Reserves stock and creates Stripe PaymentIntents |
| `app/api/payment-intent/update-shipping/route.ts` | Recalculates shipping by destination country |
| `app/api/payment-intent/cancel/route.ts` | Cancels a PaymentIntent and restores reserved stock |
| `app/api/webhooks/stripe/route.ts` | Handles order email, Etsy sync, and stock restoration |
| `app/api/admin/session/route.ts` | Sets/clears admin session cookie after Supabase Auth login |
| `app/api/revalidate/route.ts` | Cache revalidation endpoint (secret-protected) |
| `app/_components/Cart/CartContext.tsx` | React context + localStorage cart with stock-level capping |
| `app/_components/Cart/CartDrawer.tsx` | Slide-out cart drawer with checkout button |
| `app/_components/UI/Layout/BuyButton.tsx` | Add-to-cart button with stock/price display |

### Security

| What | How it's protected |
| --- | --- |
| Admin actions | Email allowlist + Supabase Auth token in httpOnly cookie, verified on every Server Action |
| Card numbers | Never touch your server — Stripe Elements sends payment data directly to Stripe |
| Webhook | Signature verification with `STRIPE_WEBHOOK_SECRET` prevents spoofed requests |
| Secret keys | `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` only used in server-side code |
| Price tampering | Customers send a `stripe_price_id`, not a raw amount — Stripe looks up the real price |
| Stock | Reserved server-side before payment and restored automatically on cancellation |
| Admin session | httpOnly, sameSite: lax, secure in production, 1-hour expiry |

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `npm run test` | Run Vitest unit tests |
| `npm run clean` | Remove `.next`, `.turbo`, `node_modules/.cache` |

## Environment Variables

Create a `.env.local` file:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (required)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin auth (required for /admin routes)
ADMIN_EMAIL_ALLOWLIST=your-email@example.com

# Site URL (recommended)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Revalidation secret (optional)
REVALIDATE_SECRET=some-long-random-string

# Etsy sync (optional)
ETSY_API_KEY=your-etsy-api-key
ETSY_API_SECRET=your-etsy-api-secret
ETSY_SHOP_ID=your-etsy-shop-id
ETSY_WEBHOOK_SECRET=some-random-string
CRON_SECRET=some-random-string
MAKE_ETSY_SYNC_WEBHOOK_URL=https://hook.make.com/your-webhook
```

## Supabase Schema

Create a `products` table in Supabase with these columns:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `name` | text | Product name |
| `description` | text | Product description |
| `price_hw` | integer | Price in pence (e.g. 2500 = £25.00) |
| `image_url` | text | Cover image public URL |
| `stock_level` | integer | Current stock |
| `categories` | text[] | Array of category strings |
| `year` | text | Year of the project |
| `stripe_product_id` | text, nullable | Auto-filled when product is created |
| `stripe_price_id` | text, nullable | Auto-filled when product is created |

### Storage Bucket

Create a **public** Storage bucket called `product-images` in Supabase.

- Cover images are stored at: `uploads/{timestamp}_{uuid}.{ext}`
- Gallery images are stored at: `{product_id}/00_{uuid}.{ext}`, `{product_id}/01_{uuid}.{ext}`, etc.

The app reads gallery images by listing all files under `product-images/{product_id}/`.

### Stock RPCs

Create these SQL functions in Supabase (SQL Editor → New Query → Run):

```sql
-- reserve_stock(items jsonb)
-- restore_stock(items jsonb)
```

The live checkout flow reserves stock before payment intent creation and restores it if the payment is cancelled or expires.

## Setup Checklist

- [ ] Create Supabase project → get `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Create `products` table in Supabase (see schema above)
- [ ] Create `product-images` Storage bucket in Supabase (set to **public**)
- [ ] Create the `reserve_stock` and `restore_stock` RPC functions in Supabase
- [ ] Create Stripe account → get `STRIPE_SECRET_KEY`
- [ ] Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Set up Stripe webhook pointing to `https://your-domain.com/api/webhooks/stripe`
  - Use `STRIPE_WEBHOOK_SECRET` for the standard endpoint
  - Use `STRIPE_CONNECT_WEBHOOK_SECRET` as well if using a connected account
  - Subscribe to `charge.succeeded` and `payment_intent.canceled`
- [ ] Add your email to `ADMIN_EMAIL_ALLOWLIST` in `.env.local`
- [ ] Create a Supabase Auth user with that email (Authentication → Users → Add User)
- [ ] Add hero video(s) to `public/` (`Banner Landscape.mp4`, `Banner Portrait.mp4`) or swap the Hero component for an image
- [ ] Update site name in `app/layout.tsx` and `app/_components/Sections/Header.tsx`
- [ ] Update artist name/tagline in `app/_components/Sections/Home/Hero.tsx`
- [ ] Update about section default text/images in `app/_lib/homeAboutContent.ts`
- [ ] Update contact email and social links in `app/_components/Sections/Home/Contact.tsx`
- [ ] Update copyright name in `app/_components/Sections/Footer.tsx`
- [ ] Replace favicons in `public/`
- [ ] Set `NEXT_PUBLIC_SITE_URL` for correct SEO URLs
- [ ] If using Etsy sync, configure `ETSY_API_KEY`, `ETSY_API_SECRET`, `ETSY_SHOP_ID`, `ETSY_WEBHOOK_SECRET`, `CRON_SECRET`, and `MAKE_ETSY_SYNC_WEBHOOK_URL`

## Admin Dashboard

The `/admin` routes are protected by Supabase authentication with an email allowlist:

- **Login**: Email/password via Supabase Auth
- **Security**: Only emails in `ADMIN_EMAIL_ALLOWLIST` can access admin. Token is re-validated on every Server Action.
- **Session**: HTTP-only cookie (`admin_access_token`), 1-hour expiry, secure in production
- **Pages**:
  - `/admin` — Dashboard with Add/Edit product links
  - `/admin/add-product` — Upload new product with cover + up to 4 gallery images
  - `/admin/edit-product` — Edit/delete existing products with image management

### What Happens When You Edit a Product

- Updates the Supabase row (name, description, price, stock, categories, etc.)
- Updates the Stripe Product (name, description, image)
- If the price changed: creates a **new** Stripe Price (Stripe Prices are immutable) and saves the new `stripe_price_id`
- If you uploaded a new cover: deletes the old image from Storage, uploads the new one
- If you removed gallery images: deletes them from Storage

### What Happens When You Delete a Product

- Deletes cover image and all gallery images from Supabase Storage
- Deletes the row from the `products` table
- **Deactivates** (doesn't delete) the Stripe Product — Stripe requires payment records to be kept

## Revalidating Cache

Cache is automatically revalidated when you add/edit/delete products via admin. You can also trigger it manually:

```bash
curl "https://your-domain.com/api/revalidate?secret=YOUR_REVALIDATE_SECRET"
```

A GitHub Actions workflow (`.github/workflows/keep-alive.yml`) pings this endpoint every 3 days to prevent Supabase free-tier from pausing.

## Deployment

### Vercel (Recommended)

1. Push to GitHub/GitLab
2. Import project in Vercel
3. Add environment variables in project settings
4. Deploy with `npm run build`
5. Set up the Stripe webhook(s) pointing to your Vercel URL
6. If using Etsy sync, add the same Etsy-related environment variables in Vercel and GitHub Actions secrets

### GitHub Actions / Etsy Sync

The repository includes a scheduled workflow in [.github/workflows/etsy-sync.yml](.github/workflows/etsy-sync.yml) that calls the Etsy poll endpoint every 4 hours.

To make it work reliably, set these GitHub Actions secrets:

- `SITE_URL` — your public deployment URL
- `CRON_SECRET` — a shared secret for the cron endpoint

The endpoint itself is protected by the `CRON_SECRET` header and will trigger the Make.com webhook configured by `MAKE_ETSY_SYNC_WEBHOOK_URL`.

> GitHub-hosted Actions runners can occasionally queue behind other jobs or hit transient infrastructure issues. If a run is delayed or shows “queued”, that is usually a GitHub runner availability problem rather than an Etsy misconfiguration.

### Self-Hosted

```bash
npm run build
npm start
```

Requires Node.js 18+.

## License

MIT
