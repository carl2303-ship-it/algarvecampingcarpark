import StayPageContent from "@/components/pages/stay-page";

export const dynamic = "force-dynamic";

export default async function StayPageFr({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StayPageContent locale="fr" token={token} />;
}
