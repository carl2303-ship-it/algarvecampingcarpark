import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  LOCALES,
} from "@/lib/constants";

/** Canonical path keys used across locales (PT uses /precos for prices). */
export type AppPathKey =
  | "home"
  | "about"
  | "prices"
  | "location"
  | "contact"
  | "book"
  | "bookSuccess"
  | "terms"
  | "privacy"
  | "stay";

const PATH_BY_KEY: Record<AppPathKey, string> = {
  home: "/",
  about: "/about",
  prices: "/prices",
  location: "/location",
  contact: "/contact",
  book: "/book",
  bookSuccess: "/book/success",
  terms: "/terms",
  privacy: "/privacy",
  stay: "/stay",
};

/** Build a localized href. PT has no prefix; prices uses /precos in PT. */
export function localePath(locale: Locale, path: string): string {
  const normalized = normalizeInternalPath(path);

  if (locale === DEFAULT_LOCALE) {
    if (normalized === "/prices") return "/precos";
    return normalized;
  }

  if (normalized === "/precos") {
    return `/${locale}/prices`;
  }

  if (normalized === "/") {
    return `/${locale}`;
  }

  return `/${locale}${normalized}`;
}

export function localePathKey(locale: Locale, key: AppPathKey): string {
  return localePath(locale, PATH_BY_KEY[key]);
}

export function getLocalePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

function normalizeInternalPath(path: string): string {
  if (!path || path === "/") return "/";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean.replace(/\/+$/, "") || "/";
}

/** Detect locale from a pathname like /fr/about or /precos. */
export function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && isLocale(segment) && segment !== DEFAULT_LOCALE) {
    return segment;
  }
  return DEFAULT_LOCALE;
}

/**
 * Strip locale prefix and map /precos → /prices for matching.
 * Returns a canonical path starting with /.
 */
export function stripLocaleFromPathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] && isLocale(parts[0]) && parts[0] !== DEFAULT_LOCALE) {
    parts.shift();
  }
  const path = "/" + parts.join("/");
  if (path === "/precos") return "/prices";
  return path === "/" ? "/" : path.replace(/\/+$/, "") || "/";
}

/** Switch current URL to another locale, preserving the page. */
export function switchLocalePath(pathname: string, nextLocale: Locale): string {
  const canonical = stripLocaleFromPathname(pathname);

  // /stay/[token] — keep token
  if (canonical.startsWith("/stay/")) {
    const token = canonical.slice("/stay/".length);
    return localePath(nextLocale, `/stay/${token}`);
  }

  return localePath(nextLocale, canonical);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "PT",
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
};

export { LOCALES };
