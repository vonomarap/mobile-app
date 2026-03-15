import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { QuoteOrderItemDraft } from "../navigation/types";

const CART_STORAGE_KEY = "windowDoorStore.cart.v1";

export type CartState = {
  items: QuoteOrderItemDraft[];
  promoCode: string | null;
};

const EMPTY_CART: CartState = {
  items: [],
  promoCode: null,
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

function sanitizeCartItem(value: unknown): QuoteOrderItemDraft | null {
  if (!isRecord(value)) return null;

  const localIdRaw = value.localId;
  const calcInputRaw = value.calcInput;
  const previewRaw = value.preview;

  if (typeof localIdRaw !== "string" || !localIdRaw.trim()) return null;
  if (!isRecord(calcInputRaw)) return null;
  if (!isRecord(previewRaw)) return null;

  const currencyRaw = previewRaw.currency;
  const subtotal = Math.max(0, toNumber(previewRaw.subtotal));
  const total = Math.max(0, toNumber(previewRaw.total));
  const currency = typeof currencyRaw === "string" && currencyRaw.trim() ? currencyRaw.trim().toUpperCase() : "RUB";

  return {
    localId: localIdRaw,
    calcInput: calcInputRaw as QuoteOrderItemDraft["calcInput"],
    preview: {
      subtotal,
      total,
      currency,
      calcDto: previewRaw.calcDto as QuoteOrderItemDraft["preview"]["calcDto"],
    },
  };
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
    promoCode: promoCode ? promoCode : null,
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
