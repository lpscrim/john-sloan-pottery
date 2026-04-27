# Handover Checklist

Everything required to deploy and hand over this project to a new owner or client.

---

## 1. Accounts to Create / Transfer

- [ ] **Vercel** — create account, import the GitHub repo, or transfer ownership of existing project
- [ ] **Supabase** — create a new project. Note the project URL and keys
- [ ] **Stripe** — create account (platform). Complete identity verification for live payouts
- [ ] **Stripe Connect** — artist creates their own Stripe account and connects it (or use Express onboarding)
- [ ] **Resend** — create account, verify the sending domain
- [ ] **GitHub** — transfer repo ownership or add the new owner as a collaborator

---

## 2. Supabase Setup

### Database

Run these SQL statements in the Supabase SQL editor:

```sql
-- Products table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  description text,
  price_hw integer,         -- price in pence
  stock_level integer DEFAULT 0,
  categories text[],
  medium text,
  glaze text[] DEFAULT '{}',
  image_url text,
  stripe_product_id text,
  stripe_price_id text,
  type text NOT NULL DEFAULT 'pottery'
);

-- Settings table (key-value store)
CREATE TABLE settings (
  key text PRIMARY KEY,
  value text
);

-- About content table (single row, id = 1)
CREATE TABLE about_content (
  id integer PRIMARY KEY DEFAULT 1,
  statement text,
  bio text,
  portrait_url text,
  exhibitions jsonb DEFAULT '[]',
  education jsonb DEFAULT '[]',
  awards jsonb DEFAULT '[]',
  press jsonb DEFAULT '[]',
  gallery_images jsonb DEFAULT '[]',
  updated_at timestamptz
);

-- Order tracking table
CREATE TABLE order_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text,
  charge_id text,
  customer_name text,
  customer_email text,
  amount integer,
  status text DEFAULT 'paid',
  items jsonb,
  shipping_address jsonb,
  created_at timestamptz DEFAULT now()
);

-- Stock reservation RPC
CREATE OR REPLACE FUNCTION reserve_stock(items jsonb)
RETURNS jsonb AS $$
DECLARE
  item jsonb;
  result jsonb := '[]';
  current_stock integer;
  reserved boolean;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    SELECT stock_level INTO current_stock
    FROM products
    WHERE stripe_price_id = item->>'stripe_price_id'
    FOR UPDATE;

    IF current_stock >= (item->>'qty')::integer THEN
      UPDATE products
      SET stock_level = stock_level - (item->>'qty')::integer
      WHERE stripe_price_id = item->>'stripe_price_id';
      reserved := true;
    ELSE
      reserved := false;
    END IF;

    result := result || jsonb_build_object(
      'stripe_price_id', item->>'stripe_price_id',
      'title', (SELECT name FROM products WHERE stripe_price_id = item->>'stripe_price_id'),
      'reserved', reserved
    );
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Stock restore RPC
CREATE OR REPLACE FUNCTION restore_stock(items jsonb)
RETURNS void AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    UPDATE products
    SET stock_level = stock_level + (item->>'qty')::integer
    WHERE stripe_price_id = item->>'stripe_price_id';
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### Seed shipping settings

After creating the `settings` table, insert the default shipping rate rows:

```sql
INSERT INTO settings (key, value) VALUES
  ('artwork_shipping_rate_pence', '500'),
  ('eu_artwork_shipping_rate_pence', '1000'),
  ('int_artwork_shipping_rate_pence', '1500')
ON CONFLICT (key) DO NOTHING;
```

### Storage

Create two storage buckets, both set to **Public**:

| Bucket | Used for |
|---|---|
| `product-images` | Product cover and gallery images |
| `about-images` | /about portrait + gallery (`portrait/`, `gallery/`), home About gallery (`home/`) |

No additional RLS policies needed (service-role key bypasses RLS).

### Auth

- Enable **Email provider** in Authentication → Providers
- Disable email confirmations for immediate login (Authentication → Email → Confirm email: OFF)
- Admin access is controlled by `ADMIN_EMAIL_ALLOWLIST` env var — Supabase is used only for authentication

---

## 3. Stripe Setup

### Platform Account

- [ ] Complete identity/business verification in Stripe dashboard
- [ ] Create **two** webhook endpoints at `https://yourdomain.com/api/webhooks/stripe`:

  **Standard webhook** (platform account events):
  - Events: `payment_intent.canceled`
  - Signing secret → `STRIPE_WEBHOOK_SECRET`

  **Connect webhook** (events forwarded from connected accounts):
  - Type: "Connect"
  - Events: `charge.succeeded`, `payment_intent.canceled`
  - Signing secret → `STRIPE_CONNECT_WEBHOOK_SECRET`

### Artist Connected Account (Stripe Connect — Direct Charges)

- [ ] Artist creates their own Stripe account at stripe.com
- [ ] In your platform dashboard → Connect → Accounts, invite/connect them
- [ ] Copy the artist's account ID (`acct_...`) → `STRIPE_CONNECT_CLIENT_ACCOUNT_ID`

All payments are **direct charges** on the artist's connected account. Stripe fees come out of the artist's balance. The platform retains 5% (`application_fee_amount`).

