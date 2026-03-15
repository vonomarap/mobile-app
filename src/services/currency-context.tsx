import { PropsWithChildren, createContext, useContext, useMemo } from "react";

export type Currency = "RUB";

type CurrencyControls = {
  currency: Currency;
  setCurrency: (next: Currency) => void;
};

const CurrencyContext = createContext<CurrencyControls | null>(null);

export function CurrencyProvider({ children }: PropsWithChildren): JSX.Element {
  const controls = useMemo<CurrencyControls>(() => ({
    currency: "RUB",
    setCurrency: (_next: Currency) => undefined,
  }), []);

  return <CurrencyContext.Provider value={controls}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Currency {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx.currency;
}

export function useCurrencyControls(): CurrencyControls {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrencyControls must be used within CurrencyProvider");
  }
  return ctx;
}
