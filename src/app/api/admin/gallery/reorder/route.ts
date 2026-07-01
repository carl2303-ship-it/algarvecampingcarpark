import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int(),
    })
  ),
});

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items } = schema.parse(await request.json());
  const supabase = createAdminClient();

  for (const item of items) {
    const { error } = await supabase
      .from("gallery_images")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
