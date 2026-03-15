import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { QuoteOrderItemDraft } from "../navigation/types";
import { EMPTY_CART, loadCart, saveCart } from "./cart-store";

type CartContextValue = {
  ready: boolean;
  items: QuoteOrderItemDraft[];
  promoCode: string;
  itemsSubtotal: number;
  addItem: (item: QuoteOrderItemDraft) => void;
  removeItem: (localId: string) => void;
  clear: () => void;
  setPromoCode: (next: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren): JSX.Element {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<QuoteOrderItemDraft[]>([]);
  const [promoCode, setPromoCodeState] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    loadCart()
      .then((state) => {
        if (!mounted) return;
        setItems(state.items);
        setPromoCodeState(state.promoCode ?? "");
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
    void saveCart({
      items,
      promoCode: promoCode.trim() ? promoCode.trim() : null,
    });
  }, [items, promoCode, ready]);

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
    setPromoCodeState(EMPTY_CART.promoCode ?? "");
  }, []);

  const setPromoCode = useCallback((next: string) => {
    setPromoCodeState(next);
  }, []);

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.preview?.total) || 0), 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ready,
      items,
      promoCode,
      itemsSubtotal,
      addItem,
      removeItem,
      clear,
      setPromoCode,
    }),
    [addItem, clear, items, itemsSubtotal, promoCode, ready, removeItem, setPromoCode]
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
