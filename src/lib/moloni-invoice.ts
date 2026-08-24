import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadMoloniPaymentSync,
  saveMoloniPaymentSync,
  type MoloniPaymentSync,
} from "@/lib/moloni-kv";
import { isMissingColumnError } from "@/lib/schema-errors";
import { getZoneRates } from "@/lib/availability";
import { calculateTotalPrice } from "@/lib/pricing";
import { getPricingSupplements } from "@/lib/pricing-supplements";
import {
  MOLONI_ARTICLE_ALIASES,
  MOLONI_ARTICLE_LIST,
  accountingLinesTotalCents,
  type AccountingLine,
  type MoloniArticleSku,
  type VatPercent,
} from "@/lib/moloni-articles";
import {
  MOLONI_CONSUMER_VAT,
  getMoloniSecrets,
  saveMoloniSettings,
  type MoloniProductMap,
  type MoloniSecrets,
} from "@/lib/moloni-settings";
import {
  MoloniApiError,
  moloniCompanies,
  moloniCustomersByVat,
  moloniCustomersBySearch,
  moloniDocumentSets,
  moloniInsertCustomer,
  moloniInsertInvoiceReceipt,
  moloniInvoiceReceiptsByReference,
  moloniProductsForArticleSync,
  moloniProductsBySearch,
  moloniLogin,
  moloniPaymentMethods,
  moloniTaxes,
  type MoloniProduct,
} from "@/lib/moloni-client";
import { getStripe } from "@/lib/stripe";
import { buildMoloniInvoicePayload, pickMatchingProductForArticle } from "@/lib/moloni-payload";

function pickTaxId(taxes: { tax_id: number; value?: number; saft_type?: number; type?: number }[], percent: number) {
  const iva = taxes.filter((tax) => tax.saft_type === 1 || tax.type === 1 || tax.saft_type == null);
  const match = (iva.length ? iva : taxes).find((tax) => Number(tax.value) === percent);
  return match?.tax_id ?? null;
}

function pickPaymentMethodId(
  methods: { payment_method_id: number; name?: string }[],
  preferredId?: number | null
) {
  if (preferredId && methods.some((method) => method.payment_method_id === preferredId)) {
    return preferredId;
  }
  const ranked = methods.find((method) =>
    /stripe|cart[aã]o|credit|visa|mbway|multibanco/i.test(method.name ?? "")
  );
  return ranked?.payment_method_id ?? methods[0]?.payment_method_id ?? null;
}

/** Keep saved series only if it still exists for this company; prefer default / FR. */
function pickDocumentSetId(
  sets: { document_set_id: number; name?: string; active_by_default?: number }[],
  preferredId?: number | null
): number | null {
  if (!sets.length) return null;
  if (preferredId && sets.some((set) => set.document_set_id === preferredId)) {
    return preferredId;
  }
  const byDefault = sets.find((set) => Number(set.active_by_default) === 1);
  if (byDefault) return byDefault.document_set_id;
  const invoiceLike = sets.find((set) =>
    /fatura|recibo|fr\b|fs\b|invoice|receipt/i.test(set.name ?? "")
  );
  return invoiceLike?.document_set_id ?? sets[0]?.document_set_id ?? null;
}

function pickTaxIdOrKeep(
  taxes: { tax_id: number; value?: number; saft_type?: number; type?: number }[],
  percent: number,
  preferredId?: number | null
) {
  if (preferredId && taxes.some((tax) => tax.tax_id === preferredId)) return preferredId;
  return pickTaxId(taxes, percent);
}

function matchArticlesToProducts(
  products: MoloniProduct[],
  existingMap: MoloniProductMap
): { productMap: MoloniProductMap; missing: string[] } {
  const productMap: MoloniProductMap = { ...existingMap };
  const missing: string[] = [];

  for (const article of MOLONI_ARTICLE_LIST) {
    const id = pickMatchingProductForArticle(
      article,
      products,
      MOLONI_ARTICLE_ALIASES[article.sku] ?? []
    );
    if (id) productMap[article.sku] = id;
    else missing.push(article.name);
  }

  return { productMap, missing };
}

const CONSUMER_FINAL_NAMES = /consumidor\s+final|consommateur\s+final|final\s+consumer/i;

