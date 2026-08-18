import {
  getMoloniSecrets,
  saveMoloniSettings,
  type MoloniSecrets,
} from "@/lib/moloni-settings";

const MOLONI_BASE = "https://api.moloni.pt/v1";
const TOKEN_SKEW_MS = 2 * 60 * 1000;

export class MoloniApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "MoloniApiError";
  }
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type CachedTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAtMs: number;
};

let tokenCache: CachedTokens | null = null;

function moloniAuthMessage(body: TokenResponse, fallback: string): string {
  const code = (body.error || "").toLowerCase();
  const description = body.error_description || "";
  if (code === "invalid_grant" || /invalid username or password/i.test(description)) {
    return "E-mail ou password Moloni incorretos.";
  }
  if (code === "invalid_client" || /client credentials/i.test(description)) {
    return "Developer ID ou Client Secret Moloni incorretos.";
  }
  if (code === "unauthorized_client") {
    return "A app Moloni não tem permissão para grant password. Em Configuração da API, ative o acesso nativo / password.";
  }
  return description || body.error || fallback;
}

function extractMoloniError(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.error_description === "string" && record.error_description.trim()) {
    return record.error_description;
  }
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (record.error === 1) return "Sessão Moloni inválida ou expirada. Volte a sincronizar.";
  return null;
}

