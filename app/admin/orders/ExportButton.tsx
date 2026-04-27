'use client';

interface ExportItem {
  name: string;
  quantity: number;
  amount: number;
  currency: string;
}

export interface ExportOrder {
  id: string;
  created: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  shippingAddress: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  items: ExportItem[];
  amountTotal: number;
  currency: string;
  stripeFee: number | null;
  myFee: number;
  dispatched: boolean;
}

export function ExportButton({ orders }: { orders: ExportOrder[] }) {
  function handleExport() {
    const fmt = (amount: number, currency: string) =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100);

    const fmtDate = (unix: number) =>
      new Date(unix * 1000).toLocaleDateString('en-GB');

    const fmtTime = (unix: number) =>
      new Date(unix * 1000).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

    const headers = [
      'Order ID', 'Date', 'Time', 'Name', 'Email', 'Phone',
      'Address', 'Items', 'Total', 'Stripe Fee', 'Platform Fee',
      'Net', 'Dispatched',
    ];

    const rows = orders.map((o) => {
      const address = o.shippingAddress
        ? [
            o.shippingAddress.line1,
            o.shippingAddress.line2,
            o.shippingAddress.city,
            o.shippingAddress.postalCode,
            o.shippingAddress.country,
          ]
            .filter(Boolean)
            .join(', ')
        : '';

      const items = o.items
        .map((i) => (i.quantity > 1 ? `${i.name} x${i.quantity}` : i.name))
        .join('; ');

      const netToClient =
        o.stripeFee !== null ? o.amountTotal - o.stripeFee - o.myFee : null;

      return [
        o.id,
        fmtDate(o.created),
        fmtTime(o.created),
        o.name ?? '',
        o.email ?? '',
        o.phone ?? '',
        address,
        items,
        fmt(o.amountTotal, o.currency),
        o.stripeFee !== null ? fmt(o.stripeFee, o.currency) : '',
        fmt(o.myFee, o.currency),
        netToClient !== null ? fmt(netToClient, o.currency) : '',
        o.dispatched ? 'Yes' : 'No',
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="text-sm px-4 py-2 rounded border border-muted hover:border-foreground transition-colors shrink-0"
    >
      Export CSV
    </button>
  );
}
