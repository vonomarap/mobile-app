import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export type SiteSettings = {
  brandName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  telegram?: string;
  maxUrl?: string;
  copyrightText?: string;

  // Home: "Official partner" block (web)
  partnerEnabled?: boolean;
  partnerKicker?: string;
  partnerFactoryName?: string;
  partnerDescription?: string;
  partnerLogoUrl?: string;
  partnerBullets?: string[];
};

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const trimmed = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return trimmed.length ? trimmed : undefined;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const snap = await getDoc(doc(db, "app_settings", "site"));
  if (!snap.exists()) return {};

  const data = snap.data() as Record<string, unknown>;

  return {
    brandName: asTrimmedString(data.brandName),
    tagline: asTrimmedString(data.tagline),
    phone: asTrimmedString(data.phone),
    email: asTrimmedString(data.email),
    whatsapp: asTrimmedString(data.whatsapp),
    telegram: asTrimmedString(data.telegram),
    maxUrl: asTrimmedString(data.maxUrl),
    copyrightText: asTrimmedString(data.copyrightText),

    partnerEnabled: asBoolean(data.partnerEnabled),
    partnerKicker: asTrimmedString(data.partnerKicker),
    partnerFactoryName: asTrimmedString(data.partnerFactoryName),
    partnerDescription: asTrimmedString(data.partnerDescription),
    partnerLogoUrl: asTrimmedString(data.partnerLogoUrl),
    partnerBullets: asStringArray(data.partnerBullets)
  };
}
