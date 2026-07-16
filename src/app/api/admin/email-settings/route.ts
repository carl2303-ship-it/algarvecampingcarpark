import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { getEmailSettingsView, saveEmailSettings } from "@/lib/email-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getEmailSettingsView();
  return NextResponse.json({ settings });
}

const updateSchema = z.object({
  resend_api_key: z.string().trim().optional(),
  email_from: z.string().trim().optional(),
});

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await request.json());

    if (body.resend_api_key && !body.resend_api_key.startsWith("re_")) {
      return NextResponse.json(
        { error: "A chave Resend deve começar por re_" },
        { status: 400 }
      );
    }

    if (body.email_from) {
      const addr =
        body.email_from.match(/<([^>]+)>/)?.[1]?.trim() ?? body.email_from.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
        return NextResponse.json(
          { error: "Indique un e-mail d'envoi valide (ex. : parc@domaine.pt)" },
          { status: 400 }
        );
      }
    }

    if (!body.resend_api_key && !body.email_from) {
      return NextResponse.json(
        { error: "Remplissez au moins un champ pour mettre à jour." },
        { status: 400 }
      );
    }

    const settings = await saveEmailSettings(body);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao guardar credenciais email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
