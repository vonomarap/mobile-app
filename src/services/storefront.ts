import { collection, doc, getCountFromServer, getDoc, getDocs, limit as fsLimit, orderBy, query, startAfter } from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export type Product = {
  id: string;
  title: string;
  description?: string;
  priceFrom?: number;
  currency?: string;
  image?: string;
  specs?: Record<string, string | number>;
  features?: string[];
  categoryId?: string;
  sortOrder?: number;
  active?: boolean;
};

export type ProductPageCursor = QueryDocumentSnapshot<DocumentData> | null;
export type ProductPage = {
  items: Product[];
  cursor: ProductPageCursor;
  hasMore: boolean;
};

export type GalleryItem = {
  id: string;
  title: string;
  imageUrl?: string;
  images?: string[];
  city?: string;
  projectType?: string;
  active?: boolean;
};

export type PromoBannerPlacement = "home" | "catalog" | "gallery";
export type PromoBannerKind = "regular" | "promo" | "winter";
export type PromoBanner = {
  id: string;
  title: string;
  subtitle?: string;
  kind?: PromoBannerKind;
  active?: boolean;
  priority?: number;
  placements?: PromoBannerPlacement[];
  imageUrl?: string;
  startsAt?: Timestamp;
  endsAt?: Timestamp;
};

export async function fetchProducts(): Promise<Product[]> {
  const productsQuery = query(collection(db, "products"), orderBy("title", "asc"));
  const snapshot = await getDocs(productsQuery);

  return snapshot.docs
    .map((docRef) => ({ id: docRef.id, ...(docRef.data() as Omit<Product, "id">) }))
    .filter((item) => item.active !== false);
}

export async function fetchProductsPage({
  pageSize,
  cursor,
}: {
  pageSize: number;
  cursor?: ProductPageCursor;
}): Promise<ProductPage> {
  const productsQuery = cursor
    ? query(collection(db, "products"), orderBy("sortOrder", "asc"), startAfter(cursor), fsLimit(pageSize))
    : query(collection(db, "products"), orderBy("sortOrder", "asc"), fsLimit(pageSize));
  const snapshot = await getDocs(productsQuery);

  const items = snapshot.docs
    .map((docRef) => ({ id: docRef.id, ...(docRef.data() as Omit<Product, "id">) }))
    .filter((item) => item.active !== false);

  const nextCursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
  const hasMore = snapshot.docs.length === pageSize;

  return { items, cursor: nextCursor, hasMore };
}

export async function fetchProductsCount(): Promise<number> {
  const snap = await getCountFromServer(collection(db, "products"));
  return snap.data().count;
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  const ref = doc(db, "products", productId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const item = { id: snap.id, ...(snap.data() as Omit<Product, "id">) } as Product;
  if (item.active === false) return null;

  return item;
}

export async function fetchGallery(): Promise<GalleryItem[]> {
  const galleryQuery = query(collection(db, "gallery"), orderBy("title", "asc"));
  const snapshot = await getDocs(galleryQuery);

  return snapshot.docs
    .map((docRef): GalleryItem => {
      const data = docRef.data() as Record<string, unknown>;

      const title = typeof data.title === "string" ? data.title : "";
      const city = typeof data.city === "string" ? data.city : undefined;
      const projectType = typeof data.projectType === "string" ? data.projectType : undefined;
      const active = data.active === false ? false : true;

      const rawImages = Array.isArray(data.images) ? data.images : [];
      const normalizedImages = rawImages
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value);

      const fallbackImageUrl = typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
      const images = normalizedImages.length ? normalizedImages : fallbackImageUrl ? [fallbackImageUrl] : [];
      const imageUrl = images[0] ?? undefined;

      return { id: docRef.id, title, city, projectType, active, images: images.length ? images : undefined, imageUrl };
    })
    .filter((item) => item.active !== false);
}

export async function fetchPromoBanners(): Promise<PromoBanner[]> {
  const snap = await getDoc(doc(db, "app_settings", "promos"));
  if (!snap.exists()) return [];

  const data = snap.data() as unknown as { banners?: unknown; bannersKindSchema?: unknown };
  const raw = Array.isArray(data?.banners) ? data.banners : [];
  const schemaVersion = (() => {
    const v = Number(data?.bannersKindSchema);
    return Number.isFinite(v) ? v : 0;
  })();

  const normalizeKind = (kind: unknown): PromoBannerKind => {
    const k = String(kind ?? "").trim().toLowerCase();
    if (k === "winter") return "winter";

    if (schemaVersion >= 2) {
      if (k === "promo") return "promo";
      if (k === "regular") return "regular";
      if (k === "hot") return "promo";
      return "regular";
    }

    // Legacy schema: "promo"/"hot"/missing were treated as ordinary.
    return "regular";
  };

  return raw
    .map((item): PromoBanner | null => {
      const record = item as Partial<PromoBanner> | null;
      if (!record || typeof record !== "object") return null;

      const id = String(record.id ?? "").trim();
      const title = String(record.title ?? "").trim();
      if (!id || !title) return null;

      const kind = normalizeKind(record.kind);

      const placements = Array.isArray(record.placements)
        ? (record.placements
            .map((value) => String(value).trim().toLowerCase())
            .filter((value): value is PromoBannerPlacement => value === "home" || value === "catalog" || value === "gallery"))
        : undefined;

      const priority = Number(record.priority);
      const normalizedPriority = Number.isFinite(priority) ? priority : undefined;

      const out: PromoBanner = { id, title };
      if (record.subtitle) out.subtitle = String(record.subtitle);
      if (kind) out.kind = kind;
      if (record.active !== undefined) out.active = Boolean(record.active);
      if (normalizedPriority !== undefined) out.priority = normalizedPriority;
      if (placements?.length) out.placements = placements;
      if (record.imageUrl) out.imageUrl = String(record.imageUrl);
      if (record.startsAt) out.startsAt = record.startsAt;
      if (record.endsAt) out.endsAt = record.endsAt;
      return out;
    })
    .filter((item): item is PromoBanner => item !== null);
}
