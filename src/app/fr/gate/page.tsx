import GatePageContent from "@/components/pages/gate-page";

export const dynamic = "force-dynamic";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  return <GatePageContent locale="fr" fromQr={params.from === "qr"} />;
}
