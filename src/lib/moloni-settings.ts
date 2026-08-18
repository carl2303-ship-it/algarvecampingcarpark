import { loadMoloniKvRow, saveMoloniKvRow } from "@/lib/moloni-kv";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/schema-errors";
import { maskSecret } from "@/lib/stripe-settings";
import type { MoloniProductMap } from "@/lib/moloni-payload";

export const MOLONI_CONSUMER_VAT = "999999990";

export type { MoloniProductMap };

export type MoloniSecrets = {
  clientId: string | null;
  clientSecret: string | null;
  username: string | null;
  password: string | null;
  companyId: number | null;
  documentSetId: number | null;
  paymentMethodId: number | null;
  taxId6: number | null;
  taxId23: number | null;
  consumerCustomerId: number | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  productMap: MoloniProductMap;
  enabled: boolean;
  closeDocuments: boolean;
};

export type MoloniSettingsView = {
  configured: boolean;
  enabled: boolean;
  close_documents: boolean;
  client_id_preview: string | null;
  username_preview: string | null;
  client_secret_configured: boolean;
  password_configured: boolean;
  company_id: number | null;
  document_set_id: number | null;
  payment_method_id: number | null;
  tax_id_6: number | null;
  tax_id_23: number | null;
  consumer_customer_id: number | null;
  product_map: MoloniProductMap;
  source: "database" | "environment" | "mixed" | "fallback" | null;
  table_missing: boolean;
};

export type MoloniSettingsRow = {
  client_id: string | null;
  client_secret: string | null;
  username: string | null;
  password: string | null;
  company_id: number | null;
  document_set_id: number | null;
  payment_method_id: number | null;
  tax_id_6: number | null;
  tax_id_23: number | null;
  consumer_customer_id: number | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  product_map: MoloniProductMap | null;
  enabled: boolean;
  close_documents: boolean;
};

function parseProductMap(value: unknown): MoloniProductMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const map: MoloniProductMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const id = typeof raw === "number" ? raw : Number(raw);
    if (Number.isInteger(id) && id > 0) map[key] = id;
  }
  return map;
}

let moloniTableMissing = false;
let memoryRow: MoloniSettingsRow | null = null;

export function isMoloniSettingsTableMissing(): boolean {
  return moloniTableMissing;
}

function normalizeMoloniRow(data: MoloniSettingsRow): MoloniSettingsRow {
  return {
    ...data,
    product_map: parseProductMap(data.product_map),
  };
}

async function loadMoloniRow(): Promise<MoloniSettingsRow | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("moloni_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    if (error) {
      if (isMissingRelationError(error)) {
        moloniTableMissing = true;
        const fallback = await loadMoloniKvRow();
        const row = fallback ?? memoryRow;
        return row ? normalizeMoloniRow(row) : null;
      }
      console.warn("Moloni settings fetch error:", error.message);
      return memoryRow ? normalizeMoloniRow(memoryRow) : null;
    }
    moloniTableMissing = false;
    if (!data) return memoryRow ? normalizeMoloniRow(memoryRow) : null;
    return normalizeMoloniRow(data as MoloniSettingsRow);
  } catch (error) {
    if (isMissingRelationError(error)) {
      moloniTableMissing = true;
    } else {
      console.warn("Moloni settings unavailable:", error);
    }
    const fallback = await loadMoloniKvRow();
    const row = fallback ?? memoryRow;
    return row ? normalizeMoloniRow(row) : null;
  }
}

