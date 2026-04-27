"use client";

import { useEffect } from "react";
import { useCart } from "@/app/_components/Cart/CartContext";
import { CHECKOUT_STORAGE_KEY } from "@/app/checkout/CheckoutClient";

export function ClearCart() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
  }, [clearCart]);

  return null;
}