export const dynamic = 'force-dynamic';

import { getStripe } from '@/app/_lib/stripe';
import { createServerSupabase } from '@/app/_lib/supabase';
import Image from 'next/image';
import type Stripe from 'stripe';
import { DispatchButton } from './DispatchButton';
import { ExportButton, type ExportOrder } from './ExportButton';

interface ShippingAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

interface OrderItem {
  name: string;
  quantity: number;
  amount: number;
  currency: string;
  imageUrl: string | null;
  priceId: string | null;
}

interface Order {
  id: string;
  created: number;
  email: string | null;
  name: string | null;
  phone: string | null;
  shippingAddress: ShippingAddress | null;
  amountTotal: number;
  currency: string;
  stripeFee: number | null;
  myFee: number;
  shippingCost: number | null;
  items: OrderItem[];
  paymentStatus: string;
  dispatched: boolean;
  dispatchedAt: string | null;
}

async function getOrders(): Promise<Order[]> {
  const stripe = getStripe();
  const supabase = createServerSupabase();
  const clientAccountId = process.env.STRIPE_CONNECT_CLIENT_ACCOUNT_ID?.trim() || undefined;
  const stripeOpts = clientAccountId ? { stripeAccount: clientAccountId } : undefined;

  // Fetch succeeded PaymentIntents directly from the artist's connected account
  const paymentIntents = await stripe.paymentIntents.list(
    {
      limit: 100,
      expand: ['data.latest_charge.balance_transaction'],
    },
    stripeOpts,
  );

  const succeeded = paymentIntents.data.filter((pi) => pi.status === 'succeeded');

  // Fetch dispatch statuses — we reuse the stripe_session_id column with PI IDs
  const piIds = succeeded.map((pi) => pi.id);
  const { data: tracking } = piIds.length > 0
    ? await supabase
        .from('order_tracking')
        .select('stripe_session_id, dispatched, dispatched_at')
        .in('stripe_session_id', piIds)
    : { data: [] };

  const dispatchMap = new Map<string, { dispatched: boolean; dispatched_at: string | null }>();
  for (const t of tracking ?? []) {
    dispatchMap.set(t.stripe_session_id, { dispatched: t.dispatched, dispatched_at: t.dispatched_at });
  }

  type ReservedItem = { stripe_price_id?: string; title: string; qty: number; price: number; image?: string; type?: string };

  return succeeded.map((pi) => {
    const charge =
      pi.latest_charge && typeof pi.latest_charge !== 'string'
        ? (pi.latest_charge as Stripe.Charge)
        : null;
    const balanceTx =
      charge?.balance_transaction && typeof charge.balance_transaction !== 'string'
        ? (charge.balance_transaction as Stripe.BalanceTransaction)
        : null;

    // Items + shipping come from PI metadata (set at checkout creation time)
    let reservedItems: ReservedItem[] = [];
    try {
      reservedItems = JSON.parse(pi.metadata?.reserved_items ?? '[]');
    } catch { /* empty */ }

    const shippingCost = parseInt(pi.metadata?.shipping_amount ?? '0', 10);
    const amountTotal = pi.amount;
    const stripeFee = balanceTx?.fee ?? null;
    const myFee = Math.round(amountTotal * 0.01);

    const shipping = charge?.shipping;
    const shippingAddress: ShippingAddress | null = shipping?.address
      ? {
          line1: shipping.address.line1 ?? null,
          line2: shipping.address.line2 ?? null,
          city: shipping.address.city ?? null,
          postalCode: shipping.address.postal_code ?? null,
          country: shipping.address.country ?? null,
        }
      : null;

    const phone =
      (shipping as { phone?: string } | null)?.phone ??
      (charge?.billing_details as { phone?: string } | null)?.phone ??
      null;

    const dispatch = dispatchMap.get(pi.id) ?? { dispatched: false, dispatched_at: null };

    return {
      id: pi.id,
      created: pi.created,
      email: charge?.billing_details?.email ?? null,
      name: charge?.billing_details?.name ?? null,
      phone,
      shippingAddress,
      amountTotal,
      currency: pi.currency,
      stripeFee,
      myFee,
      shippingCost,
      paymentStatus: pi.status,
      items: reservedItems.map((item) => ({
        name: item.title,
        quantity: item.qty,
        amount: item.price,
        currency: pi.currency,
        priceId: item.stripe_price_id ?? null,
        imageUrl: item.image ?? null,
      })),
      dispatched: dispatch.dispatched,
      dispatchedAt: dispatch.dispatched_at,
    };
  });
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDateTime(unix: number) {
  const d = new Date(unix * 1000);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export default async function OrdersPage() {
  const orders = await getOrders();

  const currency = orders[0]?.currency ?? 'gbp';
  const totalRevenue = orders.reduce((s, o) => s + o.amountTotal, 0);
  const totalMyFees = orders.reduce((s, o) => s + o.myFee, 0);
  const totalStripeFees = orders.reduce((s, o) => s + (o.stripeFee ?? 0), 0);
  const totalNet = totalRevenue - totalMyFees - totalStripeFees;

  const exportOrders: ExportOrder[] = orders.map((o) => ({
    id: o.id,
    created: o.created,
    name: o.name,
    email: o.email,
    phone: o.phone,
    shippingAddress: o.shippingAddress,
    items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, amount: i.amount, currency: i.currency })),
    amountTotal: o.amountTotal,
    currency: o.currency,
    stripeFee: o.stripeFee,
    myFee: o.myFee,
    dispatched: o.dispatched,
  }));

  return (
    <div className="bg-background text-foreground px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl tracking-tight">ORDERS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {orders.length} completed {orders.length === 1 ? 'order' : 'orders'}
            </p>
          </div>
          {orders.length > 0 && <ExportButton orders={exportOrders} />}
        </div>

        {/* Summary stats */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-sm font-medium mt-0.5">{formatMoney(totalRevenue, currency)}</p>
            </div>
            <div className="rounded-md border border-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">Platform fees (1%)</p>
              <p className="text-sm font-medium mt-0.5">{formatMoney(totalMyFees, currency)}</p>
            </div>
            <div className="rounded-md border border-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">Stripe fees</p>
              <p className="text-sm font-medium mt-0.5">{formatMoney(totalStripeFees, currency)}</p>
            </div>
            <div className="rounded-md border border-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">Net to artist</p>
              <p className="text-sm font-medium mt-0.5">{formatMoney(totalNet, currency)}</p>
            </div>
          </div>
        )}

        {/* Orders */}
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-md border border-muted bg-background px-5 py-4 space-y-4"
              >
                {/* Date/time + dispatch */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.created)}</p>
                  <DispatchButton
                    sessionId={order.id}
                    dispatched={order.dispatched}
                    dispatchedAt={order.dispatchedAt}
                  />
                </div>

                {/* Customer details */}
                <div className="space-y-0.5">
                  {order.name && <p className="text-sm font-medium">{order.name}</p>}
                  {order.email && <p className="text-sm text-muted-foreground">{order.email}</p>}
                  {order.phone && <p className="text-sm text-muted-foreground">{order.phone}</p>}
                  {order.shippingAddress && (
                    <p className="text-sm text-muted-foreground">
                      {[
                        order.shippingAddress.line1,
                        order.shippingAddress.line2,
                        order.shippingAddress.city,
                        order.shippingAddress.postalCode,
                        order.shippingAddress.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>

                {/* Items with thumbnails */}
                <div className="border-t border-muted pt-3 space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="rounded object-cover shrink-0 w-12 h-12"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted shrink-0" />
                      )}
                      <span className="text-muted-foreground flex-1">
                        {item.quantity > 1 ? `${item.quantity}× ` : ''}
                        {item.name}
                      </span>
                      <span className="shrink-0">{formatMoney(item.amount, item.currency)}</span>
                    </div>
                  ))}
                </div>

                {/* Financial breakdown */}
                <div className="border-t border-muted pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatMoney(order.amountTotal - (order.shippingCost ?? 0), order.currency)}</span>
                  </div>
                  {order.shippingCost !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{order.shippingCost === 0 ? 'Free' : formatMoney(order.shippingCost, order.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatMoney(order.amountTotal, order.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform fee (1%)</span>
                    <span>−{formatMoney(order.myFee, order.currency)}</span>
                  </div>
                  {order.stripeFee !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stripe fee</span>
                      <span>−{formatMoney(order.stripeFee, order.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-1 border-t border-muted">
                    <span>Net to artist</span>
                    <span>{formatMoney(order.amountTotal - order.myFee - (order.stripeFee ?? 0), order.currency)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-mono">pi: {order.id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
