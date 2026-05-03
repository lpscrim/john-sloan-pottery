'use client';

import { createContext, useContext, useCallback, useSyncExternalStore, useRef, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────
export interface CustomMugDetails {
  sizeId: string;
  sizeName: string;
  glaze1Slug: string;
  glaze2Slug: string;
  glaze1Name: string;
  glaze2Name: string;
  shapeSlug: string;
  shapeName: string;
}

export interface CartItem {
  /** Stripe Price ID — or 'custom-mug-{uuid}' for bespoke mug orders */
  priceId: string;
  /** Product name */
  name: string;
  /** Thumbnail URL */
  imageUrl: string;
  /** Unit price in pence */
  priceHw: number;
  /** Items in cart */
  quantity: number;
  /** Available stock (cap for quantity). Custom mugs use 1 — add again for multiples. */
  stockLevel: number;
  /** Present only for custom mug orders */
  customMug?: CustomMugDetails;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  shippingRate: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (priceId: string) => void;
  updateQuantity: (priceId: string, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

// ─── Storage key ─────────────────────────────────────────────────
const STORAGE_KEY = 'shop-cart';

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ─── Context ─────────────────────────────────────────────────────
const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────
export function CartProvider({ children, shippingRate = 0 }: { children: React.ReactNode; shippingRate?: number }) {
  // Use an external store so we always stay in sync with localStorage
  const listeners = useRef(new Set<() => void>());
  const subscribe = useCallback((cb: () => void) => {
    listeners.current.add(cb);
    return () => { listeners.current.delete(cb); };
  }, []);
  const getSnapshot = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) ?? '[]';
  }, []);
  const getServerSnapshot = useCallback(() => '[]', []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items: CartItem[] = (() => { try { return JSON.parse(raw); } catch { return []; } })();

  const emit = useCallback(() => {
    listeners.current.forEach((l) => l());
  }, []);

  // ─── Drawer state (not persisted) ──────────────────────────────
  // We manage open/close via a simple external-store boolean so the
  // whole tree re-renders when the drawer opens/closes.
  const drawerListeners = useRef(new Set<() => void>());
  const drawerOpen = useRef(false);
  const subscribeDraw = useCallback((cb: () => void) => {
    drawerListeners.current.add(cb);
    return () => { drawerListeners.current.delete(cb); };
  }, []);
  const getDrawerSnap = useCallback(() => drawerOpen.current, []);
  const getDrawerServer = useCallback(() => false, []);
  const isOpen = useSyncExternalStore(subscribeDraw, getDrawerSnap, getDrawerServer);
  const emitDrawer = useCallback(() => {
    drawerListeners.current.forEach((l) => l());
  }, []);

  const openCart = useCallback(() => { drawerOpen.current = true; emitDrawer(); }, [emitDrawer]);
  const closeCart = useCallback(() => { drawerOpen.current = false; emitDrawer(); }, [emitDrawer]);
  const toggleCart = useCallback(() => { drawerOpen.current = !drawerOpen.current; emitDrawer(); }, [emitDrawer]);

  // ─── Cart mutations ────────────────────────────────────────────
  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    const current = readCart();
    const idx = current.findIndex((c) => c.priceId === item.priceId);
    if (idx >= 0) {
      // Don't exceed stock
      if (current[idx].quantity >= item.stockLevel) {
        drawerOpen.current = true;
        emitDrawer();
        return;
      }
      current[idx].quantity += 1;
      current[idx].stockLevel = item.stockLevel; // keep in sync
    } else {
      current.push({ ...item, quantity: 1 });
    }
    writeCart(current);
    emit();
    // Auto-open drawer when adding
    drawerOpen.current = true;
    emitDrawer();
  }, [emit, emitDrawer]);

  const removeItem = useCallback((priceId: string) => {
    const current = readCart().filter((c) => c.priceId !== priceId);
    writeCart(current);
    emit();
  }, [emit]);

  const updateQuantity = useCallback((priceId: string, quantity: number) => {
    const current = readCart();
    const idx = current.findIndex((c) => c.priceId === priceId);
    if (idx >= 0) {
      if (quantity <= 0) {
        current.splice(idx, 1);
      } else {
        // Don't exceed stock
        current[idx].quantity = Math.min(quantity, current[idx].stockLevel);
      }
    }
    writeCart(current);
    emit();
  }, [emit]);

  const clearCart = useCallback(() => {
    writeCart([]);
    emit();
  }, [emit]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  // ─── Periodic stock sync ───────────────────────────────────────
  // Every 30 s, check live stock for items in cart.  Caps quantities
  // and removes items that have hit zero.
  useEffect(() => {
    if (items.length === 0) return;

    const controller = new AbortController();

    async function syncStock() {
      const cart = readCart();
      if (cart.length === 0) return;

      const ids = cart.map((i) => i.priceId).join(',');
      try {
        const res = await fetch(`/api/stock?ids=${encodeURIComponent(ids)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const { stock } = (await res.json()) as { stock: Record<string, number> };

        let changed = false;
        let updated = cart.map((item) => {
          const live = stock[item.priceId];
          if (live === undefined) return item;
          if (live !== item.stockLevel) {
            changed = true;
            return { ...item, stockLevel: live, quantity: Math.min(item.quantity, live) };
          }
          return item;
        });

        // Remove items with 0 stock
        const before = updated.length;
        updated = updated.filter((i) => i.stockLevel > 0);
        if (updated.length !== before) changed = true;

        if (changed) {
          writeCart(updated);
          emit();
        }
      } catch {
        // Network error — ignore, will retry next interval
      }
    }

    // Run immediately, then every 30 seconds
    syncStock();
    const id = setInterval(syncStock, 30_000);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  // Re-run when the number of distinct items changes
  }, [items.length, emit]);

  return (
    <CartContext.Provider value={{
      items, count, shippingRate, addItem, removeItem, updateQuantity, clearCart,
      isOpen, openCart, closeCart, toggleCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}
