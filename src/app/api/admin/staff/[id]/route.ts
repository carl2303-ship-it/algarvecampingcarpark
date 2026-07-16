import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas retirer votre propre accès." },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data: existing, error: fetchError } = await supabase.auth.admin.getUserById(id);
    if (fetchError || !existing.user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (existing.user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Cet utilisateur n'est pas admin" }, { status: 400 });
    }

    const { error } = await supabase.auth.admin.updateUserById(id, {
      app_metadata: { role: null },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke staff error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
