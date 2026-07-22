import Link from "next/link";
import { QrCode } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { localePath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";

export default function GatePageContent({
  locale,
}: {
  locale: Locale;
  fromQr?: boolean;
}) {
  const t = getTranslations(locale);
  const g = t.gate;
  const bookGatePath = `${localePath(locale, "/book")}?from=qr`;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-xl space-y-8 text-center">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              {g.landing_eyebrow}
            </p>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
              {g.landing_title}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              {g.landing_message}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-left text-sm text-primary">
            <QrCode className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="leading-relaxed">{g.landing_hint}</p>
          </div>

          <Link
            href={bookGatePath}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full h-auto min-h-14 py-4 text-base md:text-lg font-semibold"
            )}
          >
            {g.book_required}
          </Link>
        </div>
      </main>
    </div>
  );
}
