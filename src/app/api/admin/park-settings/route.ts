import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParkSettings } from "@/lib/park-settings";
import { revalidateMarketingPaths } from "@/lib/revalidate-marketing";

export const dynamic = "force-dynamic";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid datetime")
  .nullable();

const updateSchema = z.object({
  reception_open: timeSchema.optional(),
  reception_close: timeSchema.optional(),
  check_in_time: timeSchema.optional(),
  check_out_time: timeSchema.optional(),
  gate_access_code: z.string().max(32).nullable().optional(),
  online_booking_enabled: z.boolean().optional(),
  online_booking_starts_at: isoDateTimeSchema.optional(),
  online_booking_ends_at: isoDateTimeSchema.optional(),
  extra_guest_cents_per_night: z.number().int().min(0).max(5000).optional(),
  long_motorhome_cents_per_night: z.number().int().min(0).max(10000).optional(),
  electricity_10a_surcharge_cents_per_night: z.number().int().min(0).max(5000).optional(),
});

const SELECT_COLUMNS =
  "reception_open, reception_close, check_in_time, check_out_time, gate_access_code, online_booking_enabled, online_booking_starts_at, online_booking_ends_at, extra_guest_cents_per_night, long_motorhome_cents_per_night, electricity_10a_surcharge_cents_per_night";

const REVALIDATE_PATHS = [
  "/admin/settings",
  "/admin/park-status",
  "/admin/timeline",
];

export async function GET() {
  const settings = await getParkSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await request.json());
    const current = await getParkSettings();
    const merged = {
      reception_open: body.reception_open ?? current.reception_open,
      reception_close: body.reception_close ?? current.reception_close,
      check_in_time: body.check_in_time ?? current.check_in_time,
      check_out_time: body.check_out_time ?? current.check_out_time,
      gate_access_code:
        body.gate_access_code !== undefined
          ? body.gate_access_code?.trim() || null
          : current.gate_access_code,
      online_booking_enabled:
        body.online_booking_enabled ?? current.online_booking_enabled,
      online_booking_starts_at:
        body.online_booking_starts_at !== undefined
          ? body.online_booking_starts_at
          : current.online_booking_starts_at,
      online_booking_ends_at:
        body.online_booking_ends_at !== undefined
          ? body.online_booking_ends_at
          : current.online_booking_ends_at,
      extra_guest_cents_per_night:
        body.extra_guest_cents_per_night ?? current.extra_guest_cents_per_night,
      long_motorhome_cents_per_night:
        body.long_motorhome_cents_per_night ?? current.long_motorhome_cents_per_night,
      electricity_10a_surcharge_cents_per_night:
        body.electricity_10a_surcharge_cents_per_night ??
        current.electricity_10a_surcharge_cents_per_night,
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("park_settings")
      .upsert({ id: true, ...merged, updated_at: new Date().toISOString() })
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }
    revalidateMarketingPaths(["/", "/book", "/terms", "/about", "/contact"]);

    return NextResponse.json({ settings: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao guardar definições";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
