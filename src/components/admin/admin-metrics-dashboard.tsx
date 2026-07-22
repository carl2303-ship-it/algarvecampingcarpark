"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, FileText, Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminT } from "@/lib/admin-i18n";
import type { DailyReportRow, MetricsComparison, MetricsPeriod } from "@/lib/admin-metrics";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type MetricsResponse = MetricsComparison & { period: MetricsPeriod };

function formatDelta(value: number, pct: number | null, money = false) {
  const sign = value > 0 ? "+" : "";
  const amount = money ? formatPrice(value) : String(value);
  const pctLabel = pct == null ? "n/a" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  return `${sign}${amount} (${pctLabel})`;
}

function DeltaBadge({
  value,
  pct,
  money = false,
}: {
  value: number;
  pct: number | null;
  money?: boolean;
}) {
  const positive = value > 0;
  const neutral = value === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        neutral && "text-muted-foreground",
        positive && "text-emerald-700",
        !positive && !neutral && "text-rose-700"
      )}
    >
      {!neutral && (positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />)}
      {formatDelta(value, pct, money)}
    </span>
  );
}

export function AdminMetricsDashboard({
  initialPeriod,
  initialMetrics,
  initialReports,
}: {
  initialPeriod: MetricsPeriod;
  initialMetrics: MetricsComparison;
  initialReports: DailyReportRow[];
}) {
  const [start, setStart] = useState(initialPeriod.start);
  const [end, setEnd] = useState(initialPeriod.end);
  const [metrics, setMetrics] = useState<MetricsResponse>({
    period: initialPeriod,
    ...initialMetrics,
  });
  const [reports, setReports] = useState(initialReports);
  const [loading, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);

  const methodRows = useMemo(() => {
    const methods = new Set([
      ...metrics.current.byMethod.map((row) => row.method),
      ...metrics.previous.byMethod.map((row) => row.method),
    ]);
    return [...methods].map((method) => {
      const current =
        metrics.current.byMethod.find((row) => row.method === method) ?? {
          method,
          label: method === "unknown" ? "—" : method,
          totalCents: 0,
          count: 0,
        };
      const previous =
        metrics.previous.byMethod.find((row) => row.method === method) ?? {
          method,
          label: current.label,
          totalCents: 0,
          count: 0,
        };
      const delta = current.totalCents - previous.totalCents;
      const pct =
        previous.totalCents === 0
          ? current.totalCents === 0
            ? 0
            : null
          : (delta / previous.totalCents) * 100;
      return { current, previous, delta, pct };
    });
  }, [metrics]);

  function reloadMetrics(nextStart = start, nextEnd = end) {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/metrics?start=${encodeURIComponent(nextStart)}&end=${encodeURIComponent(nextEnd)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? adminT.metrics.loadError);
        setMetrics(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : adminT.metrics.loadError);
      }
    });
  }

  async function refreshReports() {
    const res = await fetch("/api/admin/metrics/daily-reports");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setReports(data.reports ?? []);
  }

  async function generateNow() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/metrics/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? adminT.metrics.pdfGenerateError);
      toast.success(adminT.metrics.pdfGenerated);
      await refreshReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : adminT.metrics.pdfGenerateError);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{adminT.metrics.periodTitle}</CardTitle>
          <CardDescription>{adminT.metrics.periodHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <Label htmlFor="metrics_start">{adminT.metrics.start}</Label>
            <Input
              id="metrics_start"
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="metrics_end">{adminT.metrics.end}</Label>
            <Input
              id="metrics_end"
              type="date"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            type="button"
            onClick={() => reloadMetrics()}
            disabled={loading || !start || !end || end < start}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {adminT.metrics.applyPeriod}
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {adminT.metrics.comparedTo
          .replace("{start}", metrics.previousPeriod.start)
          .replace("{end}", metrics.previousPeriod.end)}
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{adminT.metrics.reservations}</CardDescription>
            <CardTitle className="text-3xl">{metrics.current.reservationsCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <DeltaBadge
              value={metrics.deltas.reservationsCount}
              pct={metrics.deltas.reservationsPct}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {adminT.metrics.previousValue.replace(
                "{value}",
                String(metrics.previous.reservationsCount)
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{adminT.metrics.paymentsTotal}</CardDescription>
            <CardTitle className="text-3xl">
              {formatPrice(metrics.current.paymentsTotalCents)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeltaBadge
              value={metrics.deltas.paymentsTotalCents}
              pct={metrics.deltas.paymentsTotalPct}
              money
            />
            <p className="text-xs text-muted-foreground mt-1">
              {adminT.metrics.previousValue.replace(
                "{value}",
                formatPrice(metrics.previous.paymentsTotalCents)
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{adminT.metrics.paymentsCount}</CardDescription>
            <CardTitle className="text-3xl">{metrics.current.paymentsCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <DeltaBadge
              value={metrics.deltas.paymentsCount}
              pct={metrics.deltas.paymentsCountPct}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {adminT.metrics.previousValue.replace(
                "{value}",
                String(metrics.previous.paymentsCount)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{adminT.metrics.byMethodTitle}</CardTitle>
          <CardDescription>{adminT.metrics.byMethodHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{adminT.metrics.method}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.current}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.previous}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.variation}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methodRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {adminT.metrics.emptyPayments}
                    </TableCell>
                  </TableRow>
                ) : (
                  methodRows.map((row) => (
                    <TableRow key={row.current.method}>
                      <TableCell className="font-medium">
                        {row.current.label}
                        <span className="block text-xs text-muted-foreground">
                          {row.current.count} {adminT.metrics.transactions}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(row.current.totalCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(row.previous.totalCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeltaBadge value={row.delta} pct={row.pct} money />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{adminT.metrics.byClientTitle}</CardTitle>
          <CardDescription>{adminT.metrics.byClientHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{adminT.common.plate}</TableHead>
                  <TableHead>{adminT.clients.name}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.paymentsTotal}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.paymentsCount}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.reservations}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.current.byClient.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {adminT.metrics.emptyClients}
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.current.byClient.map((client) => (
                    <TableRow key={`${client.vehiclePlate}-${client.guestName}`}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {client.vehiclePlate}
                      </TableCell>
                      <TableCell>{client.guestName}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(client.totalCents)}
                      </TableCell>
                      <TableCell className="text-right">{client.paymentsCount}</TableCell>
                      <TableCell className="text-right">{client.reservationsCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{adminT.metrics.pdfTitle}</CardTitle>
            <CardDescription>{adminT.metrics.pdfHint}</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={generateNow} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {adminT.metrics.pdfGenerateNow}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{adminT.metrics.pdfDate}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.transactions}</TableHead>
                  <TableHead className="text-right">{adminT.metrics.paymentsTotal}</TableHead>
                  <TableHead>{adminT.reservations.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {adminT.metrics.pdfEmpty}
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.report_date}</TableCell>
                      <TableCell className="text-right">{report.transaction_count}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(report.total_cents)}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/api/admin/metrics/daily-reports/${report.id}`}
                          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                        >
                          <Download className="mr-1.5 h-4 w-4" />
                          {adminT.metrics.pdfDownload}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
