"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseReservationPitch } from "@/lib/reservation-checkout";

export async function checkOutReservation(formData: FormData) {
  const reservationId = String(formData.get("reservationId") ?? "");
  const redirectTo = formData.get("redirectTo")
    ? String(formData.get("redirectTo"))
    : null;

  if (!reservationId) return;

  const supabase = createAdminClient();
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, pitch_id, pitch_code, status")
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation || !["confirmed", "checked_in"].includes(reservation.status)) {
    return;
  }

  const pitchId = formData.get("pitchId")
    ? String(formData.get("pitchId"))
    : reservation.pitch_id;
  const pitchCode = formData.get("pitchCode")
    ? String(formData.get("pitchCode"))
    : reservation.pitch_code;

  await supabase
    .from("reservations")
    .update({
      status: "checked_out",
      checked_out_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .in("status", ["confirmed", "checked_in"]);

  await releaseReservationPitch({ pitch_id: pitchId, pitch_code: pitchCode });

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/completed");
  revalidatePath("/admin/park-status");
  revalidatePath(`/admin/reservations/${reservationId}/edit`);

  if (redirectTo) {
    redirect(redirectTo);
  }
}
