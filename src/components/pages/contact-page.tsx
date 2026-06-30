import { Mail, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { CONTACT_EMAIL, CONTACT_PHONE, MAPS_URL } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";

export default function ContactPageContent({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);

  const cards = [
    {
      icon: Mail,
      label: t.contact.email_label,
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      icon: Phone,
      label: t.contact.phone_label,
      value: CONTACT_PHONE,
      href: `tel:${CONTACT_PHONE}`,
    },
    {
      icon: MessageCircle,
      label: "Google Maps",
      value: locale === "pt" ? "Como chegar" : "Get directions",
      href: MAPS_URL,
    },
  ];

  return (
    <MarketingLayout locale={locale}>
      <PageHero title={t.contact.title} description={t.contact.subtitle} />

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="grid gap-6">
            {cards.map(({ icon: Icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-6 rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{label}</p>
                  <p className="font-semibold text-lg">{value}</p>
                </div>
              </a>
            ))}
          </div>

          <p className="text-center text-muted-foreground mt-12 font-heading text-xl">
            {t.contact.hosts}
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
