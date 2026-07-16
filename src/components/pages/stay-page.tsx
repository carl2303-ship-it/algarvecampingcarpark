import { MarketingLayout } from "@/components/layout/marketing-layout";
import { StayExtendForm, type StaySummary } from "@/components/booking/stay-extend-form";
import { PageHero } from "@/components/marketing/sections";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { getReservationForStay } from "@/lib/stay-extension";
import { verifyStayToken } from "@/lib/stay-token";

export default async function StayPageContent({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = getTranslations(locale);
  const payload = verifyStayToken(decodeURIComponent(token));

  if (!payload) {
    return (
      <MarketingLayout locale={locale}>
        <PageHero eyebrow="ASA · Algarve" title={t.stay.invalid_title} description={t.stay.invalid_message} />
      </MarketingLayout>
    );
  }

  let stay: StaySummary | null = null;
  try {
    const reservation = await getReservationForStay(payload.reservationId);
    if (reservation) {
      const zoneRaw = reservation.zone as { name: string } | { name: string }[] | null;
      const zoneName = Array.isArray(zoneRaw) ? zoneRaw[0]?.name : zoneRaw?.name;
      stay = {
        guest_name: reservation.guest_name,
        pitch_code: reservation.pitch_code,
        zone_name: zoneName ?? "—",
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        num_guests: reservation.num_guests,
        total_cents: reservation.total_cents,
        paid_cents: reservation.paid_cents ?? 0,
        status: reservation.status,
        can_extend: ["confirmed", "checked_in"].includes(reservation.status),
      };
    }
  } catch (error) {
    console.error("Stay page load error:", error);
  }

  if (!stay) {
    return (
      <MarketingLayout locale={locale}>
        <PageHero eyebrow="ASA · Algarve" title={t.stay.invalid_title} description={t.stay.invalid_message} />
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout locale={locale}>
      <PageHero
        eyebrow="ASA · Algarve"
        title={t.stay.title}
        description={t.stay.description}
        className="!pb-10"
      />
      <div className="container mx-auto px-4 pb-20 -mt-6 relative z-10">
        <StayExtendForm locale={locale} token={token} stay={stay} />
      </div>
    </MarketingLayout>
  );
}