---

## 4. Resend Setup

- [ ] Create account at resend.com
- [ ] Add and verify your sending domain
- [ ] Create an API key → `RESEND_API_KEY`
- [ ] Set `RESEND_FROM_EMAIL` to an address on your verified domain
- [ ] Set `NOTIFY_EMAIL` to the address(es) that should receive order notifications (comma-separated)

---

## 5. Environment Variables

Set all of the following in Vercel → Project → Settings → Environment Variables. Also create a `.env.local` for local development (never commit this file).

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API |
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...` for dev) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (or `pk_test_...` for dev) |
| `STRIPE_WEBHOOK_SECRET` | From standard account webhook in Stripe |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | From Connect webhook in Stripe |
| `STRIPE_CONNECT_CLIENT_ACCOUNT_ID` | `acct_...` from Stripe Connect |
| `RESEND_API_KEY` | From Resend dashboard |
| `RESEND_FROM_EMAIL` | e.g. `orders@yourdomain.com` |
| `NOTIFY_EMAIL` | e.g. `artist@example.com` |
| `ADMIN_EMAIL_ALLOWLIST` | e.g. `artist@example.com,admin@example.com` |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://yourdomain.com` |

---

## 6. Deployment (Vercel)

- [ ] Connect GitHub repo to Vercel
- [ ] Set all environment variables (section 5)
- [ ] Set **Framework Preset** to `Next.js`
- [ ] Deploy — Vercel auto-detects the build command (`next build`)
- [ ] Add custom domain in Vercel → Domains
- [ ] Update `NEXT_PUBLIC_SITE_URL` to match the custom domain

---

## 7. Post-Deployment Checks

- [ ] Visit `/work` — products load and gallery works
- [ ] Add a test product in `/admin/add-product`
- [ ] Edit the test product in `/admin/edit-product`
- [ ] Go through checkout with a Stripe test card (`4242 4242 4242 4242`) for a UK address
- [ ] Repeat checkout selecting an EU country — confirm the shipping rate updates
- [ ] Go through checkout with Edinburgh collection selected — confirm shipping = free and email shows collection banner
- [ ] Confirm stock decrements after purchase
- [ ] Confirm order notification email arrives with correct amounts
- [ ] Confirm stock restores if payment intent is cancelled (click Back in checkout)
- [ ] Confirm `/purchase/success` shows order summary
- [ ] Test admin login and logout at `/admin`
- [ ] Set shipping rates in `/admin/settings` and confirm they apply at checkout
- [ ] Update home About text and images at `/admin/home-about` and confirm changes appear on home page

---

## 8. Go Live (Switching from Test to Live)

- [ ] Replace `STRIPE_SECRET_KEY` with `sk_live_...`
- [ ] Replace `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with `pk_live_...`
- [ ] Create new live-mode webhooks in Stripe (both standard and Connect) and update `STRIPE_WEBHOOK_SECRET` / `STRIPE_CONNECT_WEBHOOK_SECRET`
- [ ] Confirm Stripe Connect artist account is also in live mode
- [ ] Re-add all products via the admin panel (test-mode Stripe products don't carry over)
- [ ] Do a real £1 test purchase to confirm the end-to-end flow
- [ ] Confirm the order email shows the correct Stripe fee

---

## 9. Admin Usage Guide

| Task | Route |
|---|---|
| Login | `/admin` |
| Add a product | `/admin/add-product` |
| Edit or delete a product | `/admin/edit-product` |
| View orders | `/admin/orders` |
| Change shipping rates / hide category filters | `/admin/settings` |
| Edit home About section | `/admin/home-about` |
| Edit /about page content | `/admin/about` |

### Adding a Product
1. Fill in name, description, price, and stock level
2. Add medium (e.g. `Stoneware`)
3. Optionally add up to 3 glaze values (e.g. `Ash glaze`, `Celadon`)
4. Add categories (comma-separated, e.g. `BOWL, FUNCTIONAL`)
5. Upload a cover image (max 4 MB)
6. Optionally upload up to 4 gallery images
7. Submit — product appears in Supabase and Stripe automatically

### Editing a Product
- Select product from the dropdown
- Edit any fields and click **Update Product**
- If price changes, a new Stripe Price is created automatically
- Success banner auto-dismisses after 3 seconds

### Stock Management
- Stock is set manually in the stock field
- Stock decrements automatically when a purchase is completed
- Stock restores automatically if a payment intent is cancelled

---

## 10. Known Limitations & Notes

- **Stripe Prices are immutable** — changing a product price creates a new Stripe Price. Old prices remain in Stripe but become inactive.
- **Image size limit** — 4 MB per image in admin upload. The `compress-images` script in `scripts/` can be used to pre-compress images locally.
- **Session metadata limit** — Stripe caps metadata values at 500 characters. The `reserved_items` JSON includes image URLs which can be long. Monitor if issues arise with large carts.
- **Fee calculation** — platform fee is 5% of the order total. See `app/api/checkout/route.ts`.
- **Categories visibility** — can be toggled on/off in `/admin/settings` without code changes.
- **Supabase RLS** — not enabled; the service-role key is used exclusively server-side. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
