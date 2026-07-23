/**
 * Netlify scheduled function — runs daily at 12:00 UTC (~13:00 Lisbon in summer).
 * Calls the Next.js cron route with CRON_SECRET to generate the 24h payments PDF.
 */
export default async () => {
  const baseUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) {
    console.error(
      "daily-payments-pdf scheduled: missing site URL (URL / DEPLOY_PRIME_URL / NEXT_PUBLIC_APP_URL)"
    );
    return new Response(JSON.stringify({ error: "Missing site URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!secret) {
    console.error("daily-payments-pdf scheduled: missing CRON_SECRET");
    return new Response(JSON.stringify({ error: "Missing CRON_SECRET" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/cron/daily-payments-pdf`;
  console.log("daily-payments-pdf scheduled: calling", endpoint);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.text();
  console.log("daily-payments-pdf scheduled:", response.status, body);

  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  schedule: "0 12 * * *",
};
