import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import {
  getMoloniSettingsView,
  MoloniSettingsPersistError,
  resolveMoloniSecrets,
  saveMoloniSettings,
} from "@/lib/moloni-settings";
import { moloniLogin } from "@/lib/moloni-client";
import { syncMoloniCatalog } from "@/lib/moloni-invoice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

function hasSettingsInput(data: z.infer<typeof updateSchema>): boolean {
  return (
    Boolean(data.client_id) ||
    Boolean(data.client_secret) ||
    Boolean(data.username) ||
    Boolean(data.password) ||
    data.enabled !== undefined ||
    data.close_documents !== undefined
  );
}

export async function PUT(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = updateSchema.parse(await request.json());
    const settings = await saveMoloniSettings(body, { requirePersist: true });
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
  const parsed = updateSchema.safeParse(body);
  const input = parsed.success ? parsed.data : {};

  let persistWarning: string | undefined;

  try {
    if (parsed.success && hasSettingsInput(input)) {
      try {
        const saved = await saveMoloniSettings(input, { requirePersist: false });
        if ("persist_warning" in saved && saved.persist_warning) {
          persistWarning = saved.persist_warning;
        }
      } catch (error) {
        if (error instanceof MoloniSettingsPersistError) {
          persistWarning = error.message;
        } else {
          throw error;
        }
      }
    }

    const secrets = await resolveMoloniSecrets(input);

    if (action === "login") {
      await moloniLogin(secrets);
      return NextResponse.json({
        ok: true,
        settings: await getMoloniSettingsView(),
        persist_warning: persistWarning,
      });
    }

    const catalog = await syncMoloniCatalog(secrets);
    return NextResponse.json({
      ok: true,
      catalog,
      settings: await getMoloniSettingsView(),
      persist_warning: persistWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro na API Moloni";
    console.error("Moloni admin action failed:", error);
    const incomplete = /incompletas/i.test(message);
    return NextResponse.json(
      { error: message, persist_warning: persistWarning },
      { status: incomplete ? 400 : 500 }
    );
  }
}
