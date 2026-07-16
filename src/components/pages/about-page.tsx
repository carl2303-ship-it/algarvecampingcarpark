import { ArrowRight, Check } from "lucide-react";
import { BookCta } from "@/components/booking/book-cta";
import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { GalleryCarousel } from "@/components/marketing/gallery-carousel";
import { GoogleReviewsClient } from "@/components/marketing/google-reviews-client";
import { ParkPitchMap } from "@/components/marketing/park-pitch-map";
import { buttonVariants } from "@/components/ui/button";
import { getGalleryImages } from "@/lib/gallery";
import { getPitchMapSpots } from "@/lib/pitch-map";
import { getTranslations } from "@/lib/i18n";
import { localePath } from "@/lib/locale-path";
import type { Locale } from "@/lib/constants";

export default async function AboutPageContent({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const bookHref = localePath(locale, "/book");
  const galleryImages = await getGalleryImages();
  const pitchMapSpots = await getPitchMapSpots();

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
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="container mx-auto px-4 max-w-[1440px]">
          <ParkPitchMap locale={locale} spots={pitchMapSpots} showFacilities />
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold">
              {t.about.gallery_title}
            </h2>
            <p className="text-muted-foreground mt-2">{t.about.gallery_subtitle}</p>
          </div>
          <GalleryCarousel images={galleryImages} locale={locale} />
        </div>
      </section>

      <GoogleReviewsClient locale={locale} />

      <section className="pb-20 md:pb-28">
        <div className="container mx-auto px-4 text-center">
          <BookCta locale={locale} href={bookHref} className={buttonVariants({ size: "lg" })}>
            {t.nav.book}
            <ArrowRight className="ml-2 h-4 w-4" />
          </BookCta>
        </div>
      </section>
    </MarketingLayout>
  );
}
