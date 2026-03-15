import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "./firebase";
import { fetchCalcConfig } from "./calc-config";
import { CalcInput, calculateQuote, type CalcResultDTO } from "../utils/calc";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Firestore rejects `undefined` (and also `NaN`/`Infinity`). We intentionally omit optional
// fields in calculator payloads, so we strip invalid values before writes.
function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return value;
  if (typeof value === "number" && !Number.isFinite(value)) {
    return undefined as T;
  }
  if (Array.isArray(value)) {
    const next = value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
    return next as T;
  }
  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(val);
      if (sanitized === undefined) continue;
      next[key] = sanitized;
    }
    return next as T;
  }
  return value;
}

export type QuoteItemInput = {
  calcInput: CalcInput;
};

export type CreateQuoteInput = {
  items: QuoteItemInput[];
  contact: {
    name: string;
    phone: string;
  };
  address?: string;
  preferredMeasurementDate?: string | null;
  currency?: string;
  promoCode?: string | null;
};

export type Quote = {
  id: string;
  status: string;
  totalPrice?: number;
  currency?: string;
  itemsCount?: number;
  createdAt?: { seconds: number };
};

export type QuoteItemDetails = {
  id?: string;
  calcInput?: CalcInput;
  calcResult?: {
    subtotal?: number;
    total?: number;
    currency?: string;
    factors?: unknown;
    calcDto?: CalcResultDTO;
  };
  positionTotal?: number;
};

export type QuoteDetails = Quote & {
  uid?: string;
  managerUid?: string | null;
  calcInput?: CalcInput;
  calcResult?: {
    subtotal?: number;
    discount?: number;
    total?: number;
    currency?: string;
    factors?: unknown;
    calcDto?: CalcResultDTO;
  };
  items?: QuoteItemDetails[];
  itemsSubtotal?: number;
  contact?: {
    name?: string;
    phone?: string;
  };
  address?: string;
  preferredMeasurementDate?: string | null;
  promoCode?: string | null;
  source?: string;
  updatedAt?: unknown;
  confirmedAt?: unknown;
};

type PromoDoc = {
  active?: boolean;
  type?: "percent" | "fixed";
  amount?: number;
  currencies?: Record<string, number>;
  usageLimit?: number;
  usedCount?: number;
  expiresAt?: unknown;
};

function toMillis(input: unknown): number | null {
  if (!input) return null;

  if (typeof input === "string") {
    const parsed = Date.parse(input);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof input === "object") {
    const value = input as { toMillis?: () => number; seconds?: number };
    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }
    if (typeof value.seconds === "number") {
      return value.seconds * 1000;
    }
  }

  return null;
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export async function createQuote(input: CreateQuoteInput): Promise<{ quoteId: string; total: number }> {
  let user = auth.currentUser;
  if (!user) {
    // Allow submitting a request without explicit registration via anonymous auth.
    // Requires Firebase Auth "Anonymous" provider to be enabled.
    try {
      const result = await signInAnonymously(auth);
      user = result.user;
    } catch {
      throw new Error("Authentication required");
    }
  }

  const currency = (input.currency || "RUB").trim().toUpperCase() || "RUB";
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) {
    throw new Error("Добавьте хотя бы одно изделие в заказ.");
  }
  if (items.length > 20) {
    throw new Error("Максимум 20 изделий в одном заказе.");
  }

  const config = await fetchCalcConfig();

  const calculatedItems = items.map((item, index) => {
    const calcInputRaw = item?.calcInput;
    if (!calcInputRaw || typeof calcInputRaw !== "object") {
      throw new Error(`Изделие ${index + 1}: некорректные параметры.`);
    }

    const calcInput = calcInputRaw as CalcInput;
    const calcDto = calculateQuote(calcInput, config, currency);
    if (calcDto.issues.errors.length) {
      throw new Error(calcDto.issues.errors[0]?.message || `Изделие ${index + 1}: ошибка расчета.`);
    }

    return {
      id: `item_${index + 1}`,
      calcInput,
      calcDto,
      subtotal: calcDto.pricing.subtotal,
      total: calcDto.pricing.total,
    };
  });

  const itemsSubtotal = round2(calculatedItems.reduce((sum, item) => sum + item.total, 0));
  const promoResult = input.promoCode?.trim()
    ? await applyPromoCode({ code: input.promoCode, total: itemsSubtotal, currency })
    : { discount: 0, finalTotal: itemsSubtotal };

  if (!Number.isFinite(promoResult.finalTotal)) {
    throw new Error("Ошибка расчета: некорректная сумма. Проверьте параметры.");
  }

  const contact = sanitizeForFirestore(input.contact);
  const firstItem = calculatedItems[0];
  const firstItemCalcInput = sanitizeForFirestore(firstItem.calcInput);
  const firstItemFactors = sanitizeForFirestore(firstItem.calcDto.pricing.factors);
  const firstItemCalcDto = sanitizeForFirestore(firstItem.calcDto);

  const quoteItems = calculatedItems.map((item) => {
    const itemCalcInput = sanitizeForFirestore(item.calcInput);
    const itemFactors = sanitizeForFirestore(item.calcDto.pricing.factors);
    const itemCalcDto = sanitizeForFirestore(item.calcDto);

    return {
      id: item.id,
      calcInput: itemCalcInput,
      calcResult: {
        subtotal: item.subtotal,
        total: item.total,
        currency,
        factors: itemFactors,
        calcDto: itemCalcDto,
      },
      positionTotal: item.total,
    };
  });

  const quoteRef = await addDoc(collection(db, "quotes"), {
    uid: user.uid,
    status: "NEW",
    managerUid: null,
    totalPrice: promoResult.finalTotal,
    currency,
    items: quoteItems,
    itemsCount: quoteItems.length,
    itemsSubtotal,
    // Legacy fields for compatibility with existing admin/analytics/detail screens.
    calcInput: firstItemCalcInput,
    calcResult: {
      subtotal: itemsSubtotal,
      discount: promoResult.discount,
      total: promoResult.finalTotal,
      currency,
      factors: quoteItems.length === 1 ? firstItemFactors : undefined,
      calcDto: quoteItems.length === 1 ? firstItemCalcDto : undefined,
    },
    contact,
    address: input.address ?? "",
    preferredMeasurementDate: input.preferredMeasurementDate ?? null,
    promoCode: input.promoCode?.trim().toUpperCase() ?? null,
    source: "mobile_app",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    confirmedAt: null
  });

  await addDoc(collection(db, `quotes/${quoteRef.id}/messages`), {
    authorUid: user.uid,
    authorRole: "user",
    text: "Новая заявка создана через калькулятор.",
    attachments: [],
    createdAt: serverTimestamp()
  });

  if (input.promoCode?.trim()) {
    await addDoc(collection(db, "promo_usages"), {
      uid: user.uid,
      promoCode: input.promoCode.trim().toUpperCase(),
      quoteId: quoteRef.id,
      discount: promoResult.discount,
      currency,
      usedAt: serverTimestamp()
    });
  }

  return {
    quoteId: quoteRef.id,
    total: promoResult.finalTotal
  };
}

