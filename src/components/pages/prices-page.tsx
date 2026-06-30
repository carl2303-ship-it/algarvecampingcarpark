"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  formatRatePeriod,
  groupRatesBySeason,
  type PricingCatalog,
  type ServiceItem,
} from "@/lib/pricing-catalog";
import { formatPrice } from "@/lib/pricing";
import { getZoneVisual, getServiceVisual, SEASON_META } from "@/lib/pricing-icons";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";

function ZoneRateCard({
  locale,
  zoneName,
  zoneSlug,
  description,
  priceCents,
  minNights,
  period,
  perNightLabel,
  minNightsLabel,
}: {
  locale: Locale;
  zoneName: string;
  zoneSlug: string;
  description: string | null;
  priceCents: number;
  minNights: number;
  period: string;
  perNightLabel: string;
  minNightsLabel: string;
}) {
  const visual = getZoneVisual(zoneSlug);
  const Icon = visual.icon;

  return (
    <div className="group rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-primary/10">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ring-1",
            visual.color
          )}
          aria-hidden
        >
          {visual.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-lg font-semibold">{zoneName}</h3>
            <Icon className="h-4 w-4 text-muted-foreground opacity-60" />
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{period}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-heading text-2xl font-bold text-primary">
            {formatPrice(priceCents, locale === "pt" ? "pt-PT" : "en-GB")}
          </p>
          <p className="text-xs text-muted-foreground">{perNightLabel}</p>
          {minNights > 1 && (
            <Badge variant="secondary" className="mt-2 text-xs">
              {minNightsLabel}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ locale, service }: { locale: Locale; service: ServiceItem }) {
  const visual = getServiceVisual(service.icon);
  const Icon = visual.icon;
  const name = locale === "en" && service.name_en ? service.name_en : service.name;
  const description =
    locale === "en" && service.description_en ? service.description_en : service.description;
  const priceLabel =
    locale === "en" && service.price_label_en
      ? service.price_label_en
      : service.price_label_pt;

  return (
    <div className="rounded-2xl border bg-card p-5 text-center shadow-sm transition hover:shadow-md">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
        {visual.emoji}
      </div>
      <Icon className="mx-auto mb-2 h-4 w-4 text-muted-foreground opacity-50" />
      <p className="font-heading font-semibold">{name}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <p className="mt-3 font-semibold text-primary">
        {service.price_cents != null
          ? formatPrice(service.price_cents, locale === "pt" ? "pt-PT" : "en-GB")
          : priceLabel ?? "—"}
      </p>
    </div>
  );
}

function SeasonHeader({
  season,
  title,
  subtitle,
}: {
  season: keyof typeof SEASON_META;
  title: string;
  subtitle: string;
}) {
  const meta = SEASON_META[season];
  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-r p-6 text-white text-center mb-8 shadow-lg",
        meta.gradient
      )}
    >
      <span className="text-4xl mb-2 block">{meta.emoji}</span>
      <h2 className="font-heading text-2xl font-semibold">{title}</h2>
      <p className="mt-1 text-white/90 text-sm">{subtitle}</p>
    </div>
  );
}

export default function PricesPageContent({
  locale,
  catalog,
}: {
  locale: Locale;
  catalog: PricingCatalog;
}) {
  const t = getTranslations(locale);
  const prefix = locale === "en" ? "/en" : "";
  const bookPath = `${prefix}/book`;
  const perNight = t.book.per_night;
  const { summer, winter } = groupRatesBySeason(catalog.zones, catalog.rates);

  const seasons = [
    {
      id: "summer" as const,
      title: t.prices.summer,
      period: t.prices.summer_period,
      entries: summer,
    },
    {
      id: "winter" as const,
      title: t.prices.winter,
      period: t.prices.winter_period,
      entries: winter,
    },
  ];

  return (
    <MarketingLayout locale={locale}>
      <PageHero
        eyebrow={t.prices.updated}
        title={t.prices.title}
        description={t.prices.subtitle}
      />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              { emoji: SEASON_META.summer.emoji, label: t.prices.summer, sub: t.prices.summer_period },
              { emoji: SEASON_META.winter.emoji, label: t.prices.winter, sub: t.prices.winter_period },
              { emoji: SEASON_META.services.emoji, label: t.prices.services, sub: t.prices.services_desc },
            ].map(({ emoji, label, sub }) => (
              <div
                key={label}
                className="rounded-xl border bg-card p-5 text-center shadow-sm"
              >
                <span className="text-3xl mb-3 block">{emoji}</span>
                <p className="font-heading font-semibold">{label}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sub}</p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="summer" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 mb-8">
              {[
                { id: "summer", emoji: SEASON_META.summer.emoji, title: t.prices.summer },
                { id: "winter", emoji: SEASON_META.winter.emoji, title: t.prices.winter },
                { id: "services", emoji: SEASON_META.services.emoji, title: t.prices.services },
              ].map(({ id, emoji, title }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <span className="text-base">{emoji}</span>
                  <span className="hidden sm:inline">{title}</span>
                  <span className="sm:hidden text-xs">{title.split(" ").pop()}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {seasons.map(({ id, title, period, entries }) => (
              <TabsContent key={id} value={id} className="mt-0 space-y-4">
                <SeasonHeader season={id} title={title} subtitle={period} />
                <div className="space-y-4">
                  {entries.map(({ zone, rate }) => (
                    <ZoneRateCard
                      key={rate.id}
                      locale={locale}
                      zoneName={zone.name}
                      zoneSlug={zone.slug}
                      description={
                        locale === "en" && zone.description_en
                          ? zone.description_en
                          : zone.description
                      }
                      priceCents={rate.price_cents_per_night}
                      minNights={rate.min_nights}
                      period={formatRatePeriod(rate.start_date, rate.end_date, locale)}
                      perNightLabel={perNight}
                      minNightsLabel={t.book.min_nights.replace("{n}", String(rate.min_nights))}
                    />
                  ))}
                  {entries.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {locale === "pt" ? "Sem tarifas nesta época." : "No rates for this season."}
                    </p>
                  )}
                </div>
              </TabsContent>
            ))}

            <TabsContent value="services" className="mt-0">
              <SeasonHeader
                season="services"
                title={t.prices.services}
                subtitle={t.prices.services_desc}
              />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {catalog.services.map((service) => (
                  <ServiceCard key={service.id} locale={locale} service={service} />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground mt-10 max-w-2xl mx-auto leading-relaxed">
            {t.prices.note}
          </p>

          <div className="mt-10 text-center">
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
