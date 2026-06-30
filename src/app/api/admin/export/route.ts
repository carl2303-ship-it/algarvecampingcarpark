import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, zone:zones(name), pitch:pitches(code)")
    .in("status", ["confirmed", "checked_in", "checked_out", "cancelled"])
    .order("check_in", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = [
    "id",
    "guest_name",
    "guest_email",
    "guest_phone",
    "vehicle_plate",
    "zone",
    "pitch",
    "check_in",
    "check_out",
    "status",
    "total_cents",
    "num_guests",
    "created_at",
  ];

  const rows = (data ?? []).map((r) => [
    r.id,
    r.guest_name,
    r.guest_email,
    r.guest_phone,
    r.vehicle_plate ?? "",
    (r.zone as { name: string } | null)?.name ?? "",
    (r.pitch as { code: string } | null)?.code ?? "",
    r.check_in,
    r.check_out,
    r.status,
    r.total_cents,
    r.num_guests,
    r.created_at,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
