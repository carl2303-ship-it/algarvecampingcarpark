"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { buttonVariants } from "@/components/ui/button";
import {
  formatEuroAmount,
  premiumPrice,
  PRICING_EXTRAS,
  PRICING_SEASONS,
  PREMIUM_SURCHARGE_EUR,
} from "@/lib/pricing-display";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";

function PriceCell({ amount, locale }: { amount: number; locale: Locale }) {
  return (
    <span className="font-heading text-lg font-semibold text-primary">
      {formatEuroAmount(amount, locale)}
    </span>
  );
}

function SeasonBlock({
  locale,
  season,
  labels,
}: {
  locale: Locale;
  season: (typeof PRICING_SEASONS)[number];
  labels: {
    twoPeople: string;
    threeFourPeople: string;
    premiumTitle: string;
    premiumElectricNote: string;
  };
}) {
  const title = locale === "en" ? season.titleEn : season.titlePt;
  const period = locale === "en" ? season.periodEn : season.periodPt;

  return (
    <article className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className={cn("bg-gradient-to-r px-6 py-5 text-white", season.gradient)}>
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            {season.emoji}
          </span>
          <div>
            <h2 className="font-heading text-2xl font-semibold">{title}</h2>
            <p className="text-sm text-white/90 mt-0.5">{period}</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {season.categories.map((category) => {
          const categoryLabel = locale === "en" ? category.labelEn : category.labelPt;
          const row = category.rows[0];

          return (
            <div key={category.id}>
              <h3 className="flex items-center gap-2 font-heading font-semibold mb-3">
                <span aria-hidden>{category.emoji}</span>
                {categoryLabel}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-muted-foreground mb-1">{labels.twoPeople}</p>
                  <PriceCell amount={row.twoPeople} locale={locale} />
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-muted-foreground mb-1">{labels.threeFourPeople}</p>
                  <PriceCell amount={row.threeFourPeople} locale={locale} />
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="font-heading font-semibold text-primary mb-1">{labels.premiumTitle}</h3>
          <p className="text-xs text-muted-foreground mb-3">{labels.premiumElectricNote}</p>
          {(() => {
            const electric = season.categories.find((c) => c.id === "electric");
            if (!electric) return null;
            const row = electric.rows[0];
            return (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-background/80 p-3 text-center">
                  <p className="text-muted-foreground text-xs mb-1">{labels.twoPeople}</p>
                  <PriceCell amount={premiumPrice(row.twoPeople)} locale={locale} />
                </div>
                <div className="rounded-lg bg-background/80 p-3 text-center">
                  <p className="text-muted-foreground text-xs mb-1">{labels.threeFourPeople}</p>
                  <PriceCell amount={premiumPrice(row.threeFourPeople)} locale={locale} />
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </article>
  );
}

export default function PricesPageContent({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const prefix = locale === "en" ? "/en" : "";
  const bookPath = `${prefix}/book`;

  const labels = {
    twoPeople: t.prices.two_people,
    threeFourPeople: t.prices.three_four_people,
    premiumTitle: t.prices.premium_zone,
    premiumElectricNote: t.prices.premium_electric_note.replace(
      "{amount}",
      formatEuroAmount(PREMIUM_SURCHARGE_EUR, locale)
    ),
  };

  return (
    <MarketingLayout locale={locale}>
      <PageHero eyebrow={t.prices.updated} title={t.prices.title} description={t.prices.subtitle} />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl space-y-8">
          {PRICING_SEASONS.map((season) => (
            <SeasonBlock key={season.id} locale={locale} season={season} labels={labels} />
          ))}

          <article className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold mb-4">{t.prices.rules_title}</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary shrink-0">•</span>
                {t.prices.extra_person}
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0">•</span>
                {t.prices.long_motorhome}
              </li>
              <li className="flex gap-2">
                <span className="text-primary shrink-0">•</span>
                {t.prices.children_free}
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold mb-2">{t.prices.extras_title}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t.prices.extras_desc}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {PRICING_EXTRAS.map((extra) => {
                const name = locale === "en" ? extra.nameEn : extra.namePt;
                const unit = locale === "en" ? extra.unitEn : extra.unitPt;
                return (
                  <div
                    key={extra.namePt}
                    className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span aria-hidden>{extra.emoji}</span>
                      {name}
                    </span>
                    <span className="font-semibold text-primary">
                      {formatEuroAmount(extra.price, locale)}
                      {unit && <span className="text-xs font-normal text-muted-foreground">{unit}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>

          <p className="text-center text-sm text-muted-foreground leading-relaxed">{t.prices.note}</p>

          <div className="text-center">
            <Link href={bookPath} className={cn(buttonVariants({ size: "lg" }))}>
              {t.prices.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
