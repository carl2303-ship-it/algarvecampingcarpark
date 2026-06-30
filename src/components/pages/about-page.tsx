import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { buttonVariants } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";

export default function AboutPageContent({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const prefix = locale === "en" ? "/en" : "";

  return (
    <MarketingLayout locale={locale}>
      <PageHero
        eyebrow="ASA · Algarve"
        title={t.about.title}
        description={t.about.description}
      />

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-8">
            {t.about.services_title}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {t.about.services.map((service) => (
              <div
                key={service}
                className="flex items-start gap-3 rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <p className="text-muted-foreground leading-relaxed">{service}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link href={`${prefix}/book`} className={buttonVariants({ size: "lg" })}>
              {locale === "pt" ? "Reservar o seu lugar" : "Book your pitch"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
