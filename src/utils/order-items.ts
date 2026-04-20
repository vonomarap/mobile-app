import type { QuoteOrderItemDraft, QuoteMoskitkiOrderItemDraft } from "../navigation/types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function isMoskitkiOrderItem(
  item: QuoteOrderItemDraft | null | undefined
): item is QuoteMoskitkiOrderItemDraft {
  return Boolean(item && item.kind === "moskitki" && item.moskitki);
}

export function formatOrderItemLabel(item: QuoteOrderItemDraft, t: Translate): string {
  if (isMoskitkiOrderItem(item)) {
    const title = item.moskitki.title?.trim() || t("moskitki.cart.itemTitle");
    const widthMm = Number.isFinite(item.moskitki.widthMm) ? Math.max(0, Math.round(item.moskitki.widthMm)) : 0;
    const heightMm = Number.isFinite(item.moskitki.heightMm) ? Math.max(0, Math.round(item.moskitki.heightMm)) : 0;
    const quantity = Number.isFinite(item.moskitki.quantity) ? Math.max(1, Math.round(item.moskitki.quantity)) : 1;
    const sizeLabel = widthMm > 0 && heightMm > 0 ? `${widthMm}x${heightMm} мм` : "-";
    return `${title} · ${sizeLabel} · x${quantity}`;
  }

  const input = item.calcInput;
  const kind = input.productType === "door" ? t("calculator.types.door") : t("calculator.types.window");
  const widthCm = typeof input.width === "number" && Number.isFinite(input.width) ? Math.round(input.width * 100) : null;
  const heightCm = typeof input.height === "number" && Number.isFinite(input.height) ? Math.round(input.height * 100) : null;
  const quantity = typeof input.quantity === "number" && Number.isFinite(input.quantity) ? Math.max(1, Math.round(input.quantity)) : 1;
  const sizeLabel = widthCm && heightCm ? `${widthCm}x${heightCm} cm` : "-";
  return `${kind} · ${sizeLabel} · x${quantity}`;
}
