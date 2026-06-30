import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { getTranslations } from "@/lib/i18n";

export default function BookSuccessPage() {
  const t = getTranslations("pt");
  return (
    <MarketingLayout locale="pt">
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">{t.book.success_title}</h1>
        <p className="text-muted-foreground mb-8">{t.book.success_message}</p>
        <Link href="/" className={buttonVariants()}>
          Voltar ao início
        </Link>
      </div>
    </MarketingLayout>
  );
}
