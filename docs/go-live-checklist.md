# Go-Live Checklist

Practical step-by-step checklist to get the site fully live. Work through these in order.

---

## Phase 1 — Artist's Stripe Account

> The artist just needs to set up their account. The Connect linking happens later in live mode (Phase 2).

- [ ] Artist creates a Stripe account at **stripe.com** (if they don't have one)
- [ ] Artist completes identity verification in their Stripe dashboard (required for live payouts)
- [ ] Artist adds their bank account details in Stripe → Settings → Payouts

---

## Phase 2 — Go Live on Stripe (Switch from Test to Live)

> Do this once the artist's account is verified. **Connect account linking only works in live mode — you cannot do this in test/sandbox mode.**

- [ ] In your Stripe dashboard, switch to **Live mode** (toggle top-left)
- [ ] Go to **Developers → API Keys** → copy the live keys:
  - `STRIPE_SECRET_KEY = sk_live_...`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...`
- [ ] In your Stripe platform dashboard (in **Live mode**) → Connect → Accounts:
  - Send the artist an invitation link, or
  - Have them connect their account to yours via the Connect onboarding URL
- [ ] Once connected, copy their **Connected Account ID** (`acct_...`)
  - Found in your Stripe dashboard → Connect → Accounts → click their account
- [ ] Add to Vercel env vars: `STRIPE_CONNECT_CLIENT_ACCOUNT_ID = acct_...`
- [ ] Go to **Developers → Webhooks** → Add **two** endpoints:

  **1. Standard account webhook** (for platform-level events):
  - URL: `https://yourdomain.com/api/webhooks/stripe`
  - Events: `payment_intent.canceled`
  - Signing secret → `STRIPE_WEBHOOK_SECRET`

  **2. Connect webhook** (for events forwarded from connected accounts — this is how order notifications fire):
  - URL: `https://yourdomain.com/api/webhooks/stripe`
  - Type: "Connect" (listen for events from connected accounts)
  - Events: `charge.succeeded`, `payment_intent.canceled`
  - Signing secret → `STRIPE_CONNECT_WEBHOOK_SECRET`

- [ ] Update all env vars above in Vercel
- [ ] Redeploy on Vercel after updating env vars

---

## Phase 3 — Domain

- [ ] Purchase a domain (e.g. via Namecheap, GoDaddy, Vercel Domains)
- [ ] In **Vercel → Project → Settings → Domains**:
  - Add the domain (e.g. `yourdomain.com`)
  - Vercel will show DNS records to set
- [ ] In your domain registrar's DNS settings, add the records Vercel gives you
- [ ] Wait for DNS propagation (usually 5–30 minutes, up to 48hrs)
- [ ] Vercel automatically provisions an SSL certificate — confirm the padlock appears
- [ ] Update env var: `NEXT_PUBLIC_SITE_URL = https://yourdomain.com`
- [ ] Redeploy after updating

---

## Phase 4 — Email (Resend)

- [ ] In **Resend dashboard → Domains**, add the site domain (e.g. `yourdomain.com`)
- [ ] Add the DNS records Resend gives you (MX, TXT, CNAME)
- [ ] Wait for Resend to verify the domain (green tick)
- [ ] Set env var: `RESEND_FROM_EMAIL = orders@yourdomain.com` (or similar)
- [ ] Set env var: `NOTIFY_EMAIL = artist@yourdomain.com` (where order notifications should go)
- [ ] Test by placing a real order and confirming the email arrives

---

## Phase 5 — Admin Access

- [ ] Set env var: `ADMIN_EMAIL_ALLOWLIST = artist@yourdomain.com`
  - Add additional admin emails separated by commas if needed
- [ ] In **Supabase → Authentication → Users**:
  - Create a user with the artist's email and a secure temporary password, or invite them
- [ ] Walk them through logging in at `https://yourdomain.com/admin`
- [ ] Have them change their password immediately after first login

---

## Phase 6 — Etsy Sync (optional)

> Skip this phase if the artist does not use Etsy.

- [ ] Go to https://www.etsy.com/developers/register and create a new app
  - Set the **Redirect URI** to `https://yourdomain.com/api/etsy/auth/callback`
  - Copy the **Keystring** → `ETSY_API_KEY`
  - Copy the **Shared secret** → `ETSY_API_SECRET`
- [ ] Find the artist's **Shop ID** — visit `https://openapi.etsy.com/v3/application/shops?shop_name=YourShopName` → `ETSY_SHOP_ID`
- [ ] Set `CRON_SECRET` to any random string (protects the stock-sync endpoint)
- [ ] Add all four vars to Vercel env vars and redeploy
- [ ] Log in to `/admin/etsy` and click **Connect Etsy** — authorise in the Etsy OAuth screen
- [ ] Click **Pull listings**, then import any listings you want to sell through this site
- [ ] Confirm imported products appear in `/work`

**How stock stays in sync after go-live:**

| Event | What happens |
|---|---|
| Sale on this site | Stripe webhook fires → Etsy listing quantity updated immediately |
| Stock edited in admin | Save in `/admin/edit-product` → Etsy listing quantity updated immediately |
| Sale on Etsy | Vercel Cron polls `/api/etsy/poll` every 10 min → app stock reduced to match |
| Restock on Etsy | Next cron run detects higher Etsy qty and pushes app stock up |

---

## Phase 7 — Add Real Products

> Test-mode products do not carry over to live mode. All products need to be re-added.

- [ ] Log in to `/admin/add-product`
- [ ] Add each artwork/print with:
  - Name, description, price (in £), stock level
  - Type: Artwork or Print
  - Medium, dimensions, year
  - Categories
  - Cover image + gallery images
- [ ] Verify each product appears on `/work`
- [ ] Verify stock levels are correct

---

## Phase 8 — Settings

- [ ] Go to `/admin/settings`
- [ ] Set shipping rates for **UK**, **EU**, and **International** — both prints and artwork rates
- [ ] Set the shipping region (UK only / UK + EU / International) to control which countries can check out
- [ ] Toggle category filters on or off as preferred
- [ ] Go to `/admin/home-about`
- [ ] Review the intro text and gallery images for the home About section; update or reset to defaults as needed
- [ ] Go to `/admin/about`
- [ ] Review/update the full About page content (bio, CV, portrait, gallery)

---

## Phase 9 — Final Checks Before Announcing

- [ ] Place a real purchase with a real card (a low-value item or a £1 test product)
  - Confirm payment appears in **the artist's** Stripe dashboard
  - Confirm the platform fee (5%) is retained on **your** Stripe account
  - Confirm the order notification email arrives with correct totals and shipping address
  - Confirm the success page shows correctly
  - Confirm a collection-mode order email shows the Edinburgh collection banner (no address)
- [ ] Delete the test product from admin
- [ ] Check the site on mobile
- [ ] Check all gallery images load correctly
- [ ] Confirm `/work?project={id}` deep links work
- [ ] Confirm the cart persists across page refreshes
- [ ] Confirm out-of-stock items show as unavailable
- [ ] Place an EU/international order and confirm shipping rate updates in the checkout when country is selected
- [ ] If using Etsy: import a listing, purchase it on this site, and confirm the Etsy listing quantity drops to 0
- [ ] If using Etsy: manually trigger `/api/etsy/poll` (with the `Authorization: Bearer <CRON_SECRET>` header) and confirm it responds with `synced: 0` (nothing out of sync)

---

## Quick Reference — Where Things Live

| Thing | Where |
|---|---|
| Vercel env vars | vercel.com → Project → Settings → Environment Variables |
| Stripe live keys | dashboard.stripe.com → Developers → API Keys (live mode) |
| Standard webhook secret | dashboard.stripe.com → Developers → Webhooks (standard) |
| Connect webhook secret | dashboard.stripe.com → Developers → Webhooks (Connect) |
| Artist's Connect account ID | dashboard.stripe.com → Connect → Accounts |
| Resend API key | resend.com → API Keys |
| Supabase keys | supabase.com → Project → Settings → API |
| DNS records | your domain registrar's control panel |
| Admin login | yourdomain.com/admin |
| Etsy developer apps | etsy.com/developers |
| Etsy sync admin | yourdomain.com/admin/etsy |
| Cron secret | Vercel env var `CRON_SECRET` |
