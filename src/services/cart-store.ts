import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type {
  MoskitkiScreenType,
  QuoteCalcOrderItemDraft,
  QuoteMoskitkiOrderItemDraft,
  QuoteOrderItemDraft,
  QuoteOrderItemPreview,
} from "../navigation/types";

const CART_STORAGE_KEY = "windowDoorStore.cart.v1";

export type CartState = {
  items: QuoteOrderItemDraft[];
};

const EMPTY_CART: CartState = {
  items: [],
};

function getWebStorage(): Storage | null {
  if (Platform.OS !== "web") return null;
  const win = (globalThis as any).window as { localStorage?: Storage } | undefined;
  return win?.localStorage ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sanitizePositiveInt(value: unknown): number | null {
  const num = Math.round(toNumber(value));
  return num > 0 ? num : null;
}

function sanitizeMoney(value: unknown): number | null {
  const num = Math.round(toNumber(value) * 100) / 100;
  return num > 0 ? num : null;
}

function sanitizePreview(value: unknown, fallbackTotal?: number): QuoteOrderItemPreview | null {
  const safeFallback = Number.isFinite(fallbackTotal) ? Math.max(0, Math.round((fallbackTotal ?? 0) * 100) / 100) : 0;

  if (!isRecord(value)) {
    if (!safeFallback) return null;
    return {
      subtotal: safeFallback,
      total: safeFallback,
      currency: "RUB",
    };
  }

  const currencyRaw = value.currency;
  const subtotalRaw = Math.max(0, toNumber(value.subtotal));
  const totalRaw = Math.max(0, toNumber(value.total));
  const subtotal = subtotalRaw || safeFallback;
  const total = totalRaw || subtotal || safeFallback;
  const currency = typeof currencyRaw === "string" && currencyRaw.trim() ? currencyRaw.trim().toUpperCase() : "RUB";

  return {
    subtotal,
    total,
    currency,
    calcDto: value.calcDto as QuoteOrderItemPreview["calcDto"],
  };
}

function sanitizeCartItem(value: unknown): QuoteOrderItemDraft | null {
  if (!isRecord(value)) return null;

  const localIdRaw = value.localId;
  const calcInputRaw = value.calcInput;
  const previewRaw = value.preview;

  if (typeof localIdRaw !== "string" || !localIdRaw.trim()) return null;

  if (value.kind === "moskitki" && isRecord(value.moskitki)) {
    const widthMm = sanitizePositiveInt(value.moskitki.widthMm);
    const heightMm = sanitizePositiveInt(value.moskitki.heightMm);
    const quantity = sanitizePositiveInt(value.moskitki.quantity);
    const pricePerItem = sanitizeMoney(value.moskitki.pricePerItem);

    if (!widthMm || !heightMm || !quantity || !pricePerItem) return null;

    const total = Math.round(pricePerItem * quantity * 100) / 100;
    const preview = sanitizePreview(previewRaw, total);
    if (!preview) return null;

    return {
      kind: "moskitki",
      localId: localIdRaw.trim(),
      moskitki: {
        widthMm,
        heightMm,
        quantity,
        pricePerItem,
        title: typeof value.moskitki.title === "string" && value.moskitki.title.trim() ? value.moskitki.title.trim() : undefined,
        screenType: (["standard", "anticat", "antimidges"] as const).includes(value.moskitki.screenType as MoskitkiScreenType)
          ? (value.moskitki.screenType as MoskitkiScreenType)
          : undefined,
      },
      preview: {
        ...preview,
        subtotal: total,
        total,
      },
    } satisfies QuoteMoskitkiOrderItemDraft;
  }

  if (!isRecord(calcInputRaw)) return null;
  const preview = sanitizePreview(previewRaw);
  if (!preview) return null;

  return {
    kind: value.kind === "calc" ? "calc" : undefined,
    localId: localIdRaw.trim(),
    calcInput: calcInputRaw as QuoteCalcOrderItemDraft["calcInput"],
    preview,
  } satisfies QuoteCalcOrderItemDraft;
}

function sanitizeCartState(value: unknown): CartState {
  if (!isRecord(value)) return EMPTY_CART;

  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const items = itemsRaw
    .map((item) => sanitizeCartItem(item))
    .filter((item): item is QuoteOrderItemDraft => Boolean(item))
    .slice(0, 20);

  const promoRaw = value.promoCode;
  const promoCode = typeof promoRaw === "string" ? promoRaw.trim() : "";

  return {
    items,
  };
}

async function getRawValue(key: string): Promise<string | null> {
  try {
    const webStorage = getWebStorage();
    if (webStorage) return webStorage.getItem(key);
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`Cart read failed (${key})`, error);
    return null;
  }
}

async function setRawValue(key: string, value: string): Promise<void> {
  try {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Cart write failed (${key})`, error);
  }
}

async function removeRawValue(key: string): Promise<void> {
  try {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`Cart remove failed (${key})`, error);
  }
}

export async function loadCart(): Promise<CartState> {
  const raw = await getRawValue(CART_STORAGE_KEY);
  if (!raw) return EMPTY_CART;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeCartState(parsed);
  } catch (error) {
    console.warn("Cart parse failed", error);
    return EMPTY_CART;
  }
}

export async function saveCart(state: CartState): Promise<void> {
  const safeState = sanitizeCartState(state);
  await setRawValue(CART_STORAGE_KEY, JSON.stringify(safeState));
}

export async function clearCartStorage(): Promise<void> {
  await removeRawValue(CART_STORAGE_KEY);
}

export { EMPTY_CART };
