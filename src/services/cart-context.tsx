import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { QuoteOrderItemDraft } from "../navigation/types";
import { EMPTY_CART, loadCart, saveCart } from "./cart-store";
import { calculateVolumeDiscount, type VolumeDiscountResult } from "../utils/calc";

type CartContextValue = {
  ready: boolean;
  items: QuoteOrderItemDraft[];
  itemsSubtotal: number;
  volumeDiscount: VolumeDiscountResult;
  addItem: (item: QuoteOrderItemDraft) => void;
  removeItem: (localId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren): JSX.Element {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<QuoteOrderItemDraft[]>([]);

  useEffect(() => {
    let mounted = true;

    loadCart()
      .then((state) => {
        if (!mounted) return;
        setItems(state.items);
      })
      .catch((error) => {
        console.warn("Cart hydration failed", error);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveCart({ items });
  }, [items, ready]);

  const addItem = useCallback((item: QuoteOrderItemDraft) => {
    setItems((prev) => {
      if (prev.length >= 20) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  }, []);

  const clear = useCallback(() => {
    setItems(EMPTY_CART.items);
  }, []);

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.preview?.total) || 0), 0),
    [items]
  );

  const volumeDiscount = useMemo(
    () => calculateVolumeDiscount(items.length, itemsSubtotal),
    [items.length, itemsSubtotal]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ready,
      items,
      itemsSubtotal,
      volumeDiscount,
      addItem,
      removeItem,
      clear,
    }),
    [addItem, clear, items, itemsSubtotal, ready, removeItem, volumeDiscount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
