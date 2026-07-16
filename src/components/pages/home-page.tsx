import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  MapPin,
  Phone,
  TreePine,
  Zap,
} from "lucide-react";
import { BookCta } from "@/components/booking/book-cta";
import { buttonVariants } from "@/components/ui/button";
import { FeatureCard, StatItem } from "@/components/marketing/feature-card";
import { MapEmbed } from "@/components/marketing/map-embed";
import { CTABanner } from "@/components/marketing/cta-banner";
import { SectionHeading } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import {
  CONTACT_PHONE,
  CONTACT_PHONE_ALT,
  CONTACT_PHONE_ALT_RAW,
  CONTACT_PHONE_RAW,
  EXPERIENCE_IMAGE,
  GPS_DECIMAL,
  GPS_DMS,
  HERO_IMAGE,
  PARK_AREA_M2,
  TOTAL_CAPACITY,
} from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function HomePage({ locale = "pt" as Locale }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const prefix = locale === "en" ? "/en" : "";
  const bookPath = `${prefix}/book`;

  const features = [
    {
      iconSrc: "/icons/camping-car.png",
      iconAlt: locale === "pt" ? "Autocaravana" : "Motorhome",
      title: t.home.features.capacity,
      description: t.home.features.capacity_desc,
    },
    {
      icon: TreePine,
      title: t.home.features.nature,
      description: t.home.features.nature_desc,
    },
    {
      icon: Zap,
      title: t.home.features.electricity,
      description: t.home.features.electricity_desc,
    },
    {
      icon: MapPin,
      title: t.home.features.location,
      description: t.home.features.location_desc,
    },
  ] as const;

  return (
    <MarketingLayout locale={locale}>
      {/* Hero */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden -mt-[100px] pt-[100px]">
        <Image
          src={HERO_IMAGE}
          alt="Algarve Camping Car Park — vista aérea do parque"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_oklch(0.75_0.08_75_/_0.15),_transparent_50%)]" />

        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm mb-6">
              {t.home.hero_badge}
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.1] text-balance mb-6">
              {t.home.hero_title}
            </h1>
            <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl mb-10">
              {t.home.hero_subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <BookCta
                locale={locale}
                href={bookPath}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-primary hover:bg-white/90 shadow-xl h-12 px-8 text-base"
                )}
              >
                {t.home.cta_book}
                <ArrowRight className="ml-2 h-4 w-4" />
              </BookCta>
              <Link
                href={`${prefix}/location`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm h-12 px-8 text-base"
                )}
              >
                {t.home.cta_location}
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 animate-bounce hidden md:block">
          <ChevronDown className="h-6 w-6" />
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card shadow-sm relative z-10 -mt-1">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 divide-x divide-border/60">
            <StatItem value={String(TOTAL_CAPACITY)} label={t.home.stats.pitches} />
            <StatItem
              value={PARK_AREA_M2.toLocaleString(locale === "pt" ? "pt-PT" : "en-GB")}
              label={t.home.stats.area}
            />
            <StatItem value="2020" label={t.home.stats.since} />
            <StatItem value="6A · 10A" label={t.home.stats.electricity} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 section-pattern">
        <div className="container mx-auto px-4">
          <SectionHeading
            eyebrow={t.home.features_eyebrow}
            title={t.home.features_title}
            description={t.home.features_subtitle}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="py-20 md:py-28 bg-sand/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-primary/15 ring-1 ring-black/5">
              <Image
                src={EXPERIENCE_IMAGE}
                alt="Algarve Camping Car Park — vista aérea do parque"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 glass-card rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.home.experience_services}</p>
                  <p className="text-xs text-muted-foreground">{t.home.experience_services_desc}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                {t.home.experience_eyebrow}
              </p>
              <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-balance">
                {t.home.experience_title}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                {t.home.experience_text}
              </p>
              <Link href={`${prefix}/about`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t.home.experience_cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Location preview */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                {t.home.location_eyebrow}
              </p>
              <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-4">
                {t.home.location_title}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                {t.home.location_text}
              </p>
              <ul className="space-y-3 mb-8">
                {Object.values(t.location.distances).map((d) => (
                  <li key={d} className="flex items-center gap-3 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
              <div className="mb-8 space-y-2 text-muted-foreground">
                <a
                  href={`tel:${CONTACT_PHONE_RAW}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {CONTACT_PHONE}
                </a>
                <a
                  href={`tel:${CONTACT_PHONE_ALT_RAW}`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {CONTACT_PHONE_ALT}
                </a>
              </div>
              <div className="mb-8 space-y-1 text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">GPS:</span> {GPS_DECIMAL}
                </p>
                <p>{GPS_DMS}</p>
              </div>
              <Link href={`${prefix}/location`} className={buttonVariants()}>
                {t.home.location_cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <MapEmbed
              title="Mapa"
              openLabel={t.location.open_maps}
              aspectClassName="aspect-square"
              className="w-full max-w-[500px] mx-auto lg:mx-0 lg:ml-auto"
            />
          </div>
        </div>
      </section>

      <CTABanner
        title={t.home.cta_banner_title}
        description={t.home.cta_banner_text}
        buttonLabel={t.home.cta_book}
        buttonHref={bookPath}
        locale={locale}
      />
    </MarketingLayout>
  );
}
