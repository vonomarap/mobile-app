export function buildWhatsAppUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export function buildPhoneUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^(tel:|https?:\/\/)/i.test(raw)) return raw;
  const normalized = raw.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "";
}

export function buildMailtoUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^(mailto:|https?:\/\/)/i.test(raw)) return raw;
  return `mailto:${raw}`;
}

export function buildTelegramUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("@") ? `https://t.me/${raw.slice(1)}` : `https://t.me/${raw}`;
}

export function buildExternalUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function formatTelegramValue(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("@") ? raw : `@${raw}`;
}
