"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { releaseReservationPitch } from "@/lib/reservation-checkout";

export async function checkOutReservation(formData: FormData) {
  const reservationId = String(formData.get("reservationId") ?? "");
  const pitchId = formData.get("pitchId") ? String(formData.get("pitchId")) : null;
  const pitchCode = formData.get("pitchCode") ? String(formData.get("pitchCode")) : null;

  if (!reservationId) return;

  const supabase = createAdminClient();
  await supabase
    .from("reservations")
    .update({
      status: "checked_out",
      checked_out_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  await releaseReservationPitch({ pitch_id: pitchId, pitch_code: pitchCode });
}
