import { NextResponse } from "next/server";
import { runBalancePaymentEmails } from "@/lib/balance-payment";

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
    const result = await runBalancePaymentEmails();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Balance payment cron error:", error);
    const message = error instanceof Error ? error.message : "Erreur solde";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
