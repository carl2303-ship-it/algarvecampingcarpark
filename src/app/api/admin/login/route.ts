import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getPublicSupabaseConfig } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!getPublicSupabaseConfig()) {
    return NextResponse.json(
      { error: "config", message: "Supabase não configurado no servidor." },
      { status: 503 }
    );
  }

  const body = loginSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "invalid", message: "Dados inválidos." }, { status: 400 });
  }

  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.data.email,
    password: body.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "invalid", message: "Credenciais inválidas." },
      { status: 401 }
    );
  }

  if (data.user.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "unauthorized", message: "Acesso não autorizado." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
