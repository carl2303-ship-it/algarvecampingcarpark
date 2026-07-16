import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("staff_notepad")
      .select("body, updated_by, updated_by_email, updated_at")
      .eq("id", true)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      notepad: data ?? {
        body: "",
        updated_by: null,
        updated_by_email: null,
        updated_at: null,
      },
    });
  } catch (error) {
    console.error("Staff notepad GET error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const putSchema = z.object({
  body: z.string().max(50000),
});

export async function PUT(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { body } = putSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("staff_notepad")
      .upsert({
        id: true,
        body,
        updated_by: admin.id,
        updated_by_email: admin.email ?? null,
        updated_at: new Date().toISOString(),
      })
      .select("body, updated_by, updated_by_email, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ notepad: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Staff notepad PUT error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
