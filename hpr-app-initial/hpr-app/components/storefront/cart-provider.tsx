"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { CartResponse, CartLineItem, AddToCartPayload } from "@/lib/cart-types";

interface CartContextValue {
  /** Current cart data */
  cart: CartResponse;
  /** Whether the cart is loading */
  isLoading: boolean;
  /** Add an item to the cart */
  addToCart: (payload: AddToCartPayload) => Promise<void>;
  /** Update a cart item quantity */
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  /** Remove an item from the cart */
  removeItem: (cartItemId: number) => Promise<void>;
  /** Refresh cart from server */
  refreshCart: () => Promise<void>;
  /** Whether the cart flyout is open */
  isCartOpen: boolean;
  /** Toggle the cart flyout */
  setCartOpen: (open: boolean) => void;
}

const emptyCart: CartResponse = {
  cartId: null,
  items: [],
  subtotal: 0,
  itemCount: 0,
};

const CartContext = createContext<CartContextValue>({
  cart: emptyCart,
  isLoading: false,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  refreshCart: async () => {},
  isCartOpen: false,
  setCartOpen: () => {},
});

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartResponse>(emptyCart);
  const [isLoading, setIsLoading] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data: CartResponse = await res.json();
        setCart(data);
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    }
  }, []);

  // Load cart on mount
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(
    async (payload: AddToCartPayload) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data: CartResponse = await res.json();
          setCart(data);
          setCartOpen(true);
        }
      } catch (err) {
        console.error("Failed to add to cart:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateQuantity = useCallback(
    async (cartItemId: number, quantity: number) => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItemId, quantity }),
        });
        if (res.ok) {
          const data: CartResponse = await res.json();
          setCart(data);
        }
      } catch (err) {
        console.error("Failed to update cart:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const removeItem = useCallback(
    async (cartItemId: number) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cart?cartItemId=${cartItemId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const data: CartResponse = await res.json();
          setCart(data);
        }
      } catch (err) {
        console.error("Failed to remove item:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        addToCart,
        updateQuantity,
        removeItem,
        refreshCart,
        isCartOpen,
        setCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
