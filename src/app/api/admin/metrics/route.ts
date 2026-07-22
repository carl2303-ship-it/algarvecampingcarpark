import { NextResponse } from "next/server";
import { z } from "zod";
import { defaultMetricsPeriod, getMetricsComparison } from "@/lib/admin-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      start: url.searchParams.get("start") ?? undefined,
      end: url.searchParams.get("end") ?? undefined,
    });

    const defaults = defaultMetricsPeriod();
    const period = {
      start: parsed.start ?? defaults.start,
      end: parsed.end ?? defaults.end,
    };

    if (period.end < period.start) {
      return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const metrics = await getMetricsComparison(supabase, period);

    return NextResponse.json({
      period,
      ...metrics,
    });
  } catch (error) {
    console.error("Admin metrics error:", error);
    const message = error instanceof Error ? error.message : "Erreur métriques";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
