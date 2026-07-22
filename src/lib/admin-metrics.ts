import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { paymentMethodLabel } from "@/lib/admin-payment-methods";
import { formatPrice } from "@/lib/pricing";

export type MetricsPeriod = {
  start: string;
  end: string;
};

export type PeriodSnapshot = {
  reservationsCount: number;
  paymentsTotalCents: number;
  paymentsCount: number;
  byMethod: Array<{ method: string; label: string; totalCents: number; count: number }>;
  byClient: Array<{
    vehiclePlate: string;
    guestName: string;
    totalCents: number;
    paymentsCount: number;
    reservationsCount: number;
  }>;
};

export type MetricsComparison = {
  current: PeriodSnapshot;
  previous: PeriodSnapshot;
  previousPeriod: MetricsPeriod;
  deltas: {
    reservationsCount: number;
    reservationsPct: number | null;
    paymentsTotalCents: number;
    paymentsTotalPct: number | null;
    paymentsCount: number;
    paymentsCountPct: number | null;
  };
};

export type DailyReportRow = {
  id: string;
  report_date: string;
  period_start: string;
  period_end: string;
  transaction_count: number;
  total_cents: number;
  created_at: string;
};

export type PaymentTransactionRow = {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  created_at: string;
  vehicle_plate: string | null;
  guest_name: string;
  country: string | null;
};

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: string, end: string): number {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const a = Date.UTC(ys, ms - 1, ds);
  const b = Date.UTC(ye, me - 1, de);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

export function previousEquivalentPeriod(period: MetricsPeriod): MetricsPeriod {
  const length = daysBetweenInclusive(period.start, period.end);
  const prevEnd = addDays(period.start, -1);
  const prevStart = addDays(prevEnd, -(length - 1));
  return { start: prevStart, end: prevEnd };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function lisbonOffsetForDay(day: string): string {
  const probe = new Date(`${day}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    timeZoneName: "shortOffset",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(probe);
  const tz = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
  const match = tz.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
  if (!match) return "+00:00";
  const hours = Number(match[1]);
  const mins = match[2] ? Number(match[2]) : 0;
  const negative = String(match[1]).startsWith("-");
  const sign = negative ? "-" : "+";
  return `${sign}${String(Math.abs(hours)).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function periodBounds(period: MetricsPeriod): { startIso: string; endIsoExclusive: string } {
  const startIso = new Date(
    `${period.start}T00:00:00${lisbonOffsetForDay(period.start)}`
  ).toISOString();
  const endExclusiveDay = addDays(period.end, 1);
  const endIsoExclusive = new Date(
    `${endExclusiveDay}T00:00:00${lisbonOffsetForDay(endExclusiveDay)}`
  ).toISOString();
  return { startIso, endIsoExclusive };
}

type PaymentRow = {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  created_at: string;
  reservation_id: string;
};

type ReservationLite = {
  id: string;
  guest_name: string;
  vehicle_plate: string | null;
  guest_id: string | null;
  created_at: string;
};

async function loadCountryByGuestId(
  supabase: SupabaseClient,
  guestIds: string[]
): Promise<Map<string, string | null>> {
  const unique = [...new Set(guestIds.filter(Boolean))];
  const map = new Map<string, string | null>();
  if (unique.length === 0) return map;

  const { data } = await supabase.from("guests").select("id, country").in("id", unique);
  for (const guest of data ?? []) {
    map.set(guest.id, guest.country);
  }
  return map;
}

async function loadPaymentsWindow(
  supabase: SupabaseClient,
  startIso: string,
  endIsoExclusive: string
): Promise<{
  payments: PaymentRow[];
  reservationsById: Map<string, ReservationLite>;
  countryByGuestId: Map<string, string | null>;
}> {
  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, amount_cents, payment_method, created_at, reservation_id")
    .eq("status", "succeeded")
    .gte("created_at", startIso)
    .lt("created_at", endIsoExclusive)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const reservationIds = [...new Set((payments ?? []).map((p) => p.reservation_id))];
  const reservationsById = new Map<string, ReservationLite>();

  if (reservationIds.length > 0) {
    const { data: reservations, error: reservationError } = await supabase
      .from("reservations")
      .select("id, guest_name, vehicle_plate, guest_id, created_at")
      .in("id", reservationIds);
    if (reservationError) throw reservationError;
    for (const reservation of (reservations ?? []) as ReservationLite[]) {
      reservationsById.set(reservation.id, reservation);
    }
  }

  const countryByGuestId = await loadCountryByGuestId(
    supabase,
    [...reservationsById.values()].map((r) => r.guest_id ?? "")
  );

  return {
    payments: (payments ?? []) as PaymentRow[],
    reservationsById,
    countryByGuestId,
  };
}

export async function buildPeriodSnapshot(
  supabase: SupabaseClient,
  period: MetricsPeriod
): Promise<PeriodSnapshot> {
  const { startIso, endIsoExclusive } = periodBounds(period);

  const [{ payments, reservationsById }, reservationsCreated] = await Promise.all([
    loadPaymentsWindow(supabase, startIso, endIsoExclusive),
    supabase
      .from("reservations")
      .select("id, guest_name, vehicle_plate, created_at")
      .gte("created_at", startIso)
      .lt("created_at", endIsoExclusive)
      .then(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
  ]);

  const byMethodMap = new Map<string, { totalCents: number; count: number }>();
  const byClientMap = new Map<
    string,
    {
      vehiclePlate: string;
      guestName: string;
      totalCents: number;
      paymentsCount: number;
      reservationIds: Set<string>;
    }
  >();

  let paymentsTotalCents = 0;

  for (const payment of payments) {
    const method = payment.payment_method || "unknown";
    const methodRow = byMethodMap.get(method) ?? { totalCents: 0, count: 0 };
    methodRow.totalCents += payment.amount_cents;
    methodRow.count += 1;
    byMethodMap.set(method, methodRow);
    paymentsTotalCents += payment.amount_cents;

    const reservation = reservationsById.get(payment.reservation_id);
    const plate = reservation?.vehicle_plate || "—";
    const name = reservation?.guest_name || "—";
    const key = `${plate}::${name}`.toUpperCase();
    const client = byClientMap.get(key) ?? {
      vehiclePlate: plate,
      guestName: name,
      totalCents: 0,
      paymentsCount: 0,
      reservationIds: new Set<string>(),
    };
    client.totalCents += payment.amount_cents;
    client.paymentsCount += 1;
    if (reservation) client.reservationIds.add(reservation.id);
    byClientMap.set(key, client);
  }

  for (const reservation of reservationsCreated) {
    const plate = reservation.vehicle_plate || "—";
    const key = `${plate}::${reservation.guest_name}`.toUpperCase();
    const client = byClientMap.get(key) ?? {
      vehiclePlate: plate,
      guestName: reservation.guest_name,
      totalCents: 0,
      paymentsCount: 0,
      reservationIds: new Set<string>(),
    };
    client.reservationIds.add(reservation.id);
    byClientMap.set(key, client);
  }

  return {
    reservationsCount: reservationsCreated.length,
    paymentsTotalCents,
    paymentsCount: payments.length,
    byMethod: [...byMethodMap.entries()]
      .map(([method, row]) => ({
        method,
        label: method === "unknown" ? "—" : paymentMethodLabel(method),
        totalCents: row.totalCents,
        count: row.count,
      }))
      .sort((a, b) => b.totalCents - a.totalCents),
    byClient: [...byClientMap.values()]
      .map((row) => ({
        vehiclePlate: row.vehiclePlate,
        guestName: row.guestName,
        totalCents: row.totalCents,
        paymentsCount: row.paymentsCount,
        reservationsCount: row.reservationIds.size,
      }))
      .sort((a, b) => b.totalCents - a.totalCents),
  };
}

export async function getMetricsComparison(
  supabase: SupabaseClient,
  period: MetricsPeriod
): Promise<MetricsComparison> {
  const previousPeriod = previousEquivalentPeriod(period);
  const [current, previous] = await Promise.all([
    buildPeriodSnapshot(supabase, period),
    buildPeriodSnapshot(supabase, previousPeriod),
  ]);

  return {
    current,
    previous,
    previousPeriod,
    deltas: {
      reservationsCount: current.reservationsCount - previous.reservationsCount,
      reservationsPct: pctChange(current.reservationsCount, previous.reservationsCount),
      paymentsTotalCents: current.paymentsTotalCents - previous.paymentsTotalCents,
      paymentsTotalPct: pctChange(current.paymentsTotalCents, previous.paymentsTotalCents),
      paymentsCount: current.paymentsCount - previous.paymentsCount,
      paymentsCountPct: pctChange(current.paymentsCount, previous.paymentsCount),
    },
  };
}

function formatLisbonDateTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export async function fetchTransactionsForWindow(
  supabase: SupabaseClient,
  periodStart: Date,
  periodEnd: Date
): Promise<PaymentTransactionRow[]> {
  const { payments, reservationsById, countryByGuestId } = await loadPaymentsWindow(
    supabase,
    periodStart.toISOString(),
    periodEnd.toISOString()
  );

  return payments.map((payment) => {
    const reservation = reservationsById.get(payment.reservation_id);
    const country = reservation?.guest_id
      ? (countryByGuestId.get(reservation.guest_id) ?? null)
      : null;
    return {
      id: payment.id,
      amount_cents: payment.amount_cents,
      payment_method: payment.payment_method,
      created_at: payment.created_at,
      vehicle_plate: reservation?.vehicle_plate ?? null,
      guest_name: reservation?.guest_name ?? "—",
      country,
    };
  });
}

export async function buildDailyTransactionsPdf(params: {
  reportDate: string;
  periodStart: Date;
  periodEnd: Date;
  transactions: PaymentTransactionRow[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  page.drawText("Algarve Camping Car Park — Transactions 24h", {
    x: margin,
    y,
    size: 14,
    font: bold,
  });
  y -= 18;
  page.drawText(`Rapport du ${params.reportDate} (heure de Lisbonne)`, {
    x: margin,
    y,
    size: 10,
    font,
  });
  y -= 14;
  page.drawText(
    `Periode : ${formatLisbonDateTime(params.periodStart.toISOString())} -> ${formatLisbonDateTime(params.periodEnd.toISOString())}`,
    { x: margin, y, size: 9, font }
  );
  y -= 14;
  const total = params.transactions.reduce((sum, row) => sum + row.amount_cents, 0);
  page.drawText(
    `${params.transactions.length} transaction(s) — Total ${formatPrice(total)}`,
    { x: margin, y, size: 10, font: bold }
  );
  y -= 20;

  const cols = [
    { label: "Heure", x: margin, width: 95 },
    { label: "Immat.", x: margin + 95, width: 75 },
    { label: "Nom", x: margin + 170, width: 120 },
    { label: "Pays", x: margin + 290, width: 70 },
    { label: "Montant", x: margin + 360, width: 70 },
    { label: "Methode", x: margin + 430, width: 90 },
  ];

  ensureSpace(24);
  for (const col of cols) {
    page.drawText(col.label, {
      x: col.x,
      y,
      size: 8,
      font: bold,
      color: rgb(0.25, 0.25, 0.25),
    });
  }
  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.8,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 14;

  if (params.transactions.length === 0) {
    page.drawText("Aucune transaction sur les dernieres 24 heures.", {
      x: margin,
      y,
      size: 10,
      font,
    });
  } else {
    for (const row of params.transactions) {
      ensureSpace(16);
      const values = [
        formatLisbonDateTime(row.created_at),
        row.vehicle_plate || "—",
        row.guest_name || "—",
        row.country || "—",
        formatPrice(row.amount_cents),
        paymentMethodLabel(row.payment_method),
      ];
      values.forEach((value, index) => {
        const col = cols[index];
        const clipped = value.length > 28 ? `${value.slice(0, 27)}...` : value;
        page.drawText(clipped, {
          x: col.x,
          y,
          size: 8,
          font,
          maxWidth: col.width - 4,
        });
      });
      y -= 14;
    }
  }

  return pdf.save();
}

export async function generateAndStoreDailyPaymentReport(
  supabase: SupabaseClient,
  options?: { force?: boolean; at?: Date }
): Promise<{
  report_date: string;
  transaction_count: number;
  total_cents: number;
  created: boolean;
  id: string;
}> {
  const at = options?.at ?? new Date();
  const reportDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  const periodEnd = at;
  const periodStart = new Date(at.getTime() - 24 * 60 * 60 * 1000);

  if (!options?.force) {
    const { data: existing } = await supabase
      .from("daily_payment_reports")
      .select("id, transaction_count, total_cents, report_date")
      .eq("report_date", reportDate)
      .maybeSingle();
    if (existing) {
      return {
        id: existing.id,
        report_date: existing.report_date,
        transaction_count: existing.transaction_count,
        total_cents: existing.total_cents,
        created: false,
      };
    }
  }

  const transactions = await fetchTransactionsForWindow(supabase, periodStart, periodEnd);
  const pdfBytes = await buildDailyTransactionsPdf({
    reportDate,
    periodStart,
    periodEnd,
    transactions,
  });
  const totalCents = transactions.reduce((sum, row) => sum + row.amount_cents, 0);
  const payload = {
    report_date: reportDate,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    transaction_count: transactions.length,
    total_cents: totalCents,
    pdf_base64: Buffer.from(pdfBytes).toString("base64"),
  };

  const { data, error } = await supabase
    .from("daily_payment_reports")
    .upsert(payload, { onConflict: "report_date" })
    .select("id, report_date, transaction_count, total_cents")
    .single();

  if (error || !data) throw error ?? new Error("Impossible d'enregistrer le rapport PDF");

  return {
    id: data.id,
    report_date: data.report_date,
    transaction_count: data.transaction_count,
    total_cents: data.total_cents,
    created: true,
  };
}

export async function listDailyPaymentReports(
  supabase: SupabaseClient,
  limit = 30
): Promise<DailyReportRow[]> {
  const { data, error } = await supabase
    .from("daily_payment_reports")
    .select("id, report_date, period_start, period_end, transaction_count, total_cents, created_at")
    .order("report_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DailyReportRow[];
}

export function defaultMetricsPeriod(): MetricsPeriod {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return { start: addDays(today, -29), end: today };
}
