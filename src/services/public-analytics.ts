import { Platform } from "react-native";
import { signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type PublicAnalyticsTopProduct = {
  productId: string;
  views: number;
  title?: string;
  image?: string;
};

export type PublicAnalyticsSummary = {
  siteVisitsTotal: number;
  productViewsTotal: number;
  topProducts: PublicAnalyticsTopProduct[];
};

const ANALYTICS_SESSION_STORAGE_KEY = "kanokna:analytics:session:v1";
const SITE_VISIT_WINDOW_MS = 30 * 60 * 1000;

let memorySessionId = "";
let siteVisitPromise: Promise<void> | null = null;
let analyticsUserPromise: Promise<string | null> | null = null;

function getWebStorage(): Storage | null {
  if (Platform.OS !== "web") return null;
  const win = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  return win ?? null;
}

function createSessionId(): string {
  const cryptoObj = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoObj?.randomUUID === "function") {
    return cryptoObj.randomUUID().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  }
  return `sess_${Math.random().toString(36).slice(2, 14)}${Date.now().toString(36)}`;
}

function getOrCreateAnalyticsSessionId(): string {
  if (memorySessionId) return memorySessionId;

  const storage = getWebStorage();
  if (storage) {
    try {
      const existing = storage.getItem(ANALYTICS_SESSION_STORAGE_KEY)?.trim() ?? "";
      if (existing) {
        memorySessionId = existing;
        return memorySessionId;
      }
    } catch {
      // Ignore storage access errors.
    }
  }

  memorySessionId = createSessionId();

  if (storage) {
    try {
      storage.setItem(ANALYTICS_SESSION_STORAGE_KEY, memorySessionId);
    } catch {
      // Ignore storage access errors.
    }
  }

  return memorySessionId;
}

async function ensureAnalyticsUser(): Promise<string | null> {
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  if (!analyticsUserPromise) {
    analyticsUserPromise = signInAnonymously(auth)
      .then((result) => result.user.uid)
      .catch((error) => {
        console.warn("ensureAnalyticsUser failed:", error);
        return null;
      })
      .finally(() => {
        analyticsUserPromise = null;
      });
  }

  return analyticsUserPromise;
}

function getAnalyticsContext(): { path?: string; userAgent?: string } {
  if (Platform.OS !== "web") return {};

  const locationObj = (globalThis as unknown as { location?: { pathname?: string; search?: string } }).location;
  const navigatorObj = (globalThis as unknown as { navigator?: { userAgent?: string } }).navigator;
  const pathname = typeof locationObj?.pathname === "string" ? locationObj.pathname : "";
  const search = typeof locationObj?.search === "string" ? locationObj.search : "";

  return {
    path: `${pathname}${search}`.slice(0, 240),
    userAgent: typeof navigatorObj?.userAgent === "string" ? navigatorObj.userAgent.slice(0, 240) : "",
  };
}

function toDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function trackSiteVisitOnce(): Promise<void> {
  if (Platform.OS !== "web") return;

  if (!siteVisitPromise) {
    siteVisitPromise = (async () => {
      const uid = await ensureAnalyticsUser();
      if (!uid) return;

      const sessionId = getOrCreateAnalyticsSessionId();
      const now = Date.now();
      const bucket = Math.floor(now / SITE_VISIT_WINDOW_MS);
      const dayKey = toDateKey(new Date(now));
      const sessionRef = doc(db, "site_visit_sessions", `${sessionId}_${bucket}`);
      const dailyRef = doc(db, "analytics_site_daily", dayKey);
      const { path, userAgent } = getAnalyticsContext();

      await runTransaction(db, async (transaction) => {
        const sessionSnap = await transaction.get(sessionRef);
        if (sessionSnap.exists()) return;

        const dailySnap = await transaction.get(dailyRef);
        const currentVisits =
          dailySnap.exists() &&
          typeof dailySnap.data()?.visits === "number" &&
          Number.isFinite(dailySnap.data()?.visits)
            ? Math.max(0, Math.round(dailySnap.data()?.visits as number))
            : 0;

        transaction.set(sessionRef, {
          uid,
          sessionId,
          bucket,
          dayKey,
          source: "web",
          platform: "web",
          path: path || null,
          userAgent: userAgent || null,
          createdAt: serverTimestamp(),
        });

        transaction.set(
          dailyRef,
          {
            dayKey,
            visits: currentVisits + 1,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
    })().catch((error) => {
      console.warn("trackSiteVisitOnce failed:", error);
    });
  }

  await siteVisitPromise;
}

export async function trackProductView(productId: string): Promise<void> {
  if (Platform.OS !== "web") return;
  const trimmedId = productId.trim();
  if (!trimmedId) return;

  const uid = await ensureAnalyticsUser();
  if (!uid) return;

  const now = new Date();
  const dayKey = toDateKey(now);
  const productRef = doc(db, "products", trimmedId);
  const totalsRef = doc(db, "product_view_totals", trimmedId);
  const dailyRef = doc(db, "analytics_product_daily", `${dayKey}_${trimmedId}`);

  try {
    await runTransaction(db, async (transaction) => {
      const [productSnap, totalsSnap, dailySnap] = await Promise.all([
        transaction.get(productRef),
        transaction.get(totalsRef),
        transaction.get(dailyRef),
      ]);

      if (!productSnap.exists()) return;

      const productData = productSnap.data() as Record<string, unknown>;
      const title = typeof productData.title === "string" ? productData.title.trim() : "";
      const image = typeof productData.image === "string" ? productData.image.trim() : "";

      const currentTotal =
        totalsSnap.exists() &&
        typeof totalsSnap.data()?.viewsTotal === "number" &&
        Number.isFinite(totalsSnap.data()?.viewsTotal)
          ? Math.max(0, Math.round(totalsSnap.data()?.viewsTotal as number))
          : 0;

      const currentDaily =
        dailySnap.exists() &&
        typeof dailySnap.data()?.views === "number" &&
        Number.isFinite(dailySnap.data()?.views)
          ? Math.max(0, Math.round(dailySnap.data()?.views as number))
          : 0;

      transaction.set(
        totalsRef,
        {
          productId: trimmedId,
          viewsTotal: currentTotal + 1,
          title: title || null,
          image: image || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(
        dailyRef,
        {
          dayKey,
          productId: trimmedId,
          views: currentDaily + 1,
          title: title || null,
          image: image || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch (error) {
    console.warn("trackProductView failed:", error);
  }
}

function normalizeTopProduct(raw: unknown): PublicAnalyticsTopProduct | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const productId = typeof item.productId === "string" ? item.productId.trim() : "";
  const views = typeof item.viewsTotal === "number" && Number.isFinite(item.viewsTotal)
    ? Math.max(0, Math.round(item.viewsTotal))
    : typeof item.views === "number" && Number.isFinite(item.views)
      ? Math.max(0, Math.round(item.views))
      : 0;
  if (!productId || !views) return null;
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const image = typeof item.image === "string" ? item.image.trim() : "";
  return {
    productId,
    views,
    ...(title ? { title } : {}),
    ...(image ? { image } : {}),
  };
}

export async function fetchPublicAnalyticsSummary(): Promise<PublicAnalyticsSummary> {
  const uid = await ensureAnalyticsUser();
  if (!uid) {
    return { siteVisitsTotal: 0, productViewsTotal: 0, topProducts: [] };
  }

  const [siteVisitsSnap, topProductsSnap, allProductsSnap] = await Promise.all([
    getCountFromServer(collection(db, "site_visit_sessions")),
    getDocs(query(collection(db, "product_view_totals"), orderBy("viewsTotal", "desc"), limit(3))),
    getDocs(query(collection(db, "product_view_totals"), orderBy("viewsTotal", "desc"))),
  ]);

  const topProducts = topProductsSnap.docs
    .map((docRef) => normalizeTopProduct({ productId: docRef.id, ...(docRef.data() as Record<string, unknown>) }))
    .filter((item): item is PublicAnalyticsTopProduct => Boolean(item));

  const productViewsTotal = allProductsSnap.docs.reduce((sum, docRef) => {
    const raw = docRef.data() as Record<string, unknown>;
    const value = typeof raw.viewsTotal === "number" && Number.isFinite(raw.viewsTotal) ? raw.viewsTotal : 0;
    return sum + Math.max(0, Math.round(value));
  }, 0);

  return {
    siteVisitsTotal: siteVisitsSnap.data().count,
    productViewsTotal,
    topProducts,
  };
}
