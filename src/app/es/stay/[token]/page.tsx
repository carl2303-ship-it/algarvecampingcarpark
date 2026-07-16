import StayPageContent from "@/components/pages/stay-page";

export const dynamic = "force-dynamic";

export default async function StayPageEs({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StayPageContent locale="es" token={token} />;
}
