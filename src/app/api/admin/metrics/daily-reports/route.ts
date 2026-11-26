import { NextResponse } from "next/server";
import {
  generateAndStoreDailyPaymentReport,
  listDailyPaymentReports,
} from "@/lib/admin-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Same runtime as /api/cron/daily-payments-pdf — pdf-lib needs Node (Buffer).
export const runtime = "nodejs";

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
    // Default: today's Lisbon calendar day; reuse if it already exists.
    // Pass force:true or report_date to regenerate / backfill a specific day.
    const force = Boolean(body?.force);
    const reportDate =
      typeof body?.report_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.report_date)
        ? body.report_date
        : undefined;
    const supabase = createAdminClient();
    const result = await generateAndStoreDailyPaymentReport(supabase, {
      force,
      reportDate,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Generate daily report error:", error);
    const message = error instanceof Error ? error.message : "Erreur génération PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
