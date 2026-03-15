import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { LANG_OPTIONS, type LangCode } from "../constants/languages";
import { en } from "../locales/en";
import { ru } from "../locales/ru";
import { APP_LANGUAGE_KEY, getPreference, setPreference } from "./preferences-storage";

const resources = {
  en: { translation: en },
  ru: { translation: ru }
} as const;

// Fast Refresh can update screens without re-running i18n initialization.
// Keep resource bundles in sync so new keys don't show up as raw "home.xxx" strings.
function syncResourceBundles(): void {
  i18next.addResourceBundle("en", "translation", resources.en.translation, true, true);
  i18next.addResourceBundle("ru", "translation", resources.ru.translation, true, true);
}

const supportedLanguageSet = new Set<string>(LANG_OPTIONS.map((option) => option.code));

function normalizeLanguage(value: string | null | undefined): LangCode | null {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (supportedLanguageSet.has(normalized)) {
    return normalized as LangCode;
  }
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("en")) return "en";
  return null;
}

function syncDocumentLanguage(language: string | null | undefined): void {
  const normalized = normalizeLanguage(language);
  const doc = (globalThis as any).document as { documentElement?: { lang?: string } } | undefined;
  if (!normalized || !doc?.documentElement) return;
  doc.documentElement.lang = normalized;
}

let initPromise: Promise<void> = Promise.resolve();

if (!i18next.isInitialized) {
  initPromise = i18next
    .use(initReactI18next)
    .init({
      compatibilityJSON: "v4",
      resources,
      lng: "ru",
      fallbackLng: "ru",
      interpolation: {
        escapeValue: false
      }
    })
    .then(() => {
      syncDocumentLanguage(i18next.language);
    })
    .catch((error) => {
      console.warn("i18n initialization failed:", error);
    });
} else {
  syncResourceBundles();
  syncDocumentLanguage(i18next.language);
}

let languagePersistenceReady = false;
let pendingLanguageSelection: LangCode | null = null;

i18next.on("languageChanged", (language) => {
  syncDocumentLanguage(language);
  if (!languagePersistenceReady) return;
  const normalized = normalizeLanguage(language);
  if (!normalized) return;
  pendingLanguageSelection = normalized;
  void setPreference(APP_LANGUAGE_KEY, normalized);
});

export function getCurrentLanguage(): LangCode {
  return normalizeLanguage(i18next.language) ?? "ru";
}

export async function setAppLanguage(nextLanguage: LangCode): Promise<void> {
  await initPromise;

  const normalized = normalizeLanguage(nextLanguage);
  if (!normalized) return;

  pendingLanguageSelection = normalized;
  languagePersistenceReady = true;
  await setPreference(APP_LANGUAGE_KEY, normalized);

  if (normalizeLanguage(i18next.language) === normalized) {
    syncDocumentLanguage(normalized);
    return;
  }

  await i18next.changeLanguage(normalized);
}

export async function hydrateLanguagePreference(): Promise<void> {
  await initPromise;

  try {
    const storedLanguage = normalizeLanguage(await getPreference(APP_LANGUAGE_KEY));
    const savedLanguage = pendingLanguageSelection ?? storedLanguage;
    const currentLanguage = normalizeLanguage(i18next.language);

    if (savedLanguage && savedLanguage !== currentLanguage) {
      await i18next.changeLanguage(savedLanguage);
    } else {
      syncDocumentLanguage(savedLanguage ?? currentLanguage);
    }
  } catch (error) {
    console.warn("Language preference hydration failed:", error);
  } finally {
    languagePersistenceReady = true;
    const resolvedLanguage = pendingLanguageSelection ?? normalizeLanguage(i18next.language);
    pendingLanguageSelection = null;
    if (resolvedLanguage) {
      syncDocumentLanguage(resolvedLanguage);
      void setPreference(APP_LANGUAGE_KEY, resolvedLanguage);
    }
  }
}

export default i18next;
