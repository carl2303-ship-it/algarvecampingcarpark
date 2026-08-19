export type RateSeason = "august" | "summer" | "low" | "winter";

/** IVA on accommodation / length supplement (Portuguese reduced rate). */
export const VAT_ACCOMMODATION_PERCENT = 6;
/** IVA on extra person and electricity. */
export const VAT_STANDARD_PERCENT = 23;

/** 6A electricity included in electric-zone night rates (12.50 − 9.00, etc.). */
export const ELECTRICITY_6A_CENTS_PER_NIGHT = 350;
/** Full 10A article = 6A + 0.50 € surcharge. */
export const ELECTRICITY_10A_CENTS_PER_NIGHT = 400;

export type VatPercent = typeof VAT_ACCOMMODATION_PERCENT | typeof VAT_STANDARD_PERCENT;

export type MoloniArticleSku =
  | "extra-person"
  | "over-10m"
  | "elec-6a"
  | "elec-10a"
  | "noite-inverno-2"
  | "noite-inverno-34"
  | "noite-agosto-2"
  | "noite-agosto-34"
  | "noite-verao-2"
  | "noite-verao-34";

export type OccupancyBucket = "2" | "3_4";

export interface MoloniArticle {
  sku: MoloniArticleSku;
  /** Exact Stripe / Moloni product name. */
  name: string;
  vatPercent: VatPercent;
  /** Tax-inclusive catalogue unit price in cents. */
  unitAmountCents: number;
}

export interface AccountingLine {
  sku: MoloniArticleSku | `manual:${string}`;
  name: string;
  description: string;
  unitAmountCents: number;
  quantity: number;
  vatPercent: VatPercent;
}

export interface StayNightParts {
  season: RateSeason;
  occupancy: OccupancyBucket;
  extraGuestCount: number;
  extraGuestUnitCents: number;
  electricityAmperage: 6 | 10 | null;
  electricity6aCents: number;
  electricity10aCents: number;
  nightCentsWithoutElectricity: number;
  over10m: boolean;
  over10mCents: number;
  manuals: { name: string; amountCents: number }[];
}

/**
 * Articles as they must appear in Stripe so Kapta/Moloni can map them.
 * Names match the owners’ Moloni list. Winter 3/4 is 11 € (park tariff),
 * not 10 € — that keeps invoices equal to what guests actually pay.
 */
export const MOLONI_ARTICLES: Record<MoloniArticleSku, MoloniArticle> = {
  "extra-person": {
    sku: "extra-person",
    name: "+1.50 EUROS/PESSOA",
    vatPercent: VAT_STANDARD_PERCENT,
    unitAmountCents: 150,
  },
  "over-10m": {
    sku: "over-10m",
    name: "+ de 10m",
    vatPercent: VAT_ACCOMMODATION_PERCENT,
    unitAmountCents: 200,
  },
  "elec-6a": {
    sku: "elec-6a",
    name: "Elec 3.50 6A",
    vatPercent: VAT_STANDARD_PERCENT,
    unitAmountCents: ELECTRICITY_6A_CENTS_PER_NIGHT,
  },
  "elec-10a": {
    sku: "elec-10a",
    name: "Elec 4 10A",
    vatPercent: VAT_STANDARD_PERCENT,
    unitAmountCents: ELECTRICITY_10A_CENTS_PER_NIGHT,
  },
  "noite-inverno-2": {
    sku: "noite-inverno-2",
    name: "Noite Inverno 2 pessoas 9",
    vatPercent: VAT_ACCOMMODATION_PERCENT,
    unitAmountCents: 900,
  },
  "noite-inverno-34": {
    sku: "noite-inverno-34",
    name: "Noite Inverno 3/4 pessoas 11",
    vatPercent: VAT_ACCOMMODATION_PERCENT,
    unitAmountCents: 1100,
  },
  "noite-agosto-2": {
    sku: "noite-agosto-2",
    name: "Noite Agosto 2 pessoas 11",
    vatPercent: VAT_ACCOMMODATION_PERCENT,
    unitAmountCents: 1100,
  },
  "noite-agosto-34": {
    sku: "noite-agosto-34",
    name: "Noite Agosto 3/4 pessoas 13",
    vatPercent: VAT_ACCOMMODATION_PERCENT,
    unitAmountCents: 1300,
  },
  "noite-verao-2": {
    sku: "noite-verao-2",
    name: "Noite Verao 2 pessoas 10",
    vatPercent: VAT_ACCOMMODATION_PERCENT,
    unitAmountCents: 1000,
  },
  "noite-verao-34": {
    sku: "noite-verao-34",
    name: "Noite Verao 3/4 pessoas 12",
    vatPercent: VAT_ACCOMMODATION_PERCENT,
    unitAmountCents: 1200,
  },
};

