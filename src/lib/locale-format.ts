import { de, enUS, es, fr, pt } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import type { Locale } from "@/lib/constants";

export function dateFnsLocale(locale: Locale): DateFnsLocale {
  switch (locale) {
    case "en":
      return enUS;
    case "fr":
      return fr;
    case "de":
      return de;
    case "es":
      return es;
    default:
      return pt;
  }
}

export function bcp47Locale(locale: Locale): string {
  switch (locale) {
    case "en":
      return "en-GB";
    case "fr":
      return "fr-FR";
    case "de":
      return "de-DE";
    case "es":
      return "es-ES";
    default:
      return "pt-PT";
  }
}

/** @deprecated Legal pages now have full locale dictionaries; prefer passing Locale directly. */
export function legalContentLocale(locale: Locale): Locale {
  return locale;
}
