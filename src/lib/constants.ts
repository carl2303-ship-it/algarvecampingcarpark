export const SITE_NAME = "Elodie & Romy's Algarve Camping Car Park";
export const SITE_SHORT_NAME = "Algarve Camping Car Park";
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const CONTACT_EMAIL = "algarvecampingcarpark@gmail.com";
export const CONTACT_PHONE = "+351 961 376 584";
export const CONTACT_PHONE_RAW = "+351961376584";
export const ADDRESS = "Sítio da Torre, Quintão, 8365-184 Armação de Pêra, Portugal";
export const MAPS_URL = "https://maps.app.goo.gl/h1kn8V2EnjmwkY58A";
export const MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3146.2!2d-8.3726844!3d37.112734!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd2a773894c84982a%3A0x0!2sAlgarve%20Camping%20Car%20Park!5e0!3m2!1spt-PT!2spt!4v1719763200000";
export const PRICING_SUMMER_IMAGE =
  "https://algarvecampingcarpark.pt/wp-content/uploads/2025/08/image.jpeg";
export const PRICING_WINTER_IMAGE =
  "https://algarvecampingcarpark.pt/wp-content/uploads/2025/08/prix-hiver-2025-2026.jpg";
export const PRICING_SERVICES_IMAGE =
  "https://algarvecampingcarpark.pt/wp-content/uploads/2020/11/WhatsApp-Image-2020-10-23-at-10.29.00-e1604514590898.jpeg";
export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=2400&q=80";
export const EXPERIENCE_IMAGE =
  "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=1200&q=80";
export const TOTAL_CAPACITY = 57;
export const PARK_AREA_M2 = 37000;
export const CHECK_IN_TIME = "14:00";
export const CHECK_OUT_TIME = "12:00";
export const PENDING_PAYMENT_EXPIRY_MINUTES = 30;
export const DEFAULT_LOCALE = "pt" as const;
export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
