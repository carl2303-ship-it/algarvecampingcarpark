import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { getEmailSecrets } from "@/lib/email-settings";
import { sendPreArrivalByReservationId } from "@/lib/pre-arrival";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const force = new URL(request.url).searchParams.get("force") === "1";

  try {
    const { resendApiKey } = await getEmailSecrets();
    if (!resendApiKey) {
      return NextResponse.json(
        {
          error:
            "Resend non configuré. Ajoutez la clé dans Paramètres → E-mail (Resend), ou RESEND_API_KEY.",
        },
        { status: 503 }
      );
    }

    const result = await sendPreArrivalByReservationId(id, { force });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Send pre-arrival email error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'envoi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
