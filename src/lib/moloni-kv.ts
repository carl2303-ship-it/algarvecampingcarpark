import { promises as fs } from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";
import type { MoloniSettingsRow } from "@/lib/moloni-settings";

const STORE_NAME = "moloni-config";
const SETTINGS_KEY = "settings";
const LOCAL_FILE = path.join(process.cwd(), ".data", "moloni", "settings.json");

function isMissingBlobsEnv(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "MissingBlobsEnvironmentError"
  );
}

function openBlobStore() {
  const siteID = process.env.NETLIFY_SITE_ID ?? process.env.SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN ?? process.env.NETLIFY_BLOBS_TOKEN;

  if (siteID && token) {
    return getStore({
      name: STORE_NAME,
      consistency: "strong",
      siteID,
      token,
    });
  }

  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export type MoloniPaymentSync = {
  moloni_document_id?: number | null;
  moloni_document_ref?: string | null;
  moloni_error?: string | null;
  moloni_synced_at?: string | null;
};

function hasStoredSecrets(row: MoloniSettingsRow | null): boolean {
  return Boolean(row?.client_id?.trim() || row?.username?.trim());
}

export async function loadMoloniKvRow(): Promise<MoloniSettingsRow | null> {
  try {
    const store = openBlobStore();
    const data = await store.get(SETTINGS_KEY, { type: "json" });
    return parseSettingsRow(data);
  } catch (error) {
    if (!isMissingBlobsEnv(error)) {
      console.warn("Moloni fallback store read error:", error);
    }
    return loadLocalRow();
  }
}

/** Returns true when secrets can be read back after write. */
export async function saveMoloniKvRow(row: MoloniSettingsRow): Promise<boolean> {
  try {
    const store = openBlobStore();
    await store.setJSON(SETTINGS_KEY, row);
    const data = await store.get(SETTINGS_KEY, { type: "json" });
    const parsed = parseSettingsRow(data);
    if (hasStoredSecrets(parsed)) return true;
  } catch (error) {
    if (!isMissingBlobsEnv(error)) {
      console.warn("Moloni fallback store write error:", error);
    }
  }

  try {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(row), "utf8");
    const parsed = await loadLocalRow();
    return hasStoredSecrets(parsed);
  } catch (error) {
    console.warn("Moloni local settings write error:", error);
    return false;
  }
}

export async function loadMoloniPaymentSync(
  stripeSessionId: string
): Promise<MoloniPaymentSync | null> {
  const key = paymentKey(stripeSessionId);
  try {
    const store = openBlobStore();
    const data = await store.get(key, { type: "json" });
    return parsePaymentSync(data);
  } catch (error) {
    if (!isMissingBlobsEnv(error)) {
      console.warn("Moloni payment sync read error:", error);
    }
    return loadLocalPayment(key);
  }
}

export async function saveMoloniPaymentSync(
  stripeSessionId: string,
  patch: MoloniPaymentSync
): Promise<void> {
  const key = paymentKey(stripeSessionId);
  const current = (await loadMoloniPaymentSync(stripeSessionId)) ?? {};
  const next = { ...current, ...patch };
  try {
    const store = openBlobStore();
    await store.setJSON(key, next);
  } catch (error) {
    if (!isMissingBlobsEnv(error)) throw error;
    const file = localPaymentPath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(next), "utf8");
  }
}

function paymentKey(stripeSessionId: string): string {
  return `payment:${stripeSessionId}`;
}

function parseSettingsRow(data: unknown): MoloniSettingsRow | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as MoloniSettingsRow;
}

function parsePaymentSync(data: unknown): MoloniPaymentSync | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as MoloniPaymentSync;
}

async function loadLocalRow(): Promise<MoloniSettingsRow | null> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    return parseSettingsRow(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function loadLocalPayment(key: string): Promise<MoloniPaymentSync | null> {
  try {
    const raw = await fs.readFile(localPaymentPath(key), "utf8");
    return parsePaymentSync(JSON.parse(raw));
  } catch {
    return null;
  }
}

function localPaymentPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(process.cwd(), ".data", "moloni", `${safe}.json`);
}
