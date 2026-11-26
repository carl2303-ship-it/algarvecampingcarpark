import { NextResponse } from "next/server";
import {
  generateAndStoreDailyPaymentReport,
  previousLisbonCalendarDay,
} from "@/lib/admin-metrics";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    // Default: rebuild yesterday's complete Lisbon calendar day (cron ~13h).
    const force = url.searchParams.get("force") !== "0";
    const reportDate =
      url.searchParams.get("report_date") ?? previousLisbonCalendarDay();
    const supabase = createAdminClient();
    const result = await generateAndStoreDailyPaymentReport(supabase, {
      force,
      reportDate,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Daily payments PDF cron error:", error);
    const message = error instanceof Error ? error.message : "Erreur rapport PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
