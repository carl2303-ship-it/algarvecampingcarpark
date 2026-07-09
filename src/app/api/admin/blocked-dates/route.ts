import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  pitch_code: z.string().min(1).max(10),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = schema.parse(await request.json());
  const supabase = createAdminClient();

  const pitchCode = data.pitch_code.toUpperCase();

  const { data: blocked, error } = await supabase
    .from("blocked_dates")
    .insert({
      pitch_code: pitchCode,
      zone_id: null,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("pitch_map_spots")
    .update({ status: "maintenance" })
    .eq("code", pitchCode);

  return NextResponse.json({ blocked });
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("id, start_date, end_date, reason, pitch_code")
    .order("start_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked_dates: data });
}

export async function DELETE(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID em falta" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("blocked_dates")
    .select("pitch_code")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (row?.pitch_code) {
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("blocked_dates")
      .select("*", { count: "exact", head: true })
      .eq("pitch_code", row.pitch_code)
      .gte("end_date", today);

    if (!count) {
      await supabase
        .from("pitch_map_spots")
        .update({ status: "available" })
        .eq("code", row.pitch_code);
    }
  }

  return NextResponse.json({ success: true });
}
