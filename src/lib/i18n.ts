import type { Locale } from "@/lib/constants";
import pt from "@/lib/i18n/pt";
import en from "@/lib/i18n/en";
import fr from "@/lib/i18n/fr";
import de from "@/lib/i18n/de";
import es from "@/lib/i18n/es";

const translations = {
  pt,
  en,
  fr,
  de,
  es,
} as const;

export type Translations = typeof pt;

export function getTranslations(locale: Locale): Translations {
  return (translations[locale] ?? translations.pt) as Translations;
}

export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split(".");
  let value: unknown = getTranslations(locale);
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  let str = typeof value === "string" ? value : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
