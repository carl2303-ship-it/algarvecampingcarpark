import type { Locale } from "@/lib/constants";
import { Header, Footer } from "@/components/layout/header-footer";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export function MarketingLayout({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <>
      <Header locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
      <InstallPrompt locale={locale} />
      <Toaster />
    </>
  );
}
