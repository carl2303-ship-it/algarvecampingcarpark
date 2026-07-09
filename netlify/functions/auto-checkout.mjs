export default async () => {
  const baseUrl = process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl || !secret) {
    console.error("auto-checkout scheduled: missing URL or CRON_SECRET");
    return new Response("Missing configuration", { status: 500 });
  }

  const response = await fetch(`${baseUrl}/api/cron/auto-checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  console.log("auto-checkout scheduled:", response.status, body);
  return new Response(body, { status: response.status });
};

export const config = {
  schedule: "0 * * * *",
};
