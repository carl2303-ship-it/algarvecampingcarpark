import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { getStripeSettingsView, saveStripeSettings } from "@/lib/stripe-settings";
import { resetStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getStripeSettingsView();
  return NextResponse.json({ settings });
}

const optionalKeySchema = z.string().trim().optional();

const updateSchema = z.object({
  secret_key: optionalKeySchema,
  publishable_key: optionalKeySchema,
  webhook_secret: optionalKeySchema,
});

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await request.json());

    if (body.secret_key && !body.secret_key.startsWith("sk_")) {
      return NextResponse.json(
        { error: "A chave secreta deve começar por sk_test_ ou sk_live_" },
        { status: 400 }
      );
    }
    if (body.publishable_key && !body.publishable_key.startsWith("pk_")) {
      return NextResponse.json(
        { error: "A chave pública deve começar por pk_test_ ou pk_live_" },
        { status: 400 }
      );
    }
    if (body.webhook_secret && !body.webhook_secret.startsWith("whsec_")) {
      return NextResponse.json(
        { error: "O webhook secret deve começar por whsec_" },
        { status: 400 }
      );
    }

    const settings = await saveStripeSettings(body);
    resetStripeClient();

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao guardar credenciais Stripe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
