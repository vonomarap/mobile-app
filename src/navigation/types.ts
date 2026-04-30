import type { CalcInput, CalcResultDTO } from "../utils/calc";

export const HELP_SECTION_KEYS = ["order", "measurement", "profiles", "installation", "repair", "contact"] as const;
export type HelpSectionKey = (typeof HELP_SECTION_KEYS)[number];

export type QuoteOrderItemPreview = {
  subtotal: number;
  total: number;
  currency: string;
  calcDto?: CalcResultDTO;
};

export type QuoteMoskitkiDraftData = {
  widthMm: number;
  heightMm: number;
  quantity: number;
  pricePerItem: number;
  title?: string;
};

export type QuoteCalcOrderItemDraft = {
  kind?: "calc";
  localId: string;
  calcInput: CalcInput;
  preview: QuoteOrderItemPreview;
};

export type QuoteMoskitkiOrderItemDraft = {
  kind: "moskitki";
  localId: string;
  moskitki: QuoteMoskitkiDraftData;
  preview: QuoteOrderItemPreview;
};

export type QuoteOrderItemDraft = QuoteCalcOrderItemDraft | QuoteMoskitkiOrderItemDraft;

export type RootStackParamList = {
  Faq: { section?: HelpSectionKey } | undefined;
  Moskitki: undefined;
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
