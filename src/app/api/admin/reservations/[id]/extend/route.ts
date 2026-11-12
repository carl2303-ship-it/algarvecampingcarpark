import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { quoteStayExtension } from "@/lib/stay-extension";
import { createExtensionCheckoutSession } from "@/lib/stripe";
import { sendExtensionPaymentLink } from "@/lib/email";

export const dynamic = "force-dynamic";

const pricingOverridesSchema = z.object({
  num_guests: z.coerce.number().int().min(1).max(10).optional(),
  electricity_amperage: z
    .union([
      z.literal(6),
      z.literal(10),
      z.null(),
      z.literal("6").transform(() => 6 as const),
      z.literal("10").transform(() => 10 as const),
      z.literal("").transform(() => null),
    ])
    .optional(),
  motorhome_over_9m: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true" || value === "1";
    }),
  manual_supplement_ids: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (Array.isArray(value)) return value.filter(Boolean);
      return value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }),
});

const extendSchema = z
  .object({
    check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    send_payment_link: z.boolean().default(true),
    /** Optional: force Stripe amount (cents). Defaults to the calculated quote. */
    amount_cents: z.number().int().min(0).optional(),
  })
  .merge(pricingOverridesSchema);

function reservationForQuote(
  reservation: {
    id: string;
    status: string;
    zone_id: string;
    check_in: string;
    check_out: string;
    total_cents: number;
    num_guests: number;
    pitch_code: string | null;
    electricity_amperage?: number | null;
    motorhome_over_9m?: boolean | null;
    manual_supplement_ids?: string[] | null;
  },
  overrides: z.infer<typeof pricingOverridesSchema>
) {
  return {
    id: reservation.id,
    status: reservation.status,
    zone_id: reservation.zone_id,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    total_cents: reservation.total_cents,
    num_guests: overrides.num_guests ?? reservation.num_guests,
    pitch_code: reservation.pitch_code,
    electricity_amperage:
      overrides.electricity_amperage !== undefined
        ? overrides.electricity_amperage
        : reservation.electricity_amperage === 6 || reservation.electricity_amperage === 10
          ? reservation.electricity_amperage
          : null,
    motorhome_over_9m:
      overrides.motorhome_over_9m !== undefined
        ? Boolean(overrides.motorhome_over_9m)
        : Boolean(reservation.motorhome_over_9m),
    manual_supplement_ids:
      overrides.manual_supplement_ids !== undefined
        ? overrides.manual_supplement_ids
        : (reservation.manual_supplement_ids ?? []),
  };
}

async function loadReservation(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, zone:zones(name)")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
}

/** Same quote the PATCH/Stripe path uses — preview must match the payment link. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = z
    .object({
      check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .merge(pricingOverridesSchema)
    .safeParse({
      check_out: searchParams.get("check_out"),
      num_guests: searchParams.get("num_guests") ?? undefined,
      electricity_amperage: searchParams.get("electricity_amperage") ?? undefined,
      motorhome_over_9m: searchParams.get("over_9m") ?? undefined,
      manual_supplement_ids: searchParams.get("manual_supplement_ids") ?? undefined,
    });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const reservation = await loadReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  }

  try {
    const quote = await quoteStayExtension({
      reservation: reservationForQuote(reservation, parsed.data),
      newCheckOut: parsed.data.check_out,
    });

    if (!quote.available) {
      return NextResponse.json(
        {
          error: quote.error ?? "Não é possível prolongar",
          conflict: quote.conflict,
          available: false,
        },
        { status: quote.conflict ? 409 : 400 }
      );
    }

    return NextResponse.json({
      available: true,
      extension_cents: quote.extensionCents,
      new_total_cents: quote.newTotalCents,
      old_total_cents: quote.oldTotalCents,
      nights_added: quote.nightsAdded,
      old_check_out: quote.oldCheckOut,
      new_check_out: quote.newCheckOut,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular extensão";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = extendSchema.parse(await request.json());
    const supabase = createAdminClient();
    const reservation = await loadReservation(id);

    if (!reservation) {
      return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    }

    const quoteInput = reservationForQuote(reservation, body);
    const quote = await quoteStayExtension({
      reservation: quoteInput,
      newCheckOut: body.check_out,
    });

    if (!quote.available) {
      const status = quote.conflict ? 409 : 400;
      return NextResponse.json(
        {
          error: quote.error ?? "Não é possível prolongar",
          conflict: quote.conflict,
        },
        { status }
      );
    }

    // Admin may force the amount shown to the guest (reception quote).
    const extensionCents =
      typeof body.amount_cents === "number" ? body.amount_cents : quote.extensionCents;
    const newTotalCents = reservation.total_cents + extensionCents;
    const oldCheckOut = reservation.check_out;
    const useCalculatedLines =
      extensionCents === quote.extensionCents ? quote.lines : [];

    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        check_out: body.check_out,
        total_cents: newTotalCents,
        num_guests: quoteInput.num_guests,
        electricity_amperage: quoteInput.electricity_amperage,
        motorhome_over_9m: quoteInput.motorhome_over_9m,
        manual_supplement_ids: quoteInput.manual_supplement_ids,
        payment_status: extensionCents > 0 ? "partial" : reservation.payment_status,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let payment_url: string | null = null;

    if (extensionCents > 0 && body.send_payment_link) {
      try {
        const session = await createExtensionCheckoutSession({
          reservationId: id,
          extensionCents,
          guestEmail: reservation.guest_email,
          guestName: reservation.guest_name,
          pitchCode: reservation.pitch_code ?? "—",
          oldCheckOut,
          newCheckOut: body.check_out,
          vehiclePlate: reservation.vehicle_plate,
          applyOnPayment: false,
          newTotalCents,
          locale: reservation.locale ?? "pt",
          accountingLines: useCalculatedLines,
        });

        payment_url = session.url;

        await supabase.from("payments").insert({
          reservation_id: id,
          amount_cents: extensionCents,
          currency: "eur",
          status: "pending",
          stripe_session_id: session.id,
          notes: `Extensão até ${body.check_out}`,
          period_check_in: oldCheckOut,
          period_check_out: body.check_out,
        });

        await sendExtensionPaymentLink({
          guestEmail: reservation.guest_email,
          guestName: reservation.guest_name,
          pitchCode: reservation.pitch_code ?? "—",
          oldCheckOut,
          newCheckOut: body.check_out,
          extensionCents,
          paymentUrl: session.url!,
          locale: reservation.locale ?? "pt",
          reservationId: id,
        });
      } catch (stripeError) {
        console.error("Extension Stripe session error:", stripeError);
        return NextResponse.json({
          success: true,
          warning:
            "Estadia prolongada mas o link Stripe não foi enviado. Configure STRIPE_SECRET_KEY.",
          extension_cents: extensionCents,
          check_out: body.check_out,
        });
      }
    }

    return NextResponse.json({
      success: true,
      check_out: body.check_out,
      total_cents: newTotalCents,
      extension_cents: extensionCents,
      quoted_extension_cents: quote.extensionCents,
      payment_url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao prolongar estadia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