function envInt(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function getMoloniSecrets(): Promise<MoloniSecrets> {
  const row = await loadMoloniRow();
  return {
    clientId: row?.client_id?.trim() || process.env.MOLONI_CLIENT_ID?.trim() || null,
    clientSecret: row?.client_secret?.trim() || process.env.MOLONI_CLIENT_SECRET?.trim() || null,
    username: row?.username?.trim() || process.env.MOLONI_USERNAME?.trim() || null,
    password: row?.password || process.env.MOLONI_PASSWORD || null,
    companyId: row?.company_id ?? envInt("MOLONI_COMPANY_ID"),
    documentSetId: row?.document_set_id ?? envInt("MOLONI_DOCUMENT_SET_ID"),
    paymentMethodId: row?.payment_method_id ?? envInt("MOLONI_PAYMENT_METHOD_ID"),
    taxId6: row?.tax_id_6 ?? envInt("MOLONI_TAX_ID_6"),
    taxId23: row?.tax_id_23 ?? envInt("MOLONI_TAX_ID_23"),
    consumerCustomerId: row?.consumer_customer_id ?? envInt("MOLONI_CONSUMER_CUSTOMER_ID"),
    accessToken: row?.access_token ?? null,
    refreshToken: row?.refresh_token ?? null,
    tokenExpiresAt: row?.token_expires_at ?? null,
    productMap: row?.product_map ?? {},
    enabled: Boolean(row?.enabled),
    closeDocuments: row?.close_documents !== false,
  };
}

export async function getMoloniSettingsView(): Promise<MoloniSettingsView> {
  const secrets = await getMoloniSecrets();
  const row = await loadMoloniRow();
  const hasDb = Boolean(row?.client_id || row?.username);
  const hasEnv = Boolean(process.env.MOLONI_CLIENT_ID || process.env.MOLONI_USERNAME);
  let source: MoloniSettingsView["source"] = null;
  if (moloniTableMissing && (row || hasEnv)) source = "fallback";
  else if (hasDb && hasEnv) source = "mixed";
  else if (hasDb) source = "database";
  else if (hasEnv) source = "environment";

  return {
    configured: Boolean(secrets.clientId && secrets.clientSecret && secrets.username && secrets.password),
    enabled: secrets.enabled,
    close_documents: secrets.closeDocuments,
    client_id_preview: maskSecret(secrets.clientId),
    username_preview: secrets.username ? secrets.username.replace(/(.{2}).+(@.*)/, "$1…$2") : null,
    client_secret_configured: Boolean(secrets.clientSecret),
    password_configured: Boolean(secrets.password),
    company_id: secrets.companyId,
    document_set_id: secrets.documentSetId,
    payment_method_id: secrets.paymentMethodId,
    tax_id_6: secrets.taxId6,
    tax_id_23: secrets.taxId23,
    consumer_customer_id: secrets.consumerCustomerId,
    product_map: secrets.productMap,
    source,
    table_missing: moloniTableMissing,
  };
}

export async function saveMoloniSettings(input: {
  client_id?: string;
  client_secret?: string;
  username?: string;
  password?: string;
  company_id?: number | null;
  document_set_id?: number | null;
  payment_method_id?: number | null;
  tax_id_6?: number | null;
  tax_id_23?: number | null;
  consumer_customer_id?: number | null;
  enabled?: boolean;
  close_documents?: boolean;
  product_map?: MoloniProductMap;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
}): Promise<MoloniSettingsView> {
  const current = await loadMoloniRow();

  const payload = {
    client_id: input.client_id?.trim() || current?.client_id || null,
    client_secret: input.client_secret?.trim() || current?.client_secret || null,
    username: input.username?.trim() || current?.username || null,
    password: input.password || current?.password || null,
    company_id: input.company_id !== undefined ? input.company_id : current?.company_id ?? null,
    document_set_id:
      input.document_set_id !== undefined ? input.document_set_id : current?.document_set_id ?? null,
    payment_method_id:
      input.payment_method_id !== undefined
        ? input.payment_method_id
        : current?.payment_method_id ?? null,
    tax_id_6: input.tax_id_6 !== undefined ? input.tax_id_6 : current?.tax_id_6 ?? null,
    tax_id_23: input.tax_id_23 !== undefined ? input.tax_id_23 : current?.tax_id_23 ?? null,
    consumer_customer_id:
      input.consumer_customer_id !== undefined
        ? input.consumer_customer_id
        : current?.consumer_customer_id ?? null,
    product_map: input.product_map ?? current?.product_map ?? {},
    enabled: input.enabled ?? current?.enabled ?? false,
    close_documents: input.close_documents ?? current?.close_documents ?? true,
    access_token: input.access_token !== undefined ? input.access_token : current?.access_token ?? null,
    refresh_token:
      input.refresh_token !== undefined ? input.refresh_token : current?.refresh_token ?? null,
    token_expires_at:
      input.token_expires_at !== undefined
        ? input.token_expires_at
        : current?.token_expires_at ?? null,
    updated_at: new Date().toISOString(),
  };

  const rowPayload: MoloniSettingsRow = {
    client_id: payload.client_id,
    client_secret: payload.client_secret,
    username: payload.username,
    password: payload.password,
    company_id: payload.company_id,
    document_set_id: payload.document_set_id,
    payment_method_id: payload.payment_method_id,
    tax_id_6: payload.tax_id_6,
    tax_id_23: payload.tax_id_23,
    consumer_customer_id: payload.consumer_customer_id,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_expires_at: payload.token_expires_at,
    product_map: payload.product_map,
    enabled: payload.enabled,
    close_documents: payload.close_documents,
  };

  memoryRow = rowPayload;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("moloni_settings").upsert({ id: true, ...payload });
    if (!error) {
      moloniTableMissing = false;
      return getMoloniSettingsView();
    }
    if (!isMissingRelationError(error)) throw new Error(error.message);
    moloniTableMissing = true;
  } catch (error) {
    if (!isMissingRelationError(error) && !(error instanceof Error && /not configured/i.test(error.message))) {
      console.warn("Moloni settings database save failed:", error);
      if (error instanceof Error && !isMissingRelationError(error)) {
        /* still persist to fallback so sync can continue */
      }
    } else {
      moloniTableMissing = true;
    }
  }

  await saveMoloniKvRow(rowPayload);
  return getMoloniSettingsView();
}
