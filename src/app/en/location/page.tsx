import { MarketingLayout } from "@/components/layout/marketing-layout";
import { getTranslations } from "@/lib/i18n";

export default function LocationPageEn() {
  const t = getTranslations("en");
  return (
    <MarketingLayout locale="en">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">{t.location.title}</h1>
        <p className="text-lg text-muted-foreground mb-4">{t.location.address}</p>
        <p className="text-muted-foreground mb-8">{t.location.directions}</p>
        <div className="aspect-video rounded-lg overflow-hidden border">
          <iframe
            title="Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3146.5!2d-8.36!3d37.08!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDA0JzQ4LjAiTiA4wrAyMSczNi4wIlc!5e0!3m2!1sen!2spt!4v1"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </MarketingLayout>
  );
}
