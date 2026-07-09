import { NextResponse } from "next/server";
import { runAutoCheckout } from "@/lib/reservation-checkout";

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
    const force = new URL(request.url).searchParams.get("force") === "1";
    const result = await runAutoCheckout(force);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Auto checkout cron error:", error);
    const message = error instanceof Error ? error.message : "Erro no auto check-out";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
