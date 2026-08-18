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

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function pickMatchingProductId(
  articleName: string,
  products: { product_id: number; name?: string }[]
): number | null {
  const wanted = normalizeName(articleName);
  const exact = products.find((item) => normalizeName(item.name ?? "") === wanted);
  if (exact) return exact.product_id;
  const partial = products.find((item) => {
    const name = normalizeName(item.name ?? "");
    return name.includes(wanted) || wanted.includes(name);
  });
  return partial?.product_id ?? null;
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
