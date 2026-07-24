import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReservationEmailType =
  | "confirmation"
  | "balance_payment"
  | "pre_arrival"
  | "payment_receipt"
  | "extension_link";

export type ReservationEmailRow = {
  id: string;
  reservation_id: string;
  email_type: ReservationEmailType;
  sent_to: string;
  subject: string | null;
  created_at: string;
};

export async function logReservationEmail(params: {
  reservationId: string;
  emailType: ReservationEmailType;
  sentTo: string;
  subject?: string;
  supabase?: SupabaseClient;
}): Promise<void> {
  const supabase = params.supabase ?? createAdminClient();
  const { error } = await supabase.from("reservation_emails").insert({
    reservation_id: params.reservationId,
    email_type: params.emailType,
    sent_to: params.sentTo,
    subject: params.subject ?? null,
  });

  if (error) {
    console.error("logReservationEmail failed:", error);
  }
}

export async function listReservationEmails(
  reservationId: string,
  supabase?: SupabaseClient
): Promise<ReservationEmailRow[]> {
  const client = supabase ?? createAdminClient();
  const { data, error } = await client
    .from("reservation_emails")
    .select("id, reservation_id, email_type, sent_to, subject, created_at")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReservationEmailRow[];
}
