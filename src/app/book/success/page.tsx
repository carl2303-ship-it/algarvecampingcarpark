import BookSuccessPageContent from "@/components/pages/book-success-page";

export default function BookSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ extended?: string }>;
}) {
  return <BookSuccessPageContent locale="pt" searchParams={searchParams} />;
}
