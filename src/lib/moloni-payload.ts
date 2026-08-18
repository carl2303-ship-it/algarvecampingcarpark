import { splitInclusiveVat, type AccountingLine, type VatPercent } from "@/lib/moloni-articles";

export type MoloniProductMap = Record<string, number>;

export class MoloniMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoloniMappingError";
  }
}

export type MoloniInvoiceProduct = {
  product_id: number;
  name: string;
  summary?: string;
  qty: number;
  price: number;
  taxes: { tax_id: number }[];
};

export type MoloniInvoicePayload = {
  company_id: number;
  date: string;
  expiration_date: string;
  document_set_id: number;
  customer_id: number;
  your_reference: string;
  our_reference?: string;
  notes?: string;
  status: 0 | 1;
  products: MoloniInvoiceProduct[];
  payments: {
    payment_method_id: number;
    date: string;
    value: number;
    notes?: string;
  }[];
};

export function lisbonDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function moloniNetPrice(grossCents: number, vatPercent: VatPercent): number {
  return splitInclusiveVat(grossCents, vatPercent).netCents / 100;
}

function fingerprint(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/euros?/g, " ")
    .replace(/,/g, ".")
    .replace(/[^a-z0-9.]+/g, "");
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/,/g, ".")
    .replace(/[+/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type MoloniProductCandidate = {
  product_id: number;
  name?: string;
  reference?: string;
  price?: number;
};

export function pickMatchingProductId(
  articleName: string,
  products: MoloniProductCandidate[]
): number | null {
  const wanted = normalizeName(articleName);
  const wantedFp = fingerprint(articleName);

  const exact = products.find((item) => normalizeName(item.name ?? "") === wanted);
  if (exact) return exact.product_id;

  const byFingerprint = products.find((item) => fingerprint(item.name ?? "") === wantedFp);
  if (byFingerprint) return byFingerprint.product_id;

  const byReference = products.find((item) => fingerprint(item.reference ?? "") === wantedFp);
  if (byReference) return byReference.product_id;

  const partial = products.find((item) => {
    const name = normalizeName(item.name ?? "");
    const fp = fingerprint(item.name ?? "");
    return (
      (name.length >= 3 && (name.includes(wanted) || wanted.includes(name))) ||
      (wantedFp.length >= 4 && (fp.includes(wantedFp) || wantedFp.includes(fp)))
    );
  });
  return partial?.product_id ?? null;
}

const LENGTH_SUPPLEMENT_NAME =
  /(?:\+|mais|de|superior).*(?:9|10)\s*m|(?:9|10)\s*m(?:et|$)|(?:9|10)\s*metros/i;

function pickByCatalogPrice(
  grossCents: number,
  vatPercent: VatPercent,
  products: MoloniProductCandidate[],
  nameFilter?: RegExp
): number | null {
  const net = moloniNetPrice(grossCents, vatPercent);
  const gross = grossCents / 100;
  const matches = products.filter((product) => {
    const price = Number(product.price ?? 0);
    if (Math.abs(price - net) > 0.03 && Math.abs(price - gross) > 0.03) return false;
    if (!nameFilter) return true;
    const label = `${product.name ?? ""} ${product.reference ?? ""}`;
    return nameFilter.test(label);
  });
  return matches.length === 1 ? matches[0]!.product_id : null;
}

export function pickMatchingProductForArticle(
  article: { name: string; unitAmountCents: number; vatPercent: VatPercent },
  products: MoloniProductCandidate[],
  aliases: string[] = []
): number | null {
  for (const name of [article.name, ...aliases]) {
    const id = pickMatchingProductId(name, products);
    if (id) return id;
  }
  return pickByCatalogPrice(article.unitAmountCents, article.vatPercent, products, LENGTH_SUPPLEMENT_NAME);
}

export function buildMoloniInvoicePayload(input: {
  companyId: number;
  documentSetId: number;
  customerId: number;
  paymentMethodId: number;
  taxId6: number;
  taxId23: number;
  productMap: MoloniProductMap;
  lines: AccountingLine[];
  yourReference: string;
  notes?: string;
  close: boolean;
  paymentValueEuros: number;
  date?: string;
}): MoloniInvoicePayload {
  const date = input.date ?? lisbonDate();
  const products: MoloniInvoiceProduct[] = input.lines
    .filter((line) => line.quantity > 0 && line.unitAmountCents > 0)
    .map((line) => {
      const productId = input.productMap[line.sku];
      if (!productId) {
        throw new MoloniMappingError(
          `Artigo Moloni não mapeado: ${line.name} (${line.sku}). Sincronize os artigos no admin.`
        );
      }
      const taxId = line.vatPercent === 23 ? input.taxId23 : input.taxId6;
      return {
        product_id: productId,
        name: line.name,
        summary: line.description,
        qty: line.quantity,
        price: moloniNetPrice(line.unitAmountCents, line.vatPercent),
        taxes: [{ tax_id: taxId }],
      };
    });

  if (products.length === 0) {
    throw new MoloniMappingError("Sem linhas de artigos para faturar no Moloni");
  }

  return {
    company_id: input.companyId,
    date,
    expiration_date: date,
    document_set_id: input.documentSetId,
    customer_id: input.customerId,
    your_reference: input.yourReference,
    notes: input.notes,
    status: input.close ? 1 : 0,
    products,
    payments: [
      {
        payment_method_id: input.paymentMethodId,
        date,
        value: Number(input.paymentValueEuros.toFixed(2)),
        notes: "Stripe",
      },
    ],
  };
}
