import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParkSettings } from "@/lib/park-settings";

export const dynamic = "force-dynamic";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

export async function GET() {
  const settings = await getParkSettings();
  return NextResponse.json({ settings });
}

const updateSchema = z.object({
  reception_open: timeSchema,
  reception_close: timeSchema,
  check_in_time: timeSchema,
  check_out_time: timeSchema,
});

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("park_settings")
      .upsert({ id: true, ...body, updated_at: new Date().toISOString() })
      .select("reception_open, reception_close, check_in_time, check_out_time")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const paths = [
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
    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao guardar horários";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
