import { MarketingLayout } from "@/components/layout/marketing-layout";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { getTranslations } from "@/lib/i18n";

export default function BookPageEn({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  return <BookPageInner searchParams={searchParams} locale="en" />;
}

async function BookPageInner({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ cancelled?: string }>;
  locale: "pt" | "en";
}) {
  const params = await searchParams;
  const t = getTranslations(locale);

  return (
    <MarketingLayout locale={locale}>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8 text-center">{t.book.title}</h1>
        {params.cancelled && (
          <div className="max-w-3xl mx-auto mb-6 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-center">
            {t.book.cancelled}
          </div>
        )}
        <BookingWizard locale={locale} />
      </div>
    </MarketingLayout>
  );
}
