import { MarketingLayout } from "@/components/layout/marketing-layout";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { BookingDisabledView } from "@/components/booking/booking-disabled-view";
import { PageHero } from "@/components/marketing/sections";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { getPitchMapSpotByCode } from "@/lib/pitch-map";
import { getParkSettings, isOnlineBookingOpen } from "@/lib/park-settings";
import type { PitchMapSpot } from "@/lib/park-pitch-map-defaults";

export default async function BookPageContent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ cancelled?: string; pitch?: string }>;
}) {
  const parkSettings = await getParkSettings();

  if (!isOnlineBookingOpen(parkSettings)) {
    return <BookingDisabledView locale={locale} />;
  }

  const params = await searchParams;
  const t = getTranslations(locale);
  const preferredSpot: PitchMapSpot | null = params.pitch
    ? await getPitchMapSpotByCode(params.pitch.toUpperCase())
    : null;

  return (
    <MarketingLayout locale={locale}>
      <PageHero
        eyebrow="ASA · Algarve"
        title={t.book.title}
        description={t.book.hero_description}
        className="!pb-10"
      />
      <div className="container mx-auto px-4 pb-20 -mt-6 relative z-10">
        {params.cancelled && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-center text-amber-900">
            {t.book.cancelled}
          </div>
        )}
        <BookingWizard locale={locale} preferredSpot={preferredSpot} parkSettings={parkSettings} />
      </div>
    </MarketingLayout>
  );
}