export async function applyPromoCode(input: {
  code: string;
  total: number;
  currency: string;
}): Promise<{ discount: number; finalTotal: number }> {
  const code = input.code.trim().toUpperCase();
  const total = Number(input.total) || 0;
  const currency = input.currency.trim().toUpperCase() || "RUB";

  if (!code) {
    throw new Error("Promo code is required");
  }
  if (total <= 0) {
    throw new Error("Total must be greater than zero");
  }

  const promoRef = doc(db, "promocodes", code);
  const promoSnap = await getDoc(promoRef);
  if (!promoSnap.exists()) {
    throw new Error("Promo code not found");
  }

  const promo = (promoSnap.data() as PromoDoc) ?? {};
  if (!promo.active) {
    throw new Error("Promo code is inactive");
  }

  const expiresAt = toMillis(promo.expiresAt);
  if (expiresAt && expiresAt < Date.now()) {
    throw new Error("Promo code is expired");
  }

  if (
    typeof promo.usageLimit === "number" &&
    typeof promo.usedCount === "number" &&
    promo.usedCount >= promo.usageLimit
  ) {
    throw new Error("Promo code limit reached");
  }

  const amount = Number(promo.amount) || 0;
  if (amount <= 0) {
    return { discount: 0, finalTotal: total };
  }

  const discountRaw = promo.type === "fixed"
    ? (promo.currencies?.[currency] ?? amount)
    : (total * (amount / 100));

  const discount = Math.max(0, Math.round(discountRaw * 100) / 100);
  const finalTotal = Math.max(0, Math.round((total - discount) * 100) / 100);
  return { discount, finalTotal };
}

export async function fetchQuotes(uid: string): Promise<Quote[]> {
  const quotesQuery = query(collection(db, "quotes"), where("uid", "==", uid));
  const snapshot = await getDocs(quotesQuery);

  const items = snapshot.docs.map((docRef) => ({ id: docRef.id, ...(docRef.data() as Omit<Quote, "id">) }));
  items.sort((a, b) => {
    const bTs = toMillis(b.createdAt) ?? 0;
    const aTs = toMillis(a.createdAt) ?? 0;
    return bTs - aTs;
  });
  return items;
}

export async function fetchQuoteById(quoteId: string): Promise<QuoteDetails | null> {
  const ref = doc(db, "quotes", quoteId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<QuoteDetails, "id">) };
}
