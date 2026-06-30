import { MarketingLayout } from "@/components/layout/marketing-layout";
import { getTranslations } from "@/lib/i18n";

export default function AboutPage() {
  const t = getTranslations("pt");
  return (
    <MarketingLayout locale="pt">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">{t.about.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{t.about.description}</p>
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Serviços</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>Eletricidade 16A (zona com eletricidade)</li>
            <li>Água e esgotos</li>
            <li>Ambiente natural com 37 000 m²</li>
            <li>Capacidade para 57 autocaravanas</li>
            <li>A 10 min do Continente, 15 min das praias</li>
          </ul>
        </div>
      </div>
    </MarketingLayout>
  );
}