export const MOLONI_ARTICLE_LIST: MoloniArticle[] = Object.values(MOLONI_ARTICLES);

/** Alternate Moloni product titles (park uses +9 m in the app, Moloni may say + de 9m). */
export const MOLONI_ARTICLE_ALIASES: Partial<Record<MoloniArticleSku, string[]>> = {
  "over-10m": [
    "+ de 9m",
    "+ de 10 m",
    "+ de 10 metros",
    "+ de 9 metros",
    "+9m",
    "+ 9m",
    "+10m",
    "+ 10m",
    "mais de 10m",
    "mais de 9m",
    "+ de 10 M",
    "superior a 10m",
    "superior a 9m",
  ],
  "elec-6a": [
    "Elec 3,50 €",
    "Elec 3.50",
    "Electricidade 6A",
    "Electricidade 3.50",
    "Eletricidade 3.50",
    "Elec 6A",
    "6A",
  ],
  "elec-10a": [
    "Elec 4,00 €",
    "Elec 4.00",
    "Elec 4€",
    "Electricidade 10A",
    "Eletricidade 10A",
    "Elec 10A",
    "10A",
  ],
  "noite-inverno-2": [
    "NOITE 9 €",
    "Noite 9€",
    "Noite 9 €",
    "NOITE 9",
    "Noite Inverno 2p",
    "Noite Inverno 2 pax",
    "Noite 2 pessoas 9",
  ],
  "noite-inverno-34": [
    "NOITE 11 €",
    "Noite 11€",
    "Noite 11 €",
    "NOITE 11",
    "Noite Inverno 3/4p",
    "Noite Inverno 3 4 pax",
    "Noite 3 4 pessoas 11",
    "NOITE 10 € (3/4 PAX)",
    "NOITE 10€ (3/4 PAX)",
  ],
  "noite-agosto-2": [
    "NOITE 11 € Agosto",
    "Noite Agosto 2p",
    "Noite Agosto 2 pax",
  ],
  "noite-agosto-34": [
    "NOITE 13 € Agosto",
    "Noite Agosto 3/4p",
    "Noite Agosto 3 4 pax",
  ],
  "noite-verao-2": [
    "NOITE 10 €",
    "Noite 10€",
    "Noite 10 €",
    "NOITE 10",
    "Noite Verao 2p",
    "Noite Verão 2p",
    "Noite Verao 2 pax",
    "Noite 2 pessoas 10",
  ],
  "noite-verao-34": [
    "NOITE 12 €",
    "Noite 12€",
    "Noite 12 €",
    "NOITE 12",
    "Noite Verao 3/4p",
    "Noite Verão 3/4p",
    "Noite Verao 3 4 pax",
    "Noite 3 4 pessoas 12",
  ],
};

export function splitInclusiveVat(
  grossCents: number,
  vatPercent: number
): { netCents: number; vatCents: number } {
  const netCents = Math.round(grossCents / (1 + vatPercent / 100));
  return { netCents, vatCents: grossCents - netCents };
}

