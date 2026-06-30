import { Car, Plane, ShoppingBag, Umbrella } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { MapEmbed } from "@/components/marketing/map-embed";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { ADDRESS } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";

const distanceIcons = [ShoppingBag, Umbrella, Plane] as const;

export default function LocationPageContent({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const distances = Object.values(t.location.distances);

  return (
    <MarketingLayout locale={locale}>
      <PageHero
        eyebrow={t.home.location_eyebrow}
        title={t.location.title}
        description={`${t.location.address} — ${t.location.directions}`}
      />

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <MapEmbed
            title={t.location.title}
            openLabel={t.location.open_maps}
            className="mb-16"
          />

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h2 className="font-heading text-2xl font-semibold mb-4">
                {t.location.getting_here}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{ADDRESS}</p>
              <p className="text-muted-foreground leading-relaxed">{t.location.directions}</p>
            </div>
            <div className="space-y-4">
              {distances.map((d, i) => {
                const Icon = distanceIcons[i] ?? Car;
                return (
                  <div
                    key={d}
                    className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-medium">{d}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
