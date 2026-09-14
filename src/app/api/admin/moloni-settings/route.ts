import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import {
  getMoloniSettingsView,
  getMoloniLastDbError,
  MoloniSettingsPersistError,
  resolveMoloniSecrets,
  saveMoloniSettings,
} from "@/lib/moloni-settings";
import { moloniLogin } from "@/lib/moloni-client";
import { retryFailedMoloniInvoices, syncMoloniCatalog } from "@/lib/moloni-invoice";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  if (url.searchParams.get("raw") === "1") {
    // Raw DB read — shows exactly what is in the table, no processing
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("moloni_settings")
        .select("id, client_id, username, company_id, enabled, updated_at, client_secret, password, access_token")
        .eq("id", true)
        .maybeSingle();
      return NextResponse.json({
        raw_db: data
          ? {
              has_client_id: Boolean(data.client_id),
              client_id_len: data.client_id?.length ?? 0,
              has_client_secret: Boolean(data.client_secret),
              has_username: Boolean(data.username),
              username: data.username,
              has_password: Boolean(data.password),
              has_access_token: Boolean(data.access_token),
              company_id: data.company_id,
              enabled: data.enabled,
              updated_at: data.updated_at,
            }
          : null,
        db_error: error ? `${error.code}: ${error.message}` : null,
      });
    } catch (err) {
      return NextResponse.json({ raw_db: null, db_error: String(err) });
    }
  }

  const settings = await getMoloniSettingsView();
  const db_error = getMoloniLastDbError();
  return NextResponse.json({ settings, db_error });
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
  const action =
    body?.action === "login" ? "login" : body?.action === "retry" ? "retry" : "sync";
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

    if (action === "retry") {
      const retry = await retryFailedMoloniInvoices();
      return NextResponse.json({
        ok: true,
        retry,
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
    const stack = error instanceof Error ? error.stack?.split("\n").slice(0, 5).join(" | ") : undefined;
    console.error("Moloni admin action failed:", error);
    const incomplete = /incompletas/i.test(message);
    return NextResponse.json(
      {
        error: message,
        error_detail: stack,
        persist_warning: persistWarning,
        db_error: getMoloniLastDbError(),
      },
      { status: incomplete ? 400 : 500 }
    );
  }
}
