import { AdminMetricsDashboard } from "@/components/admin/admin-metrics-dashboard";
import { adminT } from "@/lib/admin-i18n";
import {
  defaultMetricsPeriod,
  getMetricsComparison,
  listDailyPaymentReports,
} from "@/lib/admin-metrics";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const supabase = createAdminClient();
  const period = defaultMetricsPeriod();
  const [metrics, reports] = await Promise.all([
    getMetricsComparison(supabase, period),
    listDailyPaymentReports(supabase, 60),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{adminT.metrics.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{adminT.metrics.subtitle}</p>
      </div>

      <AdminMetricsDashboard
        initialPeriod={period}
        initialMetrics={metrics}
        initialReports={reports}
      />
    </div>
  );
}
