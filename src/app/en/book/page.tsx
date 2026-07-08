import BookPageContent from "@/components/pages/book-page";

export default function BookPageEn({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  return <BookPageContent locale="en" searchParams={searchParams} />;
}
