import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const serviceSchema = z.object({
  name: z.string().min(1),
  name_en: z.string().optional(),
  description: z.string().optional(),
  description_en: z.string().optional(),
  price_cents: z.number().int().min(0).nullable().optional(),
  price_label_pt: z.string().optional(),
  price_label_en: z.string().optional(),
  icon: z.string().default("sparkles"),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_items")
    .select("*")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ services: data });
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = serviceSchema.parse(await request.json());
  const supabase = createAdminClient();

  const { data, error } = await supabase.from("service_items").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}
