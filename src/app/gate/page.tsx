import { redirect } from "next/navigation";
import GatePageContent from "@/components/pages/gate-page";
import { localePath } from "@/lib/locale-path";

export const dynamic = "force-dynamic";

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  if (params.from === "qr") {
    redirect(`${localePath("pt", "/book")}?from=qr`);
  }
  return <GatePageContent locale="pt" fromQr={false} />;
}
