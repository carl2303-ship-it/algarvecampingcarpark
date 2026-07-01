import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { getPublicSupabaseConfig } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";

const schema = z.object({
  password: z.string().min(8, "A password deve ter pelo menos 8 caracteres."),
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
    return NextResponse.json(
      { error: "invalid", message: body.error.issues[0]?.message ?? "Password inválida." },
      { status: 400 }
    );
  }

  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "session", message: "Link expirado ou inválido. Peça um novo reset." },
      { status: 401 }
    );
  }

  if (user.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "unauthorized", message: "Esta conta não tem acesso admin." },
      { status: 403 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password: body.data.password });
  if (error) {
    return NextResponse.json(
      { error: "update", message: "Não foi possível atualizar a password." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
