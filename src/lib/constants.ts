export const SITE_NAME = "Elodie & Romy's Algarve Camping Car Park";
export const SITE_SHORT_NAME = "Algarve Camping Car Park";
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const CONTACT_EMAIL = "algarvecampingcarpark@gmail.com";
export const CONTACT_PHONE = "+351 961 376 584";
export const CONTACT_PHONE_RAW = "+351961376584";
export const CONTACT_PHONE_ALT = "+351 962 260 212";
export const CONTACT_PHONE_ALT_RAW = "+351962260212";
export const ADDRESS = "Sítio da Torre, Quintão, 8365-184 Armação de Pêra, Portugal";
export const GPS_DECIMAL = "N 37.11303, W 8.37508";
export const GPS_DMS = `N 37º06'47" W 8º,22'30"`;
export const MAPS_URL = "https://maps.app.goo.gl/h1kn8V2EnjmwkY58A";
export const FACEBOOK_URL = "https://www.facebook.com/algarvecampingcarpark/";
export const INSTAGRAM_URL = "https://www.instagram.com/algarve.camping.car.park/";
export const COMPLAINTS_BOOK_URL = "https://www.livroreclamacoes.pt/Pedido/Reclamacao";
export const GOOGLE_PLACE_ID = "ChIJQ6GsxRXRGg0RKpiETIlzp9I";
export const GOOGLE_REVIEWS_URL = `https://www.google.com/maps/place/?q=place_id:${GOOGLE_PLACE_ID}`;
export const MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3146.2!2d-8.3726844!3d37.112734!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd2a773894c84982a%3A0x0!2sAlgarve%20Camping%20Car%20Park!5e0!3m2!1spt-PT!2spt!4v1719763200000";
export const PRICING_SUMMER_IMAGE =
  "https://algarvecampingcarpark.pt/wp-content/uploads/2025/08/image.jpeg";
export const PRICING_WINTER_IMAGE =
  "https://algarvecampingcarpark.pt/wp-content/uploads/2025/08/prix-hiver-2025-2026.jpg";
export const PRICING_SERVICES_IMAGE =
  "https://algarvecampingcarpark.pt/wp-content/uploads/2020/11/WhatsApp-Image-2020-10-23-at-10.29.00-e1604514590898.jpeg";
export const HERO_IMAGE = "/images/hero.png";
export const EXPERIENCE_IMAGE = "/images/our-story.png";
export const TOTAL_CAPACITY = 63;
export const PARK_AREA_M2 = 37000;
export const CHECK_IN_TIME = "11:00";
export const CHECK_OUT_TIME = "11:00";

export type ParkSettings = {
  reception_open: string;
  reception_close: string;
  check_in_time: string;
  check_out_time: string;
  gate_access_code: string | null;
  online_booking_enabled: boolean;
  online_booking_starts_at: string | null;
  online_booking_ends_at: string | null;
};

export const DEFAULT_PARK_SETTINGS: ParkSettings = {
  reception_open: "09:00",
  reception_close: "18:00",
  check_in_time: CHECK_IN_TIME,
  check_out_time: CHECK_OUT_TIME,
  gate_access_code: null,
  online_booking_enabled: false,
  online_booking_starts_at: null,
  online_booking_ends_at: null,
};

export const DEFAULT_LOCALE = "pt" as const;
export const LOCALES = ["pt", "en", "fr", "de", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function formatTimeForLocale(time: string, _locale: Locale = "pt"): string {
  return time;
}

export function formatReceptionHours(
  settings: ParkSettings,
  _locale: Locale = "pt"
): string {
  return `${settings.reception_open} – ${settings.reception_close}`;
}

export const PENDING_PAYMENT_EXPIRY_MINUTES = 30;
/** Online deposit is 50% of the stay total; balance due on arrival. */
export const ONLINE_BOOKING_DEPOSIT_RATIO = 0.5;
