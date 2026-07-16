import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { localePath } from "@/lib/locale-path";

export default async function BookSuccessPageContent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ extended?: string }>;
}) {
  const params = await searchParams;
  const t = getTranslations(locale);
  const extended = params.extended === "1";

  return (
    <MarketingLayout locale={locale}>
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">
          {extended ? t.book.success_extended_title : t.book.success_title}
        </h1>
        <p className="text-muted-foreground mb-8">
          {extended ? t.book.success_extended_message : t.book.success_message}
        </p>
        {!extended && (
          <p className="text-sm text-muted-foreground mb-8">{t.book.pre_arrival_alert}</p>
        )}
        <Link href={localePath(locale, "/")} className={buttonVariants()}>
          {t.book.unavailable_back}
        </Link>
      </div>
    </MarketingLayout>
  );
}