function normalizePlateForMoloni(plate: string | null | undefined): string {
  return (plate ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

async function resolveConsumerFinalId(
  companyId: number,
  existingId: number | null,
  candidates: { customer_id: number; name?: string }[]
): Promise<number | null> {
  // If we already have an ID, verify it's the right one
  if (existingId) {
    const existing = candidates.find((c) => c.customer_id === existingId);
    if (existing && CONSUMER_FINAL_NAMES.test(existing.name ?? "")) return existingId;
  }

  // Look for "Consumidor Final" among candidates
  const cf = candidates.find((c) => CONSUMER_FINAL_NAMES.test(c.name ?? ""));
  if (cf) return cf.customer_id;

  // None found — create it
  const created = await moloniInsertCustomer(companyId, {
    name: "Consumidor Final",
    vat: MOLONI_CONSUMER_VAT,
    number: "CF",
  });
  return created?.customer_id ?? null;
}

/** Invoice customer: name = matrícula (CF VAT). Never reuse a random guest like "krister". */
async function resolveInvoiceCustomerId(
  companyId: number,
  plate: string | null | undefined,
  fallbackConsumerId: number | null
): Promise<number> {
  const normalized = normalizePlateForMoloni(plate);
  if (normalized) {
    try {
      const found = await moloniCustomersBySearch(companyId, normalized);
      const exact = found.find((customer) => {
        const name = normalizePlateForMoloni(customer.name);
        const number = normalizePlateForMoloni(customer.number);
        return name === normalized || number === normalized;
      });
      if (exact?.customer_id) return exact.customer_id;
    } catch (error) {
      console.warn("Moloni customer search by plate failed:", error);
    }

    const created = await moloniInsertCustomer(companyId, {
      name: normalized,
      vat: MOLONI_CONSUMER_VAT,
      number: normalized.slice(0, 30),
    });
    if (created?.customer_id) return created.customer_id;
  }

  const consumers = await moloniCustomersByVat(companyId, MOLONI_CONSUMER_VAT);
  const cfId = await resolveConsumerFinalId(companyId, fallbackConsumerId, consumers);
  if (!cfId) {
    throw new MoloniApiError(
      "Cliente Consumidor Final em falta na Moloni. Sincronize no admin ou crie o cliente 999999990."
    );
  }
  return cfId;
}

async function loadProductsForCompany(companyId: number): Promise<MoloniProduct[]> {
  let products = await moloniProductsForArticleSync(companyId);
  let { missing } = matchArticlesToProducts(products, {});

  if (missing.length > 0) {
    const extraTerms = missing.flatMap((name) => {
      const parts = name.split(/\s+/).filter(Boolean);
      return [parts[0], parts.slice(0, 2).join(" ")].filter(Boolean) as string[];
    });
    const extra = await Promise.allSettled(
      [...new Set(extraTerms)].slice(0, 6).map((search) => moloniProductsBySearch(companyId, search))
    );
    const byId = new Map(products.map((product) => [product.product_id, product]));
    for (const result of extra) {
      if (result.status !== "fulfilled") continue;
      for (const product of result.value) {
        if (product?.product_id) byId.set(product.product_id, product);
      }
    }
    products = [...byId.values()];
  }

  return products;
}

export async function syncMoloniCatalog(secretsOverride?: MoloniSecrets): Promise<{
  company_id: number;
  document_set_id: number | null;
  payment_method_id: number | null;
  tax_id_6: number | null;
  tax_id_23: number | null;
  consumer_customer_id: number | null;
  product_map: MoloniProductMap;
  missing_articles: string[];
  moloni_product_names: string[];
  companies: { company_id: number; name?: string }[];
}> {
  const secrets = secretsOverride ?? (await getMoloniSecrets());
  await moloniLogin(secrets);
  const companies = await moloniCompanies();
  const preferred =
    secrets.companyId ??
    companies.find((company) => company.company_id !== 5 && !/demonstra/i.test(company.name ?? ""))
      ?.company_id ??
    companies[0]?.company_id;
  let companyId = preferred;
  if (!companyId) throw new MoloniApiError("Nenhuma empresa encontrada na conta Moloni");

  let [products, taxes, sets, methods, consumers] = await Promise.all([
    loadProductsForCompany(companyId),
    moloniTaxes(companyId),
    moloniDocumentSets(companyId),
    moloniPaymentMethods(companyId),
    moloniCustomersByVat(companyId, MOLONI_CONSUMER_VAT),
  ]);

  if (products.length === 0) {
    for (const company of companies) {
      if (company.company_id === companyId) continue;
      const found = await loadProductsForCompany(company.company_id);
      if (found.length > 0) {
        companyId = company.company_id;
        products = found;
        [taxes, sets, methods, consumers] = await Promise.all([
          moloniTaxes(companyId),
          moloniDocumentSets(companyId),
          moloniPaymentMethods(companyId),
          moloniCustomersByVat(companyId, MOLONI_CONSUMER_VAT),
        ]);
        break;
      }
    }
  }

  const { productMap, missing } = matchArticlesToProducts(products, secrets.productMap);

  // Pick "Consumidor Final" by name — avoid picking a real customer that shares the VAT
  const consumerFinalId = await resolveConsumerFinalId(companyId, secrets.consumerCustomerId, consumers);

  const documentSetId = pickDocumentSetId(sets, secrets.documentSetId);
  const paymentMethodId = pickPaymentMethodId(methods, secrets.paymentMethodId);
  const taxId6 = pickTaxIdOrKeep(taxes, 6, secrets.taxId6);
  const taxId23 = pickTaxIdOrKeep(taxes, 23, secrets.taxId23);

  await saveMoloniSettings(
    {
      company_id: companyId,
      document_set_id: documentSetId,
      payment_method_id: paymentMethodId,
      tax_id_6: taxId6,
      tax_id_23: taxId23,
      consumer_customer_id: consumerFinalId,
      product_map: productMap,
    },
    { requirePersist: false }
  );

  return {
    company_id: companyId,
    document_set_id: documentSetId,
    payment_method_id: paymentMethodId,
    tax_id_6: taxId6,
    tax_id_23: taxId23,
    consumer_customer_id: consumerFinalId,
    product_map: productMap,
    missing_articles: missing,
    moloni_product_names: products
      .map((product) => product.name)
      .filter((name): name is string => Boolean(name))
      .slice(0, 30),
    companies,
  };
}

type ReservationForInvoice = {
  id: string;
  zone_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  guest_name: string;
  guest_email: string;
  vehicle_plate?: string | null;
  pitch_code?: string | null;
  electricity_amperage?: number | null;
  motorhome_over_9m?: boolean | null;
  manual_supplement_ids?: string[] | null;
  total_cents?: number;
};

function asAmperage(value: unknown): 6 | 10 | null {
  return value === 10 ? 10 : value === 6 ? 6 : null;
}

export async function accountingLinesForReservation(
  reservation: ReservationForInvoice,
  range?: { checkIn: string; checkOut: string }
): Promise<AccountingLine[]> {
  const rates = await getZoneRates(reservation.zone_id);
  const supplements = await getPricingSupplements();
  const pricing = calculateTotalPrice(
    rates,
    range?.checkIn ?? reservation.check_in,
    range?.checkOut ?? reservation.check_out,
    reservation.num_guests,
    {
      motorhomeOver9m: Boolean(reservation.motorhome_over_9m),
      electricityAmperage: asAmperage(reservation.electricity_amperage),
      manualSupplementIds: reservation.manual_supplement_ids ?? [],
      supplements,
    }
  );
  return pricing.lines;
}

async function linesFromStripeSession(session: Stripe.Checkout.Session): Promise<AccountingLine[]> {
  let items = session.line_items?.data ?? [];
  if (!items.length) {
    const stripe = await getStripe();
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price.product"],
    });
    items = full.line_items?.data ?? [];
  }
  const lines: AccountingLine[] = [];

  for (const item of items) {
    const product = item.price?.product;
    if (!product || typeof product === "string" || product.deleted) continue;
    const sku = product.metadata?.moloni_sku || product.metadata?.sku;
    const vatRaw = Number(product.metadata?.vat_percent);
    const vatPercent: VatPercent = vatRaw === 23 ? 23 : 6;
    const unitAmount = item.price?.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    if (!sku || unitAmount <= 0) continue;
    lines.push({
      sku: sku as MoloniArticleSku,
      name: product.name,
      description: product.description ?? "",
      unitAmountCents: unitAmount,
      quantity,
      vatPercent,
    });
  }

  return lines;
}

