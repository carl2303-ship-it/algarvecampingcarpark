import BookSuccessPageContent from "@/components/pages/book-success-page";

export default function BookSuccessPageLocalized({
  searchParams,
}: {
  searchParams: Promise<{ extended?: string; from?: string }>;
}) {
  return <BookSuccessPageContent locale="fr" searchParams={searchParams} />;
}
