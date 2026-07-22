import { MarketingLayout } from "@/components/layout/marketing-layout";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { ReceptionIntakeForm } from "@/components/booking/reception-intake-form";
import { BookingDisabledView } from "@/components/booking/booking-disabled-view";
import { PageHero } from "@/components/marketing/sections";
import { Toaster } from "@/components/ui/sonner";
import type { Locale } from "@/lib/constants";
import {
  allowsPublicBooking,
  isDeskQrEntry,
  isGateQrEntry,
  isReceptionQrEntry,
} from "@/lib/gate-entry";
import { getTranslations } from "@/lib/i18n";
import { getTermsContent } from "@/lib/legal/terms-content";
import { getPitchMapSpotByCode } from "@/lib/pitch-map";
import { getParkSettings } from "@/lib/park-settings";
import type { PitchMapSpot } from "@/lib/park-pitch-map-defaults";
import { ClipboardList, QrCode } from "lucide-react";

export default async function BookPageContent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ cancelled?: string; pitch?: string; from?: string }>;
}) {
  const params = await searchParams;
  const gateEntry = isGateQrEntry(params.from);
  const receptionEntry = isReceptionQrEntry(params.from);
  const deskEntry = isDeskQrEntry(params.from);
  const parkSettings = await getParkSettings();

  if (!allowsPublicBooking(parkSettings, deskEntry)) {
    return <BookingDisabledView locale={locale} />;
  }

  const t = getTranslations(locale);
  const termsContent = getTermsContent(locale, parkSettings);
  const preferredSpot: PitchMapSpot | null =
    !receptionEntry && params.pitch
      ? await getPitchMapSpotByCode(params.pitch.toUpperCase())
      : null;

  const eyebrow = gateEntry
    ? t.book.gate_entry_eyebrow
    : receptionEntry
      ? t.book.reception_entry_eyebrow
      : "ASA · Algarve";
  const title = gateEntry
    ? t.book.gate_entry_title
    : receptionEntry
      ? t.book.reception_entry_title
      : t.book.title;
  const description = gateEntry
    ? t.book.gate_entry_message
    : receptionEntry
      ? t.book.reception_entry_message
      : t.book.hero_description;

  const content = (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={description} className="!pb-10" />
      <div className="container mx-auto px-4 pb-20 -mt-6 relative z-10">
        {gateEntry ? (
          <div className="max-w-3xl mx-auto mb-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-primary">
            <QrCode className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="leading-relaxed">{t.book.gate_entry_required}</p>
          </div>
        ) : null}
        {receptionEntry ? (
          <div className="max-w-3xl mx-auto mb-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-primary">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="leading-relaxed">{t.book.reception_entry_required}</p>
          </div>
        ) : null}
        {params.cancelled && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-center text-amber-900">
            {t.book.cancelled}
          </div>
        )}
        {receptionEntry ? (
          <ReceptionIntakeForm
            locale={locale}
            parkSettings={parkSettings}
            termsContent={termsContent}
          />
        ) : (
          <BookingWizard
            locale={locale}
            preferredSpot={preferredSpot}
            parkSettings={parkSettings}
            gateEntry={gateEntry}
            termsContent={termsContent}
          />
        )}
      </div>
    </>
  );

  if (deskEntry) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col">
        <main className="flex-1">{content}</main>
        <Toaster />
      </div>
    );
  }

  return <MarketingLayout locale={locale}>{content}</MarketingLayout>;
}
