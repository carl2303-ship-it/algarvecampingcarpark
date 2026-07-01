import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getPublicSupabaseConfig } from "@/lib/supabase/public-server";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  if (!getPublicSupabaseConfig()) {
    return NextResponse.json(
      { error: "config", message: "Supabase não configurado no servidor." },
      { status: 503 }
    );
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "invalid", message: "Email inválido." }, { status: 400 });
  }

  const supabase = await createRouteHandlerClient();
  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent("/admin/reset-password")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(body.data.email, {
    redirectTo,
  });

  if (error) {
    console.error("Forgot password error:", error.message);
  }

  // Always return success to avoid revealing whether the email exists.
  return NextResponse.json({
    ok: true,
    message:
      "Se existir uma conta admin com esse email, receberá um link para redefinir a password.",
  });
}
