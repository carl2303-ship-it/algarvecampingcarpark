import StayPageContent from "@/components/pages/stay-page";

export const dynamic = "force-dynamic";

export default async function StayPageEn({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <StayPageContent locale="en" token={token} />;
}
