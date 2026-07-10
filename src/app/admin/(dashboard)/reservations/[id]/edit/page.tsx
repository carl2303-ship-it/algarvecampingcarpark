import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  AdminReservationForm,
  type AdminReservationInitial,
} from "@/components/admin/admin-reservation-form";
import { buttonVariants } from "@/components/ui/button";
import { adminT } from "@/lib/admin-i18n";
import { getActiveZones } from "@/lib/availability";
import { getPitchMapSpotsAdmin } from "@/lib/pitch-map";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: reservation }, zones, spots, { data: payments }] = await Promise.all([
    supabase.from("reservations").select("*").eq("id", id).maybeSingle(),
    getActiveZones(),
    getPitchMapSpotsAdmin(),
    supabase
      .from("payments")
      .select("id, amount_cents, payment_method, notes, created_at")
      .eq("reservation_id", id)
      .eq("status", "succeeded")
      .order("created_at", { ascending: true }),
  ]);

  if (!reservation) {
    notFound();
  }

  if (["cancelled", "expired"].includes(reservation.status)) {
    notFound();
  }

  let guestCountry: string | null = null;
  if (reservation.guest_id) {
    const { data: guest } = await supabase
      .from("guests")
      .select("country")
      .eq("id", reservation.guest_id)
      .maybeSingle();
    guestCountry = guest?.country ?? null;
  }

  const initial: AdminReservationInitial = {
    id: reservation.id,
    pitch_code: reservation.pitch_code ?? null,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    guest_name: reservation.guest_name,
    guest_email: reservation.guest_email,
    guest_phone: reservation.guest_phone,
    guest_country: guestCountry,
    vehicle_plate: reservation.vehicle_plate,
    num_guests: reservation.num_guests,
    notes: reservation.notes,
    operational_notes: reservation.operational_notes ?? null,
    total_cents: reservation.total_cents,
    paid_cents: reservation.paid_cents,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/reservations"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {adminT.common.back}
        </Link>
        <h1 className="text-3xl font-bold">{adminT.reservations.editPageTitle}</h1>
      </div>
      <AdminReservationForm
        mode="edit"
        initialReservation={initial}
        initialPayments={payments ?? []}
        zones={zones}
        spots={spots}
        initialPitchCode={reservation.pitch_code ?? undefined}
      />
    </div>
  );
}
