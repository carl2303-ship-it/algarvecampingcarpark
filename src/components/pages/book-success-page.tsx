import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import type { Locale } from "@/lib/constants";
import { isDeskQrEntry, isReceptionQrEntry } from "@/lib/gate-entry";
import { getTranslations } from "@/lib/i18n";
import { localePath } from "@/lib/locale-path";

export default async function BookSuccessPageContent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: Promise<{ extended?: string; from?: string; ref?: string }>;
}) {
  const params = await searchParams;
  const t = getTranslations(locale);
  const extended = params.extended === "1";
  const receptionEntry = isReceptionQrEntry(params.from);
  const deskEntry = isDeskQrEntry(params.from);
  const reference = params.ref?.trim().toUpperCase() || null;

  const title = extended
    ? t.book.success_extended_title
    : receptionEntry
      ? t.book.success_reception_title
      : t.book.success_title;

  const message = extended
    ? t.book.success_extended_message
    : receptionEntry
      ? t.book.success_reception_message
      : t.book.success_message;

  const content = (
    <div className="container mx-auto px-4 py-20 text-center max-w-lg">
      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground mb-8">{message}</p>
      {receptionEntry && reference ? (
        <div className="mb-8 rounded-2xl border bg-muted/40 px-5 py-4">
          <p className="text-sm text-muted-foreground mb-1">{t.book.success_reception_ref_label}</p>
          <p className="font-mono text-2xl font-semibold tracking-wider text-foreground">
            {reference}
          </p>
        </div>
      ) : null}
      {!extended && !receptionEntry && (
        <p className="text-sm text-muted-foreground mb-8">{t.book.pre_arrival_alert}</p>
      )}
      {!deskEntry && (
        <Link href={localePath(locale, "/")} className={buttonVariants()}>
          {t.book.unavailable_back}
        </Link>
      )}
    </div>
  );

  if (deskEntry) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex flex-col">
        <main className="flex-1 flex items-center justify-center">{content}</main>
      </div>
    );
  }

  return <MarketingLayout locale={locale}>{content}</MarketingLayout>;
}
