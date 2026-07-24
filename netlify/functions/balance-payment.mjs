/**
 * Netlify scheduled function — daily at 07:00 UTC (~08:00 Lisbon in summer).
 * Sends Stripe balance-payment links ~48h before check-in.
 */
export default async () => {
  const baseUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) {
    console.error("balance-payment scheduled: missing site URL");
    return new Response(JSON.stringify({ error: "Missing site URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!secret) {
    console.error("balance-payment scheduled: missing CRON_SECRET");
    return new Response(JSON.stringify({ error: "Missing CRON_SECRET" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/cron/balance-payment`;
  console.log("balance-payment scheduled: calling", endpoint);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.text();
  console.log("balance-payment scheduled:", response.status, body);

  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  schedule: "0 7 * * *",
};
