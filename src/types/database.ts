export type ReservationStatus =
  | "pending_payment"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "expired";

export type PitchStatus = "available" | "occupied" | "maintenance";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface Zone {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  description: string | null;
  description_en: string | null;
  amenities: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ZoneRate {
  id: string;
  zone_id: string;
  start_date: string;
  end_date: string;
  price_cents_per_night: number;
  min_nights: number;
  season: "august" | "summer" | "low" | "winter";
  price_cents_3_4_guests: number;
  created_at: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  price_cents: number | null;
  price_label_pt: string | null;
  price_label_en: string | null;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryImageRecord {
  id: string;
  src: string;
  title_pt: string;
  title_en: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PitchMapSpotRecord {
  code: string;
  x: number;
  y: number;
  panoramic: boolean;
  electric: boolean;
  sort_order: number;
}

export interface Pitch {
  id: string;
  zone_id: string;
  code: string;
  status: PitchStatus;
  created_at: string;
}

export interface Reservation {
  id: string;
  zone_id: string;
  pitch_id: string | null;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  vehicle_plate: string | null;
  num_guests: number;
  notes: string | null;
  total_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  expires_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
  zone?: Zone;
  pitch?: Pitch | null;
}

export interface Payment {
  id: string;
  reservation_id: string;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
}

export interface BlockedDate {
  id: string;
  zone_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export interface ZoneAvailability {
  zone: Zone;
  available_spots: number;
  total_price_cents: number;
  nights: number;
  price_per_night_cents: number;
  min_nights: number;
}

export interface BookingFormData {
  zone_id: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  vehicle_plate?: string;
  num_guests: number;
  notes?: string;
}
