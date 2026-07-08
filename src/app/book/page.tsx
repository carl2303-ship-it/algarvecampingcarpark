import BookPageContent from "@/components/pages/book-page";

export default function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  return <BookPageContent locale="pt" searchParams={searchParams} />;
}
