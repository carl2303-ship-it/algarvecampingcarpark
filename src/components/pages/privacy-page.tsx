import { PageHero } from "@/components/marketing/sections";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { getPrivacyContent } from "@/lib/legal/privacy-content";
import type { Locale } from "@/lib/constants";

export function PrivacyPageContent({ locale }: { locale: Locale }) {
  const content = getPrivacyContent(locale);

  return (
    <MarketingLayout locale={locale}>
      <PageHero eyebrow={content.eyebrow} title={content.title} />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-muted-foreground leading-relaxed text-lg mb-12">{content.intro}</p>

          <div className="space-y-10">
            {content.sections.map((section) => (
              <article key={section.title}>
                <h2 className="font-heading text-xl md:text-2xl font-semibold mb-4">
                  {section.title}
                </h2>

                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="text-muted-foreground leading-relaxed mb-4 last:mb-0"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.list && (
                  <ul className="space-y-3 mt-4">
                    {section.list.map((item) => (
                      <li key={item.label} className="text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">{item.label}:</span>{" "}
                        {item.text}
                      </li>
                    ))}
                  </ul>
                )}

                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-2 mt-4 text-muted-foreground leading-relaxed">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.slice(0, 48)}>{bullet}</li>
                    ))}
                  </ul>
                )}

                {section.closingParagraphs?.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="text-muted-foreground leading-relaxed mt-4"
                  >
                    {paragraph}
                  </p>
                ))}
              </article>
            ))}
          </div>

          <p className="mt-12 pt-8 border-t text-sm text-muted-foreground">
            {content.lastUpdatedLabel}: {content.lastUpdated}.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
