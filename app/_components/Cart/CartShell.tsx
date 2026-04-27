import { CartProvider } from './CartContext';
import { CartDrawer } from './CartDrawer';
import { getShippingRatePence } from '@/app/_lib/shippingSettings';

export async function CartShell({ children }: { children: React.ReactNode }) {
  const shippingRate = await getShippingRatePence();
  return (
    <CartProvider shippingRate={shippingRate}>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
