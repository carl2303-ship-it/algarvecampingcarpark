import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { buttonVariants } from "@/components/ui/button";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_RAW } from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BookingDisabledView({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const contactPath = locale === "en" ? "/en/contact" : "/contact";
  const homePath = locale === "en" ? "/en" : "/";

  return (
    <MarketingLayout locale={locale}>
      <PageHero eyebrow="ASA · Algarve" title={t.book.unavailable_title} />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm space-y-6">
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t.book.unavailable_message}
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>{CONTACT_EMAIL}</span>
              </a>
              <a
                href={`tel:${CONTACT_PHONE_RAW}`}
                className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>{CONTACT_PHONE}</span>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={contactPath} className={cn(buttonVariants(), "sm:flex-1")}>
                {t.book.unavailable_contact}
              </Link>
              <Link
                href={homePath}
                className={cn(buttonVariants({ variant: "outline" }), "sm:flex-1")}
              >
                {t.book.unavailable_back}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
