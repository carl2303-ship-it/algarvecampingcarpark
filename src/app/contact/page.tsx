import { MarketingLayout } from "@/components/layout/marketing-layout";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";

export default function ContactPage() {
  const t = getTranslations("pt");
  return (
    <MarketingLayout locale="pt">
      <div className="container mx-auto px-4 py-16 max-w-xl">
        <h1 className="text-3xl font-bold mb-2">{t.contact.title}</h1>
        <p className="text-muted-foreground mb-8">{t.contact.subtitle}</p>
        <div className="space-y-4 text-lg">
          <p>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <strong>Telefone:</strong>{" "}
            <a href={`tel:${CONTACT_PHONE}`} className="text-primary hover:underline">
              {CONTACT_PHONE}
            </a>
          </p>
          <p className="text-muted-foreground text-base pt-4">
            Elodie & Romy
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
