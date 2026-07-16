import { NextResponse } from "next/server";
import { runPreArrivalEmails } from "@/lib/pre-arrival";

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
    const result = await runPreArrivalEmails();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Pre-arrival cron error:", error);
    const message = error instanceof Error ? error.message : "Erro no email pré-chegada";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
