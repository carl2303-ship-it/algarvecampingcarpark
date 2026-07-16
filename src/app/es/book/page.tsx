import BookPageContent from "@/components/pages/book-page";

export const dynamic = "force-dynamic";

export default function BookPageLocalized({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; pitch?: string }>;
}) {
  return <BookPageContent locale="es" searchParams={searchParams} />;
}
