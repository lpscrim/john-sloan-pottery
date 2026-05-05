import { createServerSupabase } from './supabase';

const ETSY_BASE = 'https://openapi.etsy.com/v3';
const MOCK_MODE = process.env.ETSY_MOCK === 'true';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_LISTINGS: EtsyListing[] = [
  {
    listing_id: 1001,
    title: 'Mock Stoneware Bowl',
    description: 'A test bowl for development purposes.',
    price: { amount: 4500, divisor: 100, currency_code: 'GBP' },
    quantity: 3,
    url: 'https://www.etsy.com/listing/1001/mock-stoneware-bowl',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Bowl' }],
  },
  {
    listing_id: 1002,
    title: 'Mock Celadon Vase',
    description: 'A test vase for development purposes.',
    price: { amount: 7500, divisor: 100, currency_code: 'GBP' },
    quantity: 1,
    url: 'https://www.etsy.com/listing/1002/mock-celadon-vase',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Vase' }],
  },
  {
    listing_id: 1003,
    title: 'Mock Ash Glaze Mug',
    description: 'A test mug for development purposes.',
    price: { amount: 2800, divisor: 100, currency_code: 'GBP' },
    quantity: 5,
    url: 'https://www.etsy.com/listing/1003/mock-ash-glaze-mug',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Mug' }],
  },
  {
    listing_id: 1004,
    title: 'Mock Terracotta Plate',
    description: 'A test plate for development purposes.',
    price: { amount: 3200, divisor: 100, currency_code: 'GBP' },
    quantity: 4,
    url: 'https://www.etsy.com/listing/1004/mock-terracotta-plate',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Plate' }],
  },
  {
    listing_id: 1005,
    title: 'Mock Porcelain Cup',
    description: 'A test cup for development purposes.',
    price: { amount: 2200, divisor: 100, currency_code: 'GBP' },
    quantity: 8,
    url: 'https://www.etsy.com/listing/1005/mock-porcelain-cup',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Cup' }],
  },
  {
    listing_id: 1006,
    title: 'Mock Raku Jar',
    description: 'A test jar for development purposes.',
    price: { amount: 5500, divisor: 100, currency_code: 'GBP' },
    quantity: 2,
    url: 'https://www.etsy.com/listing/1006/mock-raku-jar',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Jar' }],
  },
  {
    listing_id: 1007,
    title: 'Mock Earthenware Jug',
    description: 'A test jug for development purposes.',
    price: { amount: 6000, divisor: 100, currency_code: 'GBP' },
    quantity: 1,
    url: 'https://www.etsy.com/listing/1007/mock-earthenware-jug',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Jug' }],
  },
  {
    listing_id: 1008,
    title: 'Mock Salt Glaze Pitcher',
    description: 'A test pitcher for development purposes.',
    price: { amount: 8000, divisor: 100, currency_code: 'GBP' },
    quantity: 1,
    url: 'https://www.etsy.com/listing/1008/mock-salt-glaze-pitcher',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Pitcher' }],
  },
  {
    listing_id: 1009,
    title: 'Mock Yunomi Tea Bowl',
    description: 'A test tea bowl for development purposes.',
    price: { amount: 3500, divisor: 100, currency_code: 'GBP' },
    quantity: 6,
    url: 'https://www.etsy.com/listing/1009/mock-yunomi-tea-bowl',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=TeaBowl' }],
  },
  {
    listing_id: 1010,
    title: 'Mock Slip Cast Bottle',
    description: 'A test bottle for development purposes.',
    price: { amount: 4800, divisor: 100, currency_code: 'GBP' },
    quantity: 3,
    url: 'https://www.etsy.com/listing/1010/mock-slip-cast-bottle',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Bottle' }],
  },
  {
    listing_id: 1011,
    title: 'Mock Wood Fire Vessel',
    description: 'A test vessel for development purposes.',
    price: { amount: 9500, divisor: 100, currency_code: 'GBP' },
    quantity: 1,
    url: 'https://www.etsy.com/listing/1011/mock-wood-fire-vessel',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Vessel' }],
  },
  {
    listing_id: 1012,
    title: 'Mock Carved Platter',
    description: 'A test platter for development purposes.',
    price: { amount: 6500, divisor: 100, currency_code: 'GBP' },
    quantity: 2,
    url: 'https://www.etsy.com/listing/1012/mock-carved-platter',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Platter' }],
  },
  {
    listing_id: 1013,
    title: 'Mock Soda Fire Pot',
    description: 'A test pot for development purposes.',
    price: { amount: 5200, divisor: 100, currency_code: 'GBP' },
    quantity: 2,
    url: 'https://www.etsy.com/listing/1013/mock-soda-fire-pot',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Pot' }],
  },
  {
    listing_id: 1014,
    title: 'Mock Shino Glaze Bowl',
    description: 'A test bowl for development purposes.',
    price: { amount: 4200, divisor: 100, currency_code: 'GBP' },
    quantity: 3,
    url: 'https://www.etsy.com/listing/1014/mock-shino-glaze-bowl',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=ShinoBowl' }],
  },
  {
    listing_id: 1015,
    title: 'Mock Coiled Vase',
    description: 'A test vase for development purposes.',
    price: { amount: 7800, divisor: 100, currency_code: 'GBP' },
    quantity: 1,
    url: 'https://www.etsy.com/listing/1015/mock-coiled-vase',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=CoiledVase' }],
  },
  {
    listing_id: 1016,
    title: 'Mock Anagama Jar',
    description: 'A test jar for development purposes.',
    price: { amount: 11000, divisor: 100, currency_code: 'GBP' },
    quantity: 1,
    url: 'https://www.etsy.com/listing/1016/mock-anagama-jar',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=AnagamaJar' }],
  },
  {
    listing_id: 1017,
    title: 'Mock Reduction Fired Cup',
    description: 'A test cup for development purposes.',
    price: { amount: 2600, divisor: 100, currency_code: 'GBP' },
    quantity: 7,
    url: 'https://www.etsy.com/listing/1017/mock-reduction-fired-cup',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=ReductionCup' }],
  },
  {
    listing_id: 1018,
    title: 'Mock Majolica Tile',
    description: 'A test tile for development purposes.',
    price: { amount: 1800, divisor: 100, currency_code: 'GBP' },
    quantity: 10,
    url: 'https://www.etsy.com/listing/1018/mock-majolica-tile',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Tile' }],
  },
  {
    listing_id: 1019,
    title: 'Mock Tenmoku Teapot',
    description: 'A test teapot for development purposes.',
    price: { amount: 13500, divisor: 100, currency_code: 'GBP' },
    quantity: 1,
    url: 'https://www.etsy.com/listing/1019/mock-tenmoku-teapot',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Teapot' }],
  },
  {
    listing_id: 1020,
    title: 'Mock Iron Oxide Dish',
    description: 'A test dish for development purposes.',
    price: { amount: 3800, divisor: 100, currency_code: 'GBP' },
    quantity: 4,
    url: 'https://www.etsy.com/listing/1020/mock-iron-oxide-dish',
    images: [{ url_fullxfull: 'https://placehold.co/600x600?text=Dish' }],
  },
];

