import { createClient } from "@supabase/supabase-js";
import { generateAndStoreDailyPaymentReport } from "../src/lib/admin-metrics.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const days = process.argv.slice(2);
const reportDates = days.length > 0 ? days : ["2026-11-22", "2026-11-25", "2026-11-26"];

for (const reportDate of reportDates) {
  const result = await generateAndStoreDailyPaymentReport(supabase, {
    force: true,
    reportDate,
  });
  console.log(JSON.stringify(result));
}
