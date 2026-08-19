import { createAdminClient } from "@/lib/supabase/admin";
import { findPitchOverlapConflict, getZoneRates } from "@/lib/availability";
import { calculateTotalPrice } from "@/lib/pricing";
import type { AccountingLine } from "@/lib/moloni-articles";
import { getPricingSupplements } from "@/lib/pricing-supplements";

export type ExtensionQuote = {
  available: boolean;
  conflict: {
    guest_name: string;
    check_in: string;
    check_out: string;
  } | null;
  oldCheckOut: string;
  newCheckOut: string;
  oldTotalCents: number;
  newTotalCents: number;
  extensionCents: number;
  nightsAdded: number;
  lines: AccountingLine[];
  error?: string;
};

type ReservationForExtend = {
  id: string;
  status: string;
  zone_id: string;
  check_in: string;
  check_out: string;
  total_cents: number;
  num_guests: number;
  pitch_code: string | null;
  electricity_amperage?: 6 | 10 | null;
  motorhome_over_9m?: boolean;
  manual_supplement_ids?: string[] | null;
};

function emptyQuote(
  reservation: ReservationForExtend,
  newCheckOut: string,
  error: string,
  conflict: ExtensionQuote["conflict"] = null
): ExtensionQuote {
  return {
    available: false,
    conflict,
    oldCheckOut: reservation.check_out,
    newCheckOut,
    oldTotalCents: reservation.total_cents,
    newTotalCents: reservation.total_cents,
    extensionCents: 0,
    nightsAdded: 0,
    lines: [],
    error,
  };
}

export async function quoteStayExtension(params: {
  reservation: ReservationForExtend;
  newCheckOut: string;
}): Promise<ExtensionQuote> {
  const { reservation, newCheckOut } = params;

  if (!["confirmed", "checked_in"].includes(reservation.status)) {
    return emptyQuote(reservation, newCheckOut, "Reserva não pode ser prolongada neste estado");
  }

  if (newCheckOut <= reservation.check_in) {
    return emptyQuote(reservation, newCheckOut, "Data de partida inválida");
  }

  if (newCheckOut <= reservation.check_out) {
    return emptyQuote(reservation, newCheckOut, "A nova data de partida deve ser posterior à atual");
  }

  if (reservation.pitch_code) {
    const conflict = await findPitchOverlapConflict({
      pitchCode: reservation.pitch_code,
      checkIn: reservation.check_in,
      checkOut: newCheckOut,
      excludeReservationId: reservation.id,
    });

    if (conflict) {
      return emptyQuote(
        reservation,
        newCheckOut,
        `O lugar ${reservation.pitch_code} não está disponível até ${newCheckOut}`,
        {
          guest_name: conflict.guest_name,
          check_in: conflict.check_in,
          check_out: conflict.check_out,
        }
      );
    }
  }

  const rates = await getZoneRates(reservation.zone_id);
  const supplements = await getPricingSupplements();
  const pricingOptions = {
    motorhomeOver9m: Boolean(reservation.motorhome_over_9m),
    electricityAmperage: reservation.electricity_amperage ?? null,
    manualSupplementIds: reservation.manual_supplement_ids ?? [],
    supplements,
  };
  const newPricing = calculateTotalPrice(
    rates,
    reservation.check_in,
    newCheckOut,
    reservation.num_guests,
    pricingOptions
  );
  const extraNightsPricing = calculateTotalPrice(
    rates,
    reservation.check_out,
    newCheckOut,
    reservation.num_guests,
    pricingOptions
  );
  const extensionCents = Math.max(0, newPricing.totalCents - reservation.total_cents);

  const oldOut = new Date(reservation.check_out + "T12:00:00");
  const newOut = new Date(newCheckOut + "T12:00:00");
  const nightsAdded = Math.max(
    0,
    Math.round((newOut.getTime() - oldOut.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    available: true,
    conflict: null,
    oldCheckOut: reservation.check_out,
    newCheckOut,
    oldTotalCents: reservation.total_cents,
    newTotalCents: newPricing.totalCents,
    extensionCents,
    nightsAdded,
    lines: extraNightsPricing.totalCents === extensionCents ? extraNightsPricing.lines : [],
  };
}

export async function getReservationForStay(reservationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, status, zone_id, check_in, check_out, total_cents, paid_cents, num_guests, pitch_code, vehicle_plate, electricity_amperage, motorhome_over_9m, manual_supplement_ids, guest_name, guest_email, payment_status, zone:zones(name)"
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