export function formatVatDescription(grossCents: number, vatPercent: number): string {
  const { netCents, vatCents } = splitInclusiveVat(grossCents, vatPercent);
  return `${(netCents / 100).toFixed(2)}€ Iva ${vatPercent}% ${(vatCents / 100).toFixed(2)}€`;
}

export function occupancyBucket(numGuests: number): OccupancyBucket {
  return numGuests <= 2 ? "2" : "3_4";
}

export function nightArticleForSeason(
  season: RateSeason,
  occupancy: OccupancyBucket
): MoloniArticle {
  const winter = occupancy === "2" ? "noite-inverno-2" : "noite-inverno-34";
  const summer = occupancy === "2" ? "noite-verao-2" : "noite-verao-34";
  const august = occupancy === "2" ? "noite-agosto-2" : "noite-agosto-34";
  if (season === "august") return MOLONI_ARTICLES[august];
  if (season === "summer") return MOLONI_ARTICLES[summer];
  return MOLONI_ARTICLES[winter];
}

export function accountingLinesTotalCents(lines: AccountingLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitAmountCents * line.quantity, 0);
}

function pushLine(
  buckets: Map<string, AccountingLine>,
  line: AccountingLine
): void {
  if (line.quantity <= 0 || line.unitAmountCents < 0) return;
  const key = `${line.sku}:${line.unitAmountCents}:${line.vatPercent}`;
  const existing = buckets.get(key);
  if (existing) {
    existing.quantity += line.quantity;
    return;
  }
  buckets.set(key, { ...line });
}

function articleLine(article: MoloniArticle, quantity: number, unitAmountCents = article.unitAmountCents): AccountingLine {
  return {
    sku: article.sku,
    name: article.name,
    description: formatVatDescription(unitAmountCents, article.vatPercent),
    unitAmountCents,
    quantity,
    vatPercent: article.vatPercent,
  };
}

export function accountingLinesFromNights(nights: StayNightParts[]): AccountingLine[] {
  const buckets = new Map<string, AccountingLine>();

  for (const night of nights) {
    const nightArticle = nightArticleForSeason(night.season, night.occupancy);
    pushLine(buckets, articleLine(nightArticle, 1, night.nightCentsWithoutElectricity));

    if (night.extraGuestCount > 0 && night.extraGuestUnitCents > 0) {
      pushLine(
        buckets,
        articleLine(MOLONI_ARTICLES["extra-person"], night.extraGuestCount, night.extraGuestUnitCents)
      );
    }

    if (night.electricityAmperage === 10) {
      pushLine(
        buckets,
        articleLine(MOLONI_ARTICLES["elec-10a"], 1, night.electricity10aCents)
      );
    } else if (night.electricityAmperage === 6) {
      pushLine(
        buckets,
        articleLine(MOLONI_ARTICLES["elec-6a"], 1, night.electricity6aCents)
      );
    }

    if (night.over10m && night.over10mCents > 0) {
      pushLine(buckets, articleLine(MOLONI_ARTICLES["over-10m"], 1, night.over10mCents));
    }

    for (const manual of night.manuals) {
      if (manual.amountCents <= 0) continue;
      pushLine(buckets, {
        sku: `manual:${manual.name}`,
        name: manual.name,
        description: formatVatDescription(manual.amountCents, VAT_ACCOMMODATION_PERCENT),
        unitAmountCents: manual.amountCents,
        quantity: 1,
        vatPercent: VAT_ACCOMMODATION_PERCENT,
      });
    }
  }

  const order = MOLONI_ARTICLE_LIST.map((article) => article.sku);
  return [...buckets.values()].sort((a, b) => {
    const ai = order.indexOf(a.sku as MoloniArticleSku);
    const bi = order.indexOf(b.sku as MoloniArticleSku);
    const aRank = ai === -1 ? 100 : ai;
    const bRank = bi === -1 ? 100 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}