async function markPaymentMoloni(stripeSessionId: string | null, patch: MoloniPaymentSync) {
  if (!stripeSessionId) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("payments").update(patch).eq("stripe_session_id", stripeSessionId);
  if (!error) return;
  if (isMissingColumnError(error)) {
    await saveMoloniPaymentSync(stripeSessionId, patch);
    return;
  }
  console.warn("Moloni payment sync update failed:", error.message);
}

export async function issueMoloniInvoiceFromCheckout(
  session: Stripe.Checkout.Session,
  options?: { documentSetId?: number | null }
): Promise<{ skipped?: string; document_id?: number } | null> {
  const secrets = await getMoloniSecrets();
  if (!secrets.enabled) {
    console.warn("Moloni invoice skipped: automation disabled");
    await markPaymentMoloni(session.id, {
      moloni_error: "Facturação Moloni desactivada. Active a opção em Paramètres → Moloni.",
    });
    return { skipped: "disabled" };
  }
  if (!secrets.clientId || !secrets.password) {
    console.warn("Moloni invoice skipped: not configured");
    await markPaymentMoloni(session.id, {
      moloni_error: "Credenciais Moloni em falta. Guarde Developer ID e password no admin.",
    });
    return { skipped: "not_configured" };
  }

  const reservationId = session.metadata?.reservation_id;
  const supabase = createAdminClient();

  if (session.id) {
    const { data: payment, error } = await supabase
      .from("payments")
      .select("moloni_document_id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (!error && payment && (payment as { moloni_document_id?: number | null }).moloni_document_id) {
      return { skipped: "already_synced", document_id: payment.moloni_document_id ?? undefined };
    }
    if (error && isMissingColumnError(error)) {
      const cached = await loadMoloniPaymentSync(session.id);
      if (cached?.moloni_document_id) {
        return { skipped: "already_synced", document_id: cached.moloni_document_id };
      }
    }
  }

  const yourReference = `stripe:${session.id}`;
  if (!secrets.companyId) {
    throw new MoloniApiError("Sincronize a empresa Moloni no admin antes de faturar");
  }

  const existing = await moloniInvoiceReceiptsByReference(secrets.companyId, yourReference);
  if (existing[0]?.document_id) {
    await markPaymentMoloni(session.id, {
      moloni_document_id: existing[0].document_id,
      moloni_document_ref: existing[0].our_reference ?? String(existing[0].number ?? ""),
      moloni_error: null,
      moloni_synced_at: new Date().toISOString(),
    });
    return { document_id: existing[0].document_id };
  }

  let reservation: ReservationForInvoice | null = null;
  if (reservationId) {
    const { data } = await supabase
      .from("reservations")
      .select(
        "id, zone_id, check_in, check_out, num_guests, guest_name, guest_email, vehicle_plate, pitch_code, electricity_amperage, motorhome_over_9m, manual_supplement_ids, total_cents"
      )
      .eq("id", reservationId)
      .maybeSingle();
    reservation = data as ReservationForInvoice | null;
  }

  const paymentType = session.metadata?.type ?? "booking_full";
  let lines = await linesFromStripeSession(session);

  if ((!lines.length || accountingLinesTotalCents(lines) !== (session.amount_total ?? 0)) && reservation) {
    if (paymentType === "extension") {
      const oldCheckOut = session.metadata?.old_check_out;
      const newCheckOut = session.metadata?.new_check_out;
      if (oldCheckOut && newCheckOut) {
        lines = await accountingLinesForReservation(reservation, {
          checkIn: oldCheckOut,
          checkOut: newCheckOut,
        });
      }
    } else if (paymentType !== "booking_balance") {
      lines = await accountingLinesForReservation(reservation);
    }
  }

  if (!lines.length) {
    throw new MoloniApiError("Não foi possível obter as linhas de artigos para o Moloni");
  }

  if (Object.keys(secrets.productMap).length === 0) {
    throw new MoloniApiError(
      "Mapa de artigos Moloni vazio. Clique em «Tester et synchroniser» no admin."
    );
  }

  // Series IDs can go stale — refresh unless the batch already resolved a valid one.
  let documentSetId = options?.documentSetId ?? secrets.documentSetId;
  if (!options?.documentSetId) {
    const documentSets = await moloniDocumentSets(secrets.companyId);
    documentSetId = pickDocumentSetId(documentSets, secrets.documentSetId);
    if (documentSetId && documentSetId !== secrets.documentSetId) {
      console.warn(
        `Moloni document_set_id ${secrets.documentSetId} inválido; a usar ${documentSetId}`
      );
      await saveMoloniSettings({ document_set_id: documentSetId }, { requirePersist: false });
    }
  }
  secrets.documentSetId = documentSetId ?? null;

  if (
    !secrets.documentSetId ||
    !secrets.paymentMethodId ||
    !secrets.taxId6 ||
    !secrets.taxId23
  ) {
    throw new MoloniApiError(
      "IDs Moloni incompletos (série, método de pagamento ou IVA). Clique em Sincronizar no admin."
    );
  }

  const linesTotalCents = accountingLinesTotalCents(lines);
  const amountCents =
    typeof session.amount_total === "number" && session.amount_total > 0
      ? session.amount_total
      : linesTotalCents;
  const plate = reservation?.vehicle_plate?.trim();
  const customerId = await resolveInvoiceCustomerId(
    secrets.companyId,
    plate,
    secrets.consumerCustomerId
  );
  const notes = [
    reservation?.guest_name,
    reservation ? `${reservation.check_in} → ${reservation.check_out}` : null,
    reservation?.pitch_code ? `Lugar ${reservation.pitch_code}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const payload = buildMoloniInvoicePayload({
    companyId: secrets.companyId,
    documentSetId: secrets.documentSetId,
    customerId,
    paymentMethodId: secrets.paymentMethodId,
    taxId6: secrets.taxId6,
    taxId23: secrets.taxId23,
    productMap: secrets.productMap,
    lines,
    yourReference,
    notes,
    close: secrets.closeDocuments,
    paymentValueEuros: amountCents / 100,
  });

  const result = await moloniInsertInvoiceReceipt(payload);

  await markPaymentMoloni(session.id, {
    moloni_document_id: result.document_id,
    moloni_document_ref: yourReference,
    moloni_error: null,
    moloni_synced_at: new Date().toISOString(),
  });

  return { document_id: result.document_id };
}

export type MoloniRetryResult = {
  stripe_session_id: string;
  document_id?: number;
  skipped?: string;
  error?: string;
};

/** Re-issue Moloni invoices in small batches (Netlify gateway ~26s). */
export async function retryFailedMoloniInvoices(limit = 3): Promise<{
  attempted: number;
  issued: number;
  skipped: number;
  failed: number;
  remaining: number;
  error_summary: string[];
  results: MoloniRetryResult[];
}> {
  const batchSize = Math.min(Math.max(1, limit), 5);
  const supabase = createAdminClient();
  const { data: payments, error } = await supabase
    .from("payments")
    .select("stripe_session_id, moloni_document_id, moloni_error")
    .eq("status", "succeeded")
    .not("stripe_session_id", "is", null)
    .is("moloni_document_id", null)
    .order("created_at", { ascending: false })
    .limit(batchSize);

  if (error) throw new Error(error.message);

  // Warm Moloni auth + series once for the whole batch (avoids 504).
  const secrets = await getMoloniSecrets();
  await moloniLogin(secrets);
  let documentSetId = secrets.documentSetId;
  if (secrets.companyId) {
    const sets = await moloniDocumentSets(secrets.companyId);
    documentSetId = pickDocumentSetId(sets, secrets.documentSetId);
    if (documentSetId && documentSetId !== secrets.documentSetId) {
      await saveMoloniSettings({ document_set_id: documentSetId }, { requirePersist: false });
    }
  }
  if (!documentSetId) {
    throw new MoloniApiError(
      "Nenhuma série de documentos Moloni válida. Clique em «Tester et synchroniser»."
    );
  }

  const stripe = await getStripe();
  const results: MoloniRetryResult[] = [];
  let issued = 0;
  let skipped = 0;
  let failed = 0;
  const errorCounts = new Map<string, number>();

  for (const payment of payments ?? []) {
    const stripeSessionId = payment.stripe_session_id as string | null;
    if (!stripeSessionId) continue;
    try {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
        expand: ["line_items.data.price.product"],
      });
      const result = await issueMoloniInvoiceFromCheckout(session, { documentSetId });
      if (result?.document_id && !result.skipped) {
        issued += 1;
        results.push({ stripe_session_id: stripeSessionId, document_id: result.document_id });
      } else if (result?.skipped === "already_synced" && result.document_id) {
        issued += 1;
        results.push({
          stripe_session_id: stripeSessionId,
          document_id: result.document_id,
          skipped: result.skipped,
        });
      } else {
        skipped += 1;
        const reason = result?.skipped ?? "unknown";
        errorCounts.set(reason, (errorCounts.get(reason) ?? 0) + 1);
        results.push({
          stripe_session_id: stripeSessionId,
          skipped: reason,
          document_id: result?.document_id,
        });
      }
    } catch (retryError) {
      failed += 1;
      const message = retryError instanceof Error ? retryError.message : String(retryError);
      errorCounts.set(message, (errorCounts.get(message) ?? 0) + 1);
      results.push({ stripe_session_id: stripeSessionId, error: message });
      await markPaymentMoloni(stripeSessionId, { moloni_error: message });
    }
  }

  const { count: remaining } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "succeeded")
    .not("stripe_session_id", "is", null)
    .is("moloni_document_id", null);

  const error_summary = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([message, count]) => (count > 1 ? `${message} (×${count})` : message));

  return {
    attempted: results.length,
    issued,
    skipped,
    failed,
    remaining: remaining ?? 0,
    error_summary,
    results,
  };
}
