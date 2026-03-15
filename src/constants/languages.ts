export const LANG_OPTIONS = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" }
] as const;

export type LangCode = (typeof LANG_OPTIONS)[number]["code"];

