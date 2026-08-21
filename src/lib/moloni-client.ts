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

function stringifyMoloniErrorValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") {
    if (value === 1) return "Sessão Moloni inválida ou expirada. Volte a sincronizar.";
    return `Erro Moloni código ${value}`;
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => stringifyMoloniErrorValue(item)).filter(Boolean);
    return parts.length ? parts.join("; ") : null;
  }
  if (typeof value === "object") {
    try {
      return `Erro Moloni: ${JSON.stringify(value)}`;
    } catch {
      return "Erro Moloni (resposta inválida)";
    }
  }
  return String(value);
}

export function extractMoloniError(body: unknown): string | null {
  if (body == null) return null;
  if (Array.isArray(body)) return stringifyMoloniErrorValue(body);
  if (typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.error_description === "string" && record.error_description.trim()) {
    return record.error_description;
  }
  const fromError = stringifyMoloniErrorValue(record.error);
  if (fromError) return fromError;
  if (record.valid === 0 || record.valid === "0") {
    return "Pedido Moloni rejeitado (valid=0)";
  }
  return null;
}

const MOLONI_FETCH_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MOLONI_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MoloniApiError("Tempo esgotado ao contactar a API Moloni. Tente de novo.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function requestGrant(params: Record<string, string>): Promise<TokenResponse> {
  const query = new URLSearchParams(params);
  const url = `${MOLONI_BASE}/grant/?${query.toString()}`;

  let response = await fetchWithTimeout(url, { method: "GET" });
  let body = (await response.json().catch(() => ({}))) as TokenResponse;

  if ((!response.ok || !body.access_token) && response.status !== 400) {
    response = await fetchWithTimeout(`${MOLONI_BASE}/grant/`, {
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
  const response = await fetchWithTimeout(url, {
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
export type MoloniProduct = {
  product_id: number;
  name?: string;
  reference?: string;
  price?: number;
  category_id?: number;
};

type MoloniCategory = { category_id: number; parent_id?: number; name?: string };

function asList<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function moloniCompanies(): Promise<MoloniCompany[]> {
  const data = await moloniPost<unknown>("/companies/getAll/", {});
  return asList<MoloniCompany>(data);
}

export async function moloniTaxes(companyId: number): Promise<MoloniTax[]> {
  const data = await moloniPost<unknown>("/taxes/getAll/", {
    company_id: companyId,
  });
  return asList<MoloniTax>(data);
}

export async function moloniDocumentSets(companyId: number): Promise<MoloniDocumentSet[]> {
  const data = await moloniPost<unknown>("/documentSets/getAll/", {
    company_id: companyId,
  });
  return asList<MoloniDocumentSet>(data);
}

export async function moloniPaymentMethods(companyId: number): Promise<MoloniPaymentMethod[]> {
  const data = await moloniPost<unknown>("/paymentMethods/getAll/", {
    company_id: companyId,
  });
  return asList<MoloniPaymentMethod>(data);
}

export async function moloniCustomersByVat(companyId: number, vat: string): Promise<MoloniCustomer[]> {
  const data = await moloniPost<unknown>("/customers/getByVat/", {
    company_id: companyId,
    vat,
  });
  return asList<MoloniCustomer>(data);
}

export async function moloniInsertCustomer(
  companyId: number,
  customer: { name: string; vat: string; number?: string }
): Promise<MoloniCustomer | null> {
  try {
    const data = await moloniPost<{ customer_id?: number } & MoloniCustomer>(
      "/customers/insert/",
      {
        company_id: companyId,
        name: customer.name,
        vat: customer.vat,
        number: customer.number ?? "CF",
        email: "",
        address: "",
        zip_code: "",
        city: "",
        country_id: 1, // Portugal
      }
    );
    if (data?.customer_id) return data as MoloniCustomer;
    return null;
  } catch (error) {
    console.warn("Moloni insert customer failed:", error);
    return null;
  }
}

export async function moloniProductsBySearch(companyId: number, search: string): Promise<MoloniProduct[]> {
  const cleaned = search.replace(/^[+]+/, "").trim();
  const data = await moloniPost<unknown>("/products/getBySearch/", {
    company_id: companyId,
    search: cleaned,
    qty: 50,
    offset: 0,
  });
  return asList<MoloniProduct>(data);
}

async function moloniCategories(
  companyId: number,
  parentId: number | null = 0
): Promise<MoloniCategory[]> {
  try {
    const payload: Record<string, unknown> = { company_id: companyId };
    if (parentId !== null) payload.parent_id = parentId;
    const data = await moloniPost<unknown>("/productCategories/getAll/", payload);
    return asList<MoloniCategory>(data);
  } catch (error) {
    console.warn("Moloni productCategories/getAll failed:", error);
    return [];
  }
}

async function moloniProductsInCategory(companyId: number, categoryId: number): Promise<MoloniProduct[]> {
  const products: MoloniProduct[] = [];
  try {
    for (let offset = 0; offset < 2000; offset += 50) {
      const data = await moloniPost<unknown>("/products/getAll/", {
        company_id: companyId,
        category_id: categoryId,
        qty: 50,
        offset,
        with_invisible: 1,
      });
      const batch = asList<MoloniProduct>(data);
      products.push(...batch);
      if (batch.length < 50) break;
    }
  } catch (error) {
    console.warn("Moloni products/getAll failed:", error);
  }
  return products;
}

function mergeProductResults(byId: Map<number, MoloniProduct>, items: MoloniProduct[]): void {
  for (const item of items) {
    if (item?.product_id) byId.set(item.product_id, item);
  }
}

async function parallelProductSearches(
  companyId: number,
  queries: string[]
): Promise<MoloniProduct[]> {
  const unique = [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const byId = new Map<number, MoloniProduct>();
  const results = await Promise.allSettled(
    unique.map((search) => moloniProductsBySearch(companyId, search))
  );
  for (const result of results) {
    if (result.status === "fulfilled") mergeProductResults(byId, result.value);
  }
  return [...byId.values()];
}

/** Fast catalog fetch for admin sync — parallel searches, no recursive category walk. */
export async function moloniProductsForArticleSync(companyId: number): Promise<MoloniProduct[]> {
  const byId = new Map<number, MoloniProduct>();

  const primary = await parallelProductSearches(companyId, [
    "Noite",
    "nuit",
    "ete",
    "aout",
    "Inverno",
    "Agosto",
    "Verao",
    "Verão",
    "Elec",
    "edp",
    "PESSOA",
    "pessoa",
    "1.50",
    "10m",
    "9m",
  ]);
  mergeProductResults(byId, primary);

  if (byId.size < 6) {
    mergeProductResults(byId, await moloniProductsInCategory(companyId, 0));
  }

  return [...byId.values()];
}

export async function moloniListAllProducts(companyId: number): Promise<MoloniProduct[]> {
  const byId = new Map<number, MoloniProduct>();
  const add = (items: MoloniProduct[]) => {
    for (const item of items) {
      if (item?.product_id) byId.set(item.product_id, item);
    }
  };

  const walk = async (parentId: number) => {
    const cats = await moloniCategories(companyId, parentId);
    for (const cat of cats) {
      if (!cat.category_id) continue;
      add(await moloniProductsInCategory(companyId, cat.category_id));
      await walk(cat.category_id);
    }
    return cats.length;
  };

  const rootCount = await walk(0);
  if (rootCount === 0) {
    add(await moloniProductsInCategory(companyId, 0));
    const allCats = await moloniCategories(companyId, null);
    for (const cat of allCats) {
      if (!cat.category_id) continue;
      add(await moloniProductsInCategory(companyId, cat.category_id));
    }
  }

  for (const query of [
    "Noite",
    "Elec",
    "PESSOA",
    "pessoa",
    "10m",
    "9m",
    "+ de",
    "de 10",
    "de 9",
    "Inverno",
    "Agosto",
    "Verao",
    "Verão",
  ]) {
    try {
      add(await moloniProductsBySearch(companyId, query));
    } catch (error) {
      console.warn("Moloni products/getBySearch failed:", query, error);
    }
  }

  return [...byId.values()];
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
