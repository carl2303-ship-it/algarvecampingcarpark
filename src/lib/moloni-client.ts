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
    const parts = value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return stringifyMoloniErrorValue(item);
        }
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const record = item as Record<string, unknown>;
          // Field validation errors look like { field: "code" } — not entity rows.
          if ("company_id" in record || "product_id" in record || "customer_id" in record) {
            return null;
          }
          return stringifyMoloniErrorValue(record);
        }
        return null;
      })
      .filter(Boolean);
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

/**
 * Detect Moloni API error payloads.
 * - getAll success → array of entities ({ company_id }, { product_id }, …)
 * - insert/update validation failure → array of strings ("1 name") or
 *   { code, description } when human_errors=true
 *
 * Note: languages/getAll rows also have `code` ("PT","ES",…) — that is NOT an error.
 */
export function extractMoloniError(body: unknown): string | null {
  if (body == null) return null;

  if (Array.isArray(body)) {
    if (body.length === 0) return null;
    const first = body[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const row = first as Record<string, unknown>;
      // Entity rows (companies, products, taxes, languages, maturity dates, …)
      if (
        "company_id" in row ||
        "product_id" in row ||
        "customer_id" in row ||
        "document_id" in row ||
        "tax_id" in row ||
        "payment_method_id" in row ||
        "document_set_id" in row ||
        "language_id" in row ||
        "maturity_date_id" in row ||
        "category_id" in row ||
        "delivery_method_id" in row
      ) {
        return null;
      }
      // human_errors=true format — prefer `description`; `code` alone is ambiguous
      if ("description" in row || "code" in row) {
        return body
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const rec = item as Record<string, unknown>;
            const description =
              typeof rec.description === "string" ? rec.description.trim() : "";
            const code = typeof rec.code === "string" ? rec.code.trim() : "";
            return description || code || null;
          })
          .filter(Boolean)
          .join("; ");
      }
    }
    // Classic validation errors: ["1 name", "2 qty 1 0", …]
    if (typeof first === "string" || typeof first === "number") {
      return stringifyMoloniErrorValue(body);
    }
    return null;
  }

  if (typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.error_description === "string" && record.error_description.trim()) {
    return record.error_description;
  }
  if ("error" in record) {
    const fromError = stringifyMoloniErrorValue(record.error);
    if (fromError) return fromError;
  }
  if (record.valid === 0 || record.valid === "0") {
    return "Pedido Moloni rejeitado (valid=0)";
  }
  // Indexed field errors as object: { "0": "1 products", "1": "…" }
  const keys = Object.keys(record);
  if (
    keys.length > 0 &&
    keys.every((key) => /^\d+$/.test(key)) &&
    !("document_id" in record) &&
    !("company_id" in record)
  ) {
    return stringifyMoloniErrorValue(Object.values(record));
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
  const url = `${MOLONI_BASE}${path}?access_token=${encodeURIComponent(token)}&json=true&human_errors=true`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
export type MoloniDocumentSet = {
  document_set_id: number;
  name?: string;
  active_by_default?: number;
  cash_vat_scheme_indicator?: number;
};
export type MoloniPaymentMethod = { payment_method_id: number; name?: string };
export type MoloniLanguage = { language_id: number; code?: string; title?: string };
export type MoloniMaturityDate = {
  maturity_date_id: number;
  name?: string;
  days?: number;
};
export type MoloniDeliveryMethod = { delivery_method_id: number; name?: string };
export type MoloniCustomer = {
  customer_id: number;
  vat?: string;
  name?: string;
  number?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  country_id?: number;
  email?: string;
  language_id?: number;
  maturity_date_id?: number;
  payment_method_id?: number;
  delivery_method_id?: number;
  salesman_id?: number;
  discount?: number;
  credit_limit?: number;
  payment_day?: number;
};
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

export async function moloniLanguages(): Promise<MoloniLanguage[]> {
  const data = await moloniPost<unknown>("/languages/getAll/", {});
  return asList<MoloniLanguage>(data);
}

export async function moloniMaturityDates(companyId: number): Promise<MoloniMaturityDate[]> {
  const data = await moloniPost<unknown>("/maturityDates/getAll/", {
    company_id: companyId,
  });
  return asList<MoloniMaturityDate>(data);
}

export async function moloniDeliveryMethods(companyId: number): Promise<MoloniDeliveryMethod[]> {
  const data = await moloniPost<unknown>("/deliveryMethods/getAll/", {
    company_id: companyId,
  });
  return asList<MoloniDeliveryMethod>(data);
}

/** Defaults required by customers/insert (language, maturity, payment method, delivery). */
export async function moloniCustomerInsertDefaults(
  companyId: number,
  preferredPaymentMethodId?: number | null
): Promise<{
  languageId: number;
  maturityDateId: number;
  paymentMethodId: number;
  deliveryMethodId: number;
}> {
  const [languages, maturities, methods, deliveries] = await Promise.all([
    moloniLanguages(),
    moloniMaturityDates(companyId),
    preferredPaymentMethodId ? Promise.resolve([] as MoloniPaymentMethod[]) : moloniPaymentMethods(companyId),
    moloniDeliveryMethods(companyId),
  ]);

  const languageId =
    languages.find((lang) => /^pt/i.test(lang.code ?? "") || /portug/i.test(lang.title ?? ""))
      ?.language_id ??
    languages[0]?.language_id ??
    1;

  const maturityDateId =
    maturities.find((row) => Number(row.days) === 0)?.maturity_date_id ??
    maturities[0]?.maturity_date_id;

  let paymentMethodId = preferredPaymentMethodId ?? null;
  if (!paymentMethodId) {
    paymentMethodId = methods[0]?.payment_method_id ?? null;
  }
  const deliveryMethodId = deliveries[0]?.delivery_method_id ?? 0;

  if (!maturityDateId) {
    throw new MoloniApiError(
      "Nenhum prazo de pagamento (maturity date) na Moloni. Crie um em Definições → Prazos."
    );
  }
  if (!paymentMethodId) {
    throw new MoloniApiError(
      "Nenhum método de pagamento na Moloni. Sincronize no admin ou crie um método."
    );
  }
  return { languageId, maturityDateId, paymentMethodId, deliveryMethodId };
}

export async function moloniCustomersByVat(companyId: number, vat: string): Promise<MoloniCustomer[]> {
  const data = await moloniPost<unknown>("/customers/getByVat/", {
    company_id: companyId,
    vat,
  });
  return asList<MoloniCustomer>(data);
}

export async function moloniCustomersBySearch(
  companyId: number,
  search: string
): Promise<MoloniCustomer[]> {
  const data = await moloniPost<unknown>("/customers/getBySearch/", {
    company_id: companyId,
    search: search.trim(),
    qty: 50,
    offset: 0,
  });
  return asList<MoloniCustomer>(data);
}

export async function moloniCustomerGetOne(
  companyId: number,
  customerId: number
): Promise<MoloniCustomer | null> {
  const data = await moloniPost<MoloniCustomer | MoloniCustomer[] | null>("/customers/getOne/", {
    company_id: companyId,
    customer_id: customerId,
  });
  if (Array.isArray(data)) return data[0] ?? null;
  if (data && typeof data === "object" && data.customer_id) return data;
  return null;
}

export async function moloniUpdateCustomer(
  companyId: number,
  customerId: number,
  patch: { name: string },
  defaults: {
    languageId: number;
    maturityDateId: number;
    paymentMethodId: number;
    deliveryMethodId: number;
  }
): Promise<void> {
  const current = await moloniCustomerGetOne(companyId, customerId);
  if (!current) {
    throw new MoloniApiError(`Cliente Moloni ${customerId} não encontrado para actualizar`);
  }
  await moloniPost("/customers/update/", {
    company_id: companyId,
    customer_id: customerId,
    name: patch.name,
    vat: current.vat ?? "",
    number: current.number ?? String(customerId).slice(0, 20),
    language_id: current.language_id ?? defaults.languageId,
    email: current.email ?? "",
    address: current.address || "Desconhecido",
    zip_code: current.zip_code || "0000-000",
    city: current.city || "Desconhecido",
    country_id: current.country_id ?? 1,
    payment_method_id: current.payment_method_id ?? defaults.paymentMethodId,
    maturity_date_id: current.maturity_date_id ?? defaults.maturityDateId,
    delivery_method_id: current.delivery_method_id ?? defaults.deliveryMethodId,
    salesman_id: current.salesman_id ?? 0,
    discount: current.discount ?? 0,
    credit_limit: current.credit_limit ?? 0,
    payment_day: current.payment_day ?? 0,
  });
}

export async function moloniInsertCustomer(
  companyId: number,
  customer: {
    name: string;
    vat: string;
    number?: string;
    languageId: number;
    maturityDateId: number;
    paymentMethodId: number;
    deliveryMethodId?: number;
  }
): Promise<MoloniCustomer> {
  const number = (customer.number ?? customer.name).slice(0, 20);
  const data = await moloniPost<{ valid?: number; customer_id?: number } & MoloniCustomer>(
    "/customers/insert/",
    {
      company_id: companyId,
      name: customer.name,
      vat: customer.vat,
      number,
      language_id: customer.languageId,
      email: "",
      address: "Desconhecido",
      zip_code: "0000-000",
      city: "Desconhecido",
      country_id: 1, // Portugal
      payment_method_id: customer.paymentMethodId,
      maturity_date_id: customer.maturityDateId,
      delivery_method_id: customer.deliveryMethodId ?? 0,
      salesman_id: 0,
      discount: 0,
      credit_limit: 0,
      payment_day: 0,
    }
  );
  if (data?.customer_id) return data as MoloniCustomer;
  throw new MoloniApiError("Moloni customers/insert não devolveu customer_id", undefined, data);
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
  const result = await moloniPost<MoloniInsertResult>("/invoiceReceipts/insert/", payload);
  const documentId = Number(result?.document_id);
  if (Number.isFinite(documentId) && documentId > 0) {
    return { ...result, document_id: documentId };
  }
  const detail =
    result == null ? "null" : typeof result === "object" ? JSON.stringify(result) : String(result);
  throw new MoloniApiError(
    `Moloni não devolveu document_id. Resposta: ${detail.slice(0, 800)}`,
    undefined,
    result
  );
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

export type MoloniDocumentSummary = {
  document_id: number;
  number?: number;
  date?: string;
  your_reference?: string;
  our_reference?: string;
  entity_name?: string;
  entity_number?: string;
  net_value?: number;
  gross_value?: number;
  status?: number;
  source: "invoiceReceipts" | "invoices" | "simplifiedInvoices";
};

async function moloniDocumentsByCustomer(
  path: "/invoiceReceipts/getAll/" | "/invoices/getAll/" | "/simplifiedInvoices/getAll/",
  source: MoloniDocumentSummary["source"],
  companyId: number,
  customerId: number
): Promise<MoloniDocumentSummary[]> {
  const docs: MoloniDocumentSummary[] = [];
  try {
    for (let offset = 0; offset < 200; offset += 50) {
      const data = await moloniPost<unknown>(path, {
        company_id: companyId,
        customer_id: customerId,
        qty: 50,
        offset,
      });
      const rows = Array.isArray(data) ? data : [];
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const rec = row as Record<string, unknown>;
        const documentId = Number(rec.document_id);
        if (!Number.isFinite(documentId) || documentId <= 0) continue;
        docs.push({
          document_id: documentId,
          number: typeof rec.number === "number" ? rec.number : Number(rec.number) || undefined,
          date: typeof rec.date === "string" ? rec.date : undefined,
          your_reference: typeof rec.your_reference === "string" ? rec.your_reference : undefined,
          our_reference: typeof rec.our_reference === "string" ? rec.our_reference : undefined,
          entity_name: typeof rec.entity_name === "string" ? rec.entity_name : undefined,
          entity_number: typeof rec.entity_number === "string" ? rec.entity_number : undefined,
          net_value: typeof rec.net_value === "number" ? rec.net_value : Number(rec.net_value),
          gross_value: typeof rec.gross_value === "number" ? rec.gross_value : Number(rec.gross_value),
          status: typeof rec.status === "number" ? rec.status : Number(rec.status),
          source,
        });
      }
      if (rows.length < 50) break;
    }
  } catch (error) {
    console.warn(`Moloni ${path} by customer failed:`, error);
  }
  return docs;
}

/** Staff invoices: customer = plate; payment method may be bank transfer, not Stripe. */
export async function moloniDocumentsForCustomer(
  companyId: number,
  customerId: number
): Promise<MoloniDocumentSummary[]> {
  const [receipts, invoices, simplified] = await Promise.all([
    moloniDocumentsByCustomer("/invoiceReceipts/getAll/", "invoiceReceipts", companyId, customerId),
    moloniDocumentsByCustomer("/invoices/getAll/", "invoices", companyId, customerId),
    moloniDocumentsByCustomer("/simplifiedInvoices/getAll/", "simplifiedInvoices", companyId, customerId),
  ]);
  return [...receipts, ...invoices, ...simplified];
}
