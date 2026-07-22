/**
 * Netlify scheduled function — runs daily at 08:00 UTC (~09:00 Lisbon in summer).
 * Calls the Next.js cron route with CRON_SECRET.
 */
export default async () => {
  const baseUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl) {
    console.error("pre-arrival scheduled: missing site URL (URL / DEPLOY_PRIME_URL / NEXT_PUBLIC_APP_URL)");
    return new Response(JSON.stringify({ error: "Missing site URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!secret) {
    console.error("pre-arrival scheduled: missing CRON_SECRET");
    return new Response(JSON.stringify({ error: "Missing CRON_SECRET" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/cron/pre-arrival`;
  console.log("pre-arrival scheduled: calling", endpoint);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  const body = await response.text();
  console.log("pre-arrival scheduled:", response.status, body);

  return new Response(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  schedule: "0 8 * * *",
};