const MOCK_INVENTORY: EtsyInventory = {
  products: [
    {
      product_id: 1,
      property_values: [],
      offerings: [
        {
          offering_id: 1,
          quantity: 3,
          is_enabled: true,
          price: { amount: 4500, divisor: 100, currency_code: 'GBP' },
        },
      ],
    },
  ],
  price_on_property: [],
  quantity_on_property: [],
  sku_on_property: [],
};

interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix ms
}

export interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  url: string;
  images: { url_fullxfull: string }[];
}

interface EtsyInventoryOffering {
  offering_id: number;
  quantity: number;
  is_enabled: boolean;
  price: { amount: number; divisor: number; currency_code: string };
}

interface EtsyInventoryProduct {
  product_id: number;
  property_values: unknown[];
  offerings: EtsyInventoryOffering[];
}

export interface EtsyInventory {
  products: EtsyInventoryProduct[];
  price_on_property: number[];
  quantity_on_property: number[];
  sku_on_property: number[];
}

// ─── Token storage (Supabase settings table) ──────────────────────────────────

async function getTokens(): Promise<EtsyTokens | null> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['etsy_access_token', 'etsy_refresh_token', 'etsy_token_expires_at']);

  if (!data || data.length < 3) return null;
  const map = Object.fromEntries(data.map((r) => [r.key, r.value]));

  if (!map.etsy_access_token || !map.etsy_refresh_token) return null;
  return {
    access_token: map.etsy_access_token,
    refresh_token: map.etsy_refresh_token,
    expires_at: parseInt(map.etsy_token_expires_at ?? '0', 10),
  };
}

