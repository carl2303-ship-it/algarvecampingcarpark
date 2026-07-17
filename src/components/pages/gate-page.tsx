import Link from "next/link";
import { Clock, Mail, MapPin, Phone, QrCode } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { buttonVariants } from "@/components/ui/button";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_ALT,
  CONTACT_PHONE_ALT_RAW,
  CONTACT_PHONE_RAW,
  formatReceptionHours,
  MAPS_URL,
  type Locale,
} from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { localePath } from "@/lib/locale-path";
import {
  getParkSettings,
  isWithinReceptionHours,
} from "@/lib/park-settings";
import { cn } from "@/lib/utils";

export default async function GatePageContent({
  locale,
  fromQr = false,
}: {
  locale: Locale;
  fromQr?: boolean;
}) {
  const parkSettings = await getParkSettings();
  const receptionOpen = isWithinReceptionHours(parkSettings);
  const t = getTranslations(locale);
  const g = t.gate;

  const contactPath = localePath(locale, "/contact");
  const homePath = localePath(locale, "/");
  const bookGatePath = `${localePath(locale, "/book")}?from=qr`;
  const receptionHours = formatReceptionHours(parkSettings, locale);

  return (
    <MarketingLayout locale={locale}>
      <PageHero
        eyebrow={fromQr ? g.qr_eyebrow : g.eyebrow}
        title={receptionOpen ? g.title_open : g.title_closed}
        description={receptionOpen ? g.desc_open : g.desc_closed}
        className="!pb-10"
      />

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-lg space-y-6">
          {fromQr ? (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
              <QrCode className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>{g.qr_hint}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <Clock className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {g.reception_hours}
                </p>
                <p className="font-heading text-lg font-semibold">{receptionHours}</p>
                <p className="text-sm text-muted-foreground">
                  {receptionOpen ? g.reception_now_open : g.reception_now_closed}
                </p>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">{g.help_text}</p>

            <div className="flex flex-col gap-3">
              <a
                href={`tel:${CONTACT_PHONE_RAW}`}
                className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>{CONTACT_PHONE}</span>
              </a>
              <a
                href={`tel:${CONTACT_PHONE_ALT_RAW}`}
                className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>{CONTACT_PHONE_ALT}</span>
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>{CONTACT_EMAIL}</span>
              </a>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              {fromQr ? (
                <Link href={bookGatePath} className={cn(buttonVariants(), "w-full")}>
                  {g.book_required}
                </Link>
              ) : null}
              <Link href={contactPath} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                {g.contact_page}
              </Link>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
              >
                <MapPin className="h-4 w-4" />
                {g.open_maps}
              </a>
              <Link href={homePath} className="text-center text-sm text-muted-foreground hover:text-foreground">
                {g.view_site}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
