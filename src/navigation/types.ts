import type { CalcInput, CalcResultDTO } from "../utils/calc";

export type QuoteOrderItemPreview = {
  subtotal: number;
  total: number;
  currency: string;
  calcDto?: CalcResultDTO;
};

export type MoskitkiScreenType = "standard" | "anticat" | "antimidges";

export type QuoteMoskitkiDraftData = {
  widthMm: number;
  heightMm: number;
  quantity: number;
  pricePerItem: number;
  screenType?: MoskitkiScreenType;
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
  Home: undefined;
  Moskitki: undefined;
  Catalog: undefined;
  Gallery: undefined;
  Calculator: { presetProductType?: "window" | "door" | "balconyBlock" } | undefined;
  Cart: undefined;
  Contacts: undefined;
  SupportChat: undefined;
  QuoteRequest: { orderItems: QuoteOrderItemDraft[]; currency: string; previewTotal?: number; volumeDiscountAmount?: number };
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
