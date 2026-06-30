import Link from "next/link";
import { MapPin, Tent, TreePine, Waves } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { CONTACT_EMAIL, CONTACT_PHONE, SITE_NAME } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";

export default function HomePage({ locale = "pt" as Locale }: { locale?: Locale }) {
  const t = getTranslations(locale);
  const bookPath = locale === "en" ? "/en/book" : "/book";

  return (
    <MarketingLayout locale={locale}>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 dark:from-emerald-950/30 dark:via-sky-950/30 dark:to-amber-950/30">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              {t.home.hero_title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {t.home.hero_subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={bookPath} className={buttonVariants({ size: "lg" })}>
                {t.home.cta_book}
              </Link>
              <Link
                href={locale === "en" ? "/en/contact" : "/contact"}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                {t.home.cta_contact}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Tent, label: t.home.features.capacity },
            { icon: TreePine, label: t.home.features.nature },
            { icon: Waves, label: t.home.features.sea },
            { icon: MapPin, label: t.home.features.location },
          ].map(({ icon: Icon, label }) => (
            <Card key={label}>
              <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                <Icon className="h-10 w-10 text-primary" />
                <p className="font-medium">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">{SITE_NAME}</h2>
          <p className="text-muted-foreground mb-6">
            {locale === "en"
              ? "A service area near the most beautiful beaches of the Algarve. Open since March 2020."
              : "Uma área de serviço perto das praias mais lindas do Algarve. Aberta desde março de 2020."}
          </p>
          <p className="text-sm text-muted-foreground">
            {CONTACT_EMAIL} · {CONTACT_PHONE}
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
