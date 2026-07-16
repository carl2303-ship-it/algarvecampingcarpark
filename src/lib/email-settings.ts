import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_EMAIL } from "@/lib/constants";
import { maskSecret } from "@/lib/stripe-settings";

export type EmailSecrets = {
  resendApiKey: string | null;
  emailFrom: string;
};

export type EmailSettingsView = {
  resend_api_key_configured: boolean;
  resend_api_key_preview: string | null;
  resend_api_key_source: "database" | "environment" | null;
  email_from: string;
  email_from_source: "database" | "environment" | "default";
};

type EmailRow = {
  resend_api_key: string | null;
  email_from: string | null;
};

async function loadEmailRow(): Promise<EmailRow | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("email_settings")
      .select("resend_api_key, email_from")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      console.warn("Email settings fetch error:", error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Email settings unavailable:", error);
    return null;
  }
}

function resolveSecret(
  dbValue: string | null | undefined,
  envValue: string | undefined
): { value: string | null; source: "database" | "environment" | null } {
  if (dbValue?.trim()) return { value: dbValue.trim(), source: "database" };
  if (envValue?.trim()) return { value: envValue.trim(), source: "environment" };
  return { value: null, source: null };
}

export async function getEmailSecrets(): Promise<EmailSecrets> {
  const row = await loadEmailRow();
  const apiKey = resolveSecret(row?.resend_api_key, process.env.RESEND_API_KEY);
  const fromDb = row?.email_from?.trim();
  const fromEnv = process.env.EMAIL_FROM?.trim();

  return {
    resendApiKey: apiKey.value,
    emailFrom: fromDb || fromEnv || CONTACT_EMAIL,
  };
}

export async function getEmailSettingsView(): Promise<EmailSettingsView> {
  const row = await loadEmailRow();
  const apiKey = resolveSecret(row?.resend_api_key, process.env.RESEND_API_KEY);
  const fromDb = row?.email_from?.trim();
  const fromEnv = process.env.EMAIL_FROM?.trim();

  let email_from: string;
  let email_from_source: EmailSettingsView["email_from_source"];
  if (fromDb) {
    email_from = fromDb;
    email_from_source = "database";
  } else if (fromEnv) {
    email_from = fromEnv;
    email_from_source = "environment";
  } else {
    email_from = CONTACT_EMAIL;
    email_from_source = "default";
  }

  return {
    resend_api_key_configured: Boolean(apiKey.value),
    resend_api_key_preview: maskSecret(apiKey.value),
    resend_api_key_source: apiKey.source,
    email_from,
    email_from_source,
  };
}

export async function saveEmailSettings(input: {
  resend_api_key?: string;
  email_from?: string;
}): Promise<EmailSettingsView> {
  const supabase = createAdminClient();
  const current = await loadEmailRow();

  const payload: EmailRow & { updated_at: string } = {
    resend_api_key: current?.resend_api_key ?? null,
    email_from: current?.email_from ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.resend_api_key?.trim()) {
    payload.resend_api_key = input.resend_api_key.trim();
  }
  if (input.email_from?.trim()) {
    payload.email_from = input.email_from.trim();
  }

  const { error } = await supabase.from("email_settings").upsert({ id: true, ...payload });

  if (error) {
    throw new Error(error.message);
  }

  return getEmailSettingsView();
}