async function saveTokens(tokens: EtsyTokens): Promise<void> {
  const supabase = createServerSupabase();
  await supabase.from('settings').upsert(
    [
      { key: 'etsy_access_token', value: tokens.access_token },
      { key: 'etsy_refresh_token', value: tokens.refresh_token },
      { key: 'etsy_token_expires_at', value: String(tokens.expires_at) },
    ],
    { onConflict: 'key' },
  );
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<EtsyTokens> {
  const apiKey = process.env.ETSY_API_KEY!;
  const apiSecret = process.env.ETSY_API_SECRET!;

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: apiKey,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy token refresh failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const tokens: EtsyTokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in as number) * 1000 - 60_000,
  };
  await saveTokens(tokens);
  return tokens;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<EtsyTokens> {
  const apiKey = process.env.ETSY_API_KEY!;
  const apiSecret = process.env.ETSY_API_SECRET!;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: apiKey,
      redirect_uri: `${siteUrl}/api/etsy/auth/callback`,
      code,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy token exchange failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  const tokens: EtsyTokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in as number) * 1000 - 60_000,
  };
  await saveTokens(tokens);
  return tokens;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function isEtsyConnected(): Promise<boolean> {
  if (MOCK_MODE) return true;
  const tokens = await getTokens();
  return tokens !== null && !!tokens.access_token;
}

async function getValidAccessToken(): Promise<string> {
  const tokens = await getTokens();
  if (!tokens) throw new Error('Etsy not connected. Complete OAuth setup first.');
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  return refreshed.access_token;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export async function fetchActiveListings(): Promise<EtsyListing[]> {
  if (MOCK_MODE) return MOCK_LISTINGS;
  const apiKey = process.env.ETSY_API_KEY!;
  const shopId = process.env.ETSY_SHOP_ID!;
  const accessToken = await getValidAccessToken();

  const results: EtsyListing[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url =
      `${ETSY_BASE}/application/shops/${shopId}/listings/active` +
      `?limit=${limit}&offset=${offset}&includes[]=Images`;

    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Etsy listings fetch failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const batch: EtsyListing[] = json.results ?? [];
    results.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return results;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function fetchListingInventory(listingId: number): Promise<EtsyInventory> {
  if (MOCK_MODE) return { ...MOCK_INVENTORY, products: MOCK_INVENTORY.products.map(p => ({ ...p })) };
  const apiKey = process.env.ETSY_API_KEY!;
  const accessToken = await getValidAccessToken();

  const res = await fetch(`${ETSY_BASE}/application/listings/${listingId}/inventory`, {
    headers: {
      'x-api-key': apiKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy inventory fetch failed for ${listingId}: ${res.status} ${text}`);
  }

  return res.json();
}

export async function updateListingInventory(
  listingId: number,
  newQuantity: number,
  existingInventory?: EtsyInventory,
): Promise<void> {
  if (MOCK_MODE) {
    console.log(`[ETSY MOCK] updateListingInventory listing=${listingId} qty=${newQuantity}`);
    return;
  }
  const apiKey = process.env.ETSY_API_KEY!;
  const accessToken = await getValidAccessToken();

  // Use provided inventory or fetch it to preserve price/property structure
  const inventory = existingInventory ?? await fetchListingInventory(listingId);

  const updatedProducts = inventory.products.map((product) => ({
    ...product,
    offerings: product.offerings.map((offering) => ({
      ...offering,
      quantity: Math.max(0, newQuantity),
    })),
  }));

  const res = await fetch(`${ETSY_BASE}/application/listings/${listingId}/inventory`, {
    method: 'PUT',
    headers: {
      'x-api-key': apiKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ products: updatedProducts }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy inventory update failed for ${listingId}: ${res.status} ${text}`);
  }
}
