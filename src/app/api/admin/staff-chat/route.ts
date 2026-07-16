import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("staff_messages")
      .select("id, author_id, author_email, author_name, body, created_at")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (after) {
      query = query.gt("created_at", after);
    } else {
      // latest page when no cursor: fetch newest then reverse
      query = supabase
        .from("staff_messages")
        .select("id, author_id, author_email, author_name, body, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    const messages = after
      ? (data ?? [])
      : [...(data ?? [])].reverse();

    return NextResponse.json({ messages, current_user_id: admin.id });
  } catch (error) {
    console.error("Staff chat GET error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const postSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { body } = postSchema.parse(await request.json());
    const supabase = createAdminClient();

    const authorName =
      typeof admin.user_metadata?.full_name === "string"
        ? admin.user_metadata.full_name
        : typeof admin.user_metadata?.name === "string"
          ? admin.user_metadata.name
          : null;

    const { data, error } = await supabase
      .from("staff_messages")
      .insert({
        author_id: admin.id,
        author_email: admin.email ?? "",
        author_name: authorName,
        body,
      })
      .select("id, author_id, author_email, author_name, body, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ message: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Staff chat POST error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
