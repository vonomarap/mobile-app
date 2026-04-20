import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { CalcConfig, getDefaultCalcConfig } from "../utils/calc";

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function looksLikeLegacyCalcConfig(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const version = typeof value.version === "number" ? value.version : Number(value.version);
  if (version === 1) return true;
  if (isRecord(value.currencyRules)) return true;

  const baseRatesRaw = isRecord(value.baseRates) ? Object.values(value.baseRates) : [];
  const baseRates = baseRatesRaw
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isFinite(item));
  if (baseRates.length && Math.max(...baseRates) <= 500) return true;

  const optionKeys = isRecord(value.options) ? Object.keys(value.options).map((key) => key.trim().toLowerCase()) : [];
  return optionKeys.some((key) => key === "mosquito" || key === "warm_installation" || key === "lamination");
}

export async function fetchCalcConfig(): Promise<CalcConfig> {
  const configRef = doc(db, "calc_config", "global");
  const configDoc = await getDoc(configRef);

  if (!configDoc.exists()) {
    return getDefaultCalcConfig();
  }

  const raw = (configDoc.data() as CalcConfig) ?? {};
  if (!looksLikeLegacyCalcConfig(raw)) {
    return raw;
  }

  const migrated = getDefaultCalcConfig();
  if (isRecord(raw.uiCatalog)) {
    migrated.uiCatalog = raw.uiCatalog as CalcConfig["uiCatalog"];
  }
  return migrated;
}
