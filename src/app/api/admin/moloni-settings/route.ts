import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { getMoloniSettingsView, saveMoloniSettings } from "@/lib/moloni-settings";
import { moloniLogin } from "@/lib/moloni-client";
import { syncMoloniCatalog } from "@/lib/moloni-invoice";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getMoloniSettingsView();
  return NextResponse.json({ settings });
}

const updateSchema = z.object({
  client_id: z.string().trim().optional(),
  client_secret: z.string().trim().optional(),
  username: z.string().trim().optional(),
  password: z.string().optional(),
  enabled: z.boolean().optional(),
  close_documents: z.boolean().optional(),
  company_id: z.number().int().positive().nullable().optional(),
  document_set_id: z.number().int().positive().nullable().optional(),
  payment_method_id: z.number().int().positive().nullable().optional(),
});

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await request.json());
    const settings = await saveMoloniSettings(body);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro ao guardar Moloni";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body?.action === "login" ? "login" : "sync";

  try {
    if (action === "login") {
      await moloniLogin();
      return NextResponse.json({ ok: true, settings: await getMoloniSettingsView() });
    }
    const catalog = await syncMoloniCatalog();
    return NextResponse.json({
      ok: true,
      catalog,
      settings: await getMoloniSettingsView(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro na API Moloni";
    console.error("Moloni admin action failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
