import BookPageContent from "@/components/pages/book-page";

export const dynamic = "force-dynamic";

export default function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; pitch?: string }>;
}) {
  return <BookPageContent locale="pt" searchParams={searchParams} />;
}
