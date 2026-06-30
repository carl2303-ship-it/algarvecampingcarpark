import { MarketingLayout } from "@/components/layout/marketing-layout";
import { getTranslations } from "@/lib/i18n";

export default function AboutPageEn() {
  const t = getTranslations("en");
  return (
    <MarketingLayout locale="en">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">{t.about.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{t.about.description}</p>
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Services</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>16A electricity (electric zone)</li>
            <li>Water and waste disposal</li>
            <li>37,000 m² natural environment</li>
            <li>Capacity for 57 motorhomes</li>
            <li>10 min from Continente, 15 min from beaches</li>
          </ul>
        </div>
      </div>
    </MarketingLayout>
  );
}
