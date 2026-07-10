import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParkSettings } from "@/lib/park-settings";

export const dynamic = "force-dynamic";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const updateSchema = z.object({
  reception_open: timeSchema.optional(),
  reception_close: timeSchema.optional(),
  check_in_time: timeSchema.optional(),
  check_out_time: timeSchema.optional(),
  gate_access_code: z.string().max(32).nullable().optional(),
});

const REVALIDATE_PATHS = [
  "/admin/settings",
  "/book",
  "/en/book",
  "/terms",
  "/en/terms",
  "/about",
  "/en/about",
  "/contact",
  "/en/contact",
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
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("park_settings")
      .upsert({ id: true, ...merged, updated_at: new Date().toISOString() })
      .select(
        "reception_open, reception_close, check_in_time, check_out_time, gate_access_code"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const path of REVALIDATE_PATHS) {
      revalidatePath(path);
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao guardar definições";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
