import { createAdminClient } from "@/lib/supabase/admin";

export type StripeSecrets = {
  secretKey: string | null;
  publishableKey: string | null;
  webhookSecret: string | null;
};

export type StripeSettingsView = {
  secret_key_configured: boolean;
  secret_key_preview: string | null;
  secret_key_source: "database" | "environment" | null;
  publishable_key_configured: boolean;
  publishable_key_preview: string | null;
  publishable_key_source: "database" | "environment" | null;
  webhook_secret_configured: boolean;
  webhook_secret_preview: string | null;
  webhook_secret_source: "database" | "environment" | null;
};

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

type StripeRow = {
  secret_key: string | null;
  publishable_key: string | null;
  webhook_secret: string | null;
};

async function loadStripeRow(): Promise<StripeRow | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("stripe_settings")
      .select("secret_key, publishable_key, webhook_secret")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      console.warn("Stripe settings fetch error:", error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Stripe settings unavailable:", error);
    return null;
  }
}

function resolveSecret(
  dbValue: string | null | undefined,
  envValue: string | undefined
): { value: string | null; source: "database" | "environment" | null } {
  if (dbValue) return { value: dbValue, source: "database" };
  if (envValue) return { value: envValue, source: "environment" };
  return { value: null, source: null };
}

export async function getStripeSecrets(): Promise<StripeSecrets> {
  const row = await loadStripeRow();

  const secret = resolveSecret(row?.secret_key, process.env.STRIPE_SECRET_KEY);
  const publishable = resolveSecret(
    row?.publishable_key,
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
  const webhook = resolveSecret(row?.webhook_secret, process.env.STRIPE_WEBHOOK_SECRET);

  return {
    secretKey: secret.value,
    publishableKey: publishable.value,
    webhookSecret: webhook.value,
  };
}

export async function getStripeSettingsView(): Promise<StripeSettingsView> {
  const row = await loadStripeRow();

  const secret = resolveSecret(row?.secret_key, process.env.STRIPE_SECRET_KEY);
  const publishable = resolveSecret(
    row?.publishable_key,
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
  const webhook = resolveSecret(row?.webhook_secret, process.env.STRIPE_WEBHOOK_SECRET);

  return {
    secret_key_configured: Boolean(secret.value),
    secret_key_preview: maskSecret(secret.value),
    secret_key_source: secret.source,
    publishable_key_configured: Boolean(publishable.value),
    publishable_key_preview: maskSecret(publishable.value),
    publishable_key_source: publishable.source,
    webhook_secret_configured: Boolean(webhook.value),
    webhook_secret_preview: maskSecret(webhook.value),
    webhook_secret_source: webhook.source,
  };
}

export async function saveStripeSettings(input: {
  secret_key?: string;
  publishable_key?: string;
  webhook_secret?: string;
}): Promise<StripeSettingsView> {
  const supabase = createAdminClient();
  const current = await loadStripeRow();

  const payload: StripeRow & { updated_at: string } = {
    secret_key: current?.secret_key ?? null,
    publishable_key: current?.publishable_key ?? null,
    webhook_secret: current?.webhook_secret ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.secret_key?.trim()) {
    payload.secret_key = input.secret_key.trim();
  }
  if (input.publishable_key?.trim()) {
    payload.publishable_key = input.publishable_key.trim();
  }
  if (input.webhook_secret?.trim()) {
    payload.webhook_secret = input.webhook_secret.trim();
  }

  const { error } = await supabase.from("stripe_settings").upsert({ id: true, ...payload });

  if (error) {
    throw new Error(error.message);
  }

  return getStripeSettingsView();
}
