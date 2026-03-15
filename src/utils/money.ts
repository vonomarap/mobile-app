export function formatMoney(amount: number, currency: string): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "").trim().toUpperCase();

  const locale = code === "RUB" ? "ru-RU" : code === "USD" ? "en-US" : undefined;
  const formatted = safeAmount.toLocaleString(locale, { maximumFractionDigits: 0 });

  if (!code) return formatted;
  if (code === "RUB") return `${formatted} ₽`;
  if (code === "USD") return `$${formatted}`;

  return `${formatted} ${code}`;
}
