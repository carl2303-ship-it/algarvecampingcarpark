import { NextResponse } from "next/server";
import {
  generateAndStoreDailyPaymentReport,
  listDailyPaymentReports,
} from "@/lib/admin-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const reports = await listDailyPaymentReports(supabase, 60);
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("List daily reports error:", error);
    const message = error instanceof Error ? error.message : "Erreur rapports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const force = Boolean(body?.force);
    const supabase = createAdminClient();
    const result = await generateAndStoreDailyPaymentReport(supabase, { force });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Generate daily report error:", error);
    const message = error instanceof Error ? error.message : "Erreur génération PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
