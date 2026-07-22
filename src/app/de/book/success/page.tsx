import BookSuccessPageContent from "@/components/pages/book-success-page";

export default function BookSuccessPageLocalized({
  searchParams,
}: {
  searchParams: Promise<{ extended?: string; from?: string; ref?: string }>;
}) {
  return <BookSuccessPageContent locale="de" searchParams={searchParams} />;
}
