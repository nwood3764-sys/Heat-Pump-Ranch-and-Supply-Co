"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { CartResponse, AddToCartPayload } from "@/lib/cart-types";

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
  // Track whether we've fetched the cart at least once
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  const refreshCart = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data: CartResponse = await res.json();
        setCart(data);
        hasFetched.current = true;
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    } finally {
      isFetching.current = false;
    }
  }, []);

  // Lazy fetch: only load cart when the drawer is opened or an action is taken.
  // This eliminates the network request on every page navigation.
  const ensureCartLoaded = useCallback(async () => {
    if (!hasFetched.current) {
      await refreshCart();
    }
  }, [refreshCart]);

  const handleSetCartOpen = useCallback(
    (open: boolean) => {
      if (open) {
        // Lazy-load cart data when drawer opens for the first time
        ensureCartLoaded();
      }
      setCartOpen(open);
    },
    [ensureCartLoaded],
  );

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
          hasFetched.current = true;
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
        setCartOpen: handleSetCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
