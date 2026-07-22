import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { getEmailSecrets } from "@/lib/email-settings";
import { runPreArrivalEmails } from "@/lib/pre-arrival";

export const dynamic = "force-dynamic";

/** Admin manual trigger for the pre-arrival batch (same logic as the cron). */
export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { resendApiKey } = await getEmailSecrets();
    if (!resendApiKey) {
      return NextResponse.json(
        {
          error:
            "Resend non configuré. Ajoutez la clé dans Paramètres → E-mail (Resend).",
        },
        { status: 503 }
      );
    }

    const result = await runPreArrivalEmails();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Admin pre-arrival run error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