async function requestGrant(params: Record<string, string>): Promise<TokenResponse> {
  const query = new URLSearchParams(params);
  const url = `${MOLONI_BASE}/grant/?${query.toString()}`;

  let response = await fetch(url, { method: "GET" });
  let body = (await response.json().catch(() => ({}))) as TokenResponse;

  if ((!response.ok || !body.access_token) && response.status !== 400) {
    response = await fetch(`${MOLONI_BASE}/grant/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: query,
    });
    body = (await response.json().catch(() => ({}))) as TokenResponse;
  }

  if (!response.ok || !body.access_token) {
    throw new MoloniApiError(
      moloniAuthMessage(body, "Falha na autenticação Moloni"),
      response.status,
      body
    );
  }
  return body;
}

function cacheTokens(tokens: TokenResponse) {
  const expiresIn = Number(tokens.expires_in ?? 3600);
  tokenCache = {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token ?? null,
    expiresAtMs: Date.now() + expiresIn * 1000,
  };
}

async function persistTokens(
  tokens: TokenResponse,
  extras?: Partial<Parameters<typeof saveMoloniSettings>[0]>
) {
  cacheTokens(tokens);
  const expiresIn = Number(tokens.expires_in ?? 3600);
  try {
    await saveMoloniSettings({
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      ...extras,
    });
  } catch (error) {
    console.warn("Moloni token persist failed:", error);
  }
}

export async function moloniLogin(secrets?: MoloniSecrets): Promise<string> {
  const current = secrets ?? (await getMoloniSecrets());
  if (!current.clientId || !current.clientSecret || !current.username || !current.password) {
    throw new MoloniApiError(
      "Credenciais Moloni incompletas. Preencha Developer ID, Client Secret, e-mail e password, depois clique em sincronizar."
    );
  }

  const tokens = await requestGrant({
    grant_type: "password",
    client_id: current.clientId,
    client_secret: current.clientSecret,
    username: current.username,
    password: current.password,
  });
  await persistTokens(tokens);
  return tokens.access_token!;
}

async function refreshAccessToken(current: MoloniSecrets): Promise<string> {
  const refreshToken = current.refreshToken || tokenCache?.refreshToken;
  if (!current.clientId || !current.clientSecret || !refreshToken) {
    return moloniLogin(current);
  }
  try {
    const tokens = await requestGrant({
      grant_type: "refresh_token",
      client_id: current.clientId,
      client_secret: current.clientSecret,
      refresh_token: refreshToken,
    });
    await persistTokens(tokens);
    return tokens.access_token!;
  } catch {
    return moloniLogin(current);
  }
}

export async function getMoloniAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAtMs - TOKEN_SKEW_MS > Date.now()) {
    return tokenCache.accessToken;
  }
  const current = await getMoloniSecrets();
  if (current.accessToken && current.tokenExpiresAt) {
    const expires = new Date(current.tokenExpiresAt).getTime();
    if (expires - TOKEN_SKEW_MS > Date.now()) {
      tokenCache = {
        accessToken: current.accessToken,
        refreshToken: current.refreshToken,
        expiresAtMs: expires,
      };
      return current.accessToken;
    }
    return refreshAccessToken(current);
  }
  return moloniLogin(current);
}

export async function moloniPost<T>(
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  const token = await getMoloniAccessToken();
  const url = `${MOLONI_BASE}${path}?access_token=${encodeURIComponent(token)}&json=true`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => null)) as T | Record<string, unknown> | null;
  const moloniError = extractMoloniError(body);
  if (!response.ok || moloniError) {
    throw new MoloniApiError(
      moloniError || `Erro Moloni ${path} (HTTP ${response.status})`,
      response.status,
      body
    );
  }
  return body as T;
}

export type MoloniCompany = { company_id: number; name?: string; vat?: string };
export type MoloniTax = {
  tax_id: number;
  name?: string;
  value?: number;
  type?: number;
  saft_type?: number;
};
export type MoloniDocumentSet = { document_set_id: number; name?: string };
export type MoloniPaymentMethod = { payment_method_id: number; name?: string };
export type MoloniCustomer = { customer_id: number; vat?: string; name?: string; number?: string };
export type MoloniProduct = { product_id: number; name?: string; reference?: string; price?: number };

export async function moloniCompanies(): Promise<MoloniCompany[]> {
  const data = await moloniPost<MoloniCompany[] | { error?: string }>("/companies/getAll/", {});
  return Array.isArray(data) ? data : [];
}

export async function moloniTaxes(companyId: number): Promise<MoloniTax[]> {
  const data = await moloniPost<MoloniTax[] | { error?: string }>("/taxes/getAll/", {
    company_id: companyId,
  });
  return Array.isArray(data) ? data : [];
}

export async function moloniDocumentSets(companyId: number): Promise<MoloniDocumentSet[]> {
  const data = await moloniPost<MoloniDocumentSet[] | { error?: string }>("/documentSets/getAll/", {
    company_id: companyId,
  });
  return Array.isArray(data) ? data : [];
}

export async function moloniPaymentMethods(companyId: number): Promise<MoloniPaymentMethod[]> {
  const data = await moloniPost<MoloniPaymentMethod[] | { error?: string }>("/paymentMethods/getAll/", {
    company_id: companyId,
  });
  return Array.isArray(data) ? data : [];
}

export async function moloniCustomersByVat(companyId: number, vat: string): Promise<MoloniCustomer[]> {
  const data = await moloniPost<MoloniCustomer[] | { error?: string }>("/customers/getByVat/", {
    company_id: companyId,
    vat,
  });
  return Array.isArray(data) ? data : [];
}

export async function moloniProductsBySearch(companyId: number, search: string): Promise<MoloniProduct[]> {
  const data = await moloniPost<MoloniProduct[] | { error?: string }>("/products/getBySearch/", {
    company_id: companyId,
    search,
    qty: 50,
  });
  return Array.isArray(data) ? data : [];
}

export type MoloniInsertResult = {
  valid?: number;
  document_id?: number;
  error?: unknown;
};

export async function moloniInsertInvoiceReceipt(
  payload: Record<string, unknown>
): Promise<MoloniInsertResult> {
  return moloniPost<MoloniInsertResult>("/invoiceReceipts/insert/", payload);
}

export async function moloniInvoiceReceiptsByReference(
  companyId: number,
  yourReference: string
): Promise<{ document_id?: number; number?: number; our_reference?: string }[]> {
  const data = await moloniPost<unknown>("/invoiceReceipts/getAll/", {
    company_id: companyId,
    your_reference: yourReference,
    qty: 5,
  });
  return Array.isArray(data) ? data : [];
}
