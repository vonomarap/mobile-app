import type { CalcInput, CalcResultDTO } from "../utils/calc";

export type QuoteOrderItemDraft = {
  localId: string;
  calcInput: CalcInput;
  preview: {
    subtotal: number;
    total: number;
    currency: string;
    calcDto?: CalcResultDTO;
  };
};

export type RootStackParamList = {
  Home: undefined;
  Catalog: undefined;
  Gallery: undefined;
  Calculator: { presetProductType?: "window" | "door" } | undefined;
  Cart: undefined;
  Contacts: undefined;
  SupportChat: undefined;
  QuoteRequest: { orderItems: QuoteOrderItemDraft[]; currency: string; promoCode?: string | null; previewTotal?: number };
  Account: undefined;
  Quotes: undefined;
  QuoteDetails: { quoteId: string };
  ProductDetails: { productId: string };
};

declare global {
  namespace ReactNavigation {
    // Make NavigationContainer / linking types aware of our route map on native and web.
    // https://reactnavigation.org/docs/typescript/#type-checking-the-navigator
    interface RootParamList extends RootStackParamList {}
  }
}
