import type { Locale } from "@/lib/constants";
import { Header, Footer } from "@/components/layout/header-footer";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { BookingOpenProvider } from "@/components/booking/booking-open-context";
import { isOnlineBookingCurrentlyOpen } from "@/lib/park-settings";

export async function MarketingLayout({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const bookingOpen = await isOnlineBookingCurrentlyOpen();

  return (
    <BookingOpenProvider open={bookingOpen}>
      <Header locale={locale} />
      <main className="flex-1">{children}</main>
      <Footer locale={locale} />
      <InstallPrompt locale={locale} />
      <Toaster />
    </BookingOpenProvider>
  );
}
