import { MarketingLayout } from "@/components/layout/marketing-layout";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { PageHero } from "@/components/marketing/sections";
import { getTranslations } from "@/lib/i18n";

export default function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  return <BookPageInner searchParams={searchParams} locale="pt" />;
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
      <PageHero
        eyebrow="ASA · Algarve"
        title={t.book.title}
        description={
          locale === "pt"
            ? "Escolha as datas, selecione a zona e confirme a sua reserva em minutos."
            : "Choose your dates, select a zone and confirm your booking in minutes."
        }
        className="!pb-10"
      />
      <div className="container mx-auto px-4 pb-20 -mt-6 relative z-10">
        {params.cancelled && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-center text-amber-900">
            {t.book.cancelled}
          </div>
        )}
        <BookingWizard locale={locale} />
      </div>
    </MarketingLayout>
  );
}
