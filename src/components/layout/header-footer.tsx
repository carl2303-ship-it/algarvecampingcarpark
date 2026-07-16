"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Menu, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SiteLogo } from "@/components/brand/site-logo";
import { FooterBrandRow } from "@/components/brand/footer-brand-row";
import { SocialLinks } from "@/components/brand/social-links";
import { BookCta } from "@/components/booking/book-cta";
import {
  ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_ALT,
  CONTACT_PHONE_ALT_RAW,
  CONTACT_PHONE_RAW,
  COMPLAINTS_BOOK_URL,
  LOCALES,
  MAPS_URL,
  SITE_NAME,
  type Locale,
} from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import {
  localePath,
  LOCALE_LABELS,
  switchLocalePath,
} from "@/lib/locale-path";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", key: "home" as const },
  { href: "/about", key: "about" as const },
  { href: "/prices", key: "prices" as const },
  { href: "/location", key: "location" as const },
  { href: "/contact", key: "contact" as const },
];

function LocaleSwitcher({
  locale,
  pathname,
  className,
  linkClass,
  onNavigate,
}: {
  locale: Locale;
  pathname: string;
  className?: string;
  linkClass: (active: boolean) => string;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} role="navigation" aria-label="Language">
      {LOCALES.map((code) => (
        <Link
          key={code}
          href={switchLocalePath(pathname, code)}
          onClick={onNavigate}
          className={cn(
            linkClass(code === locale),
            "uppercase text-xs tracking-wide px-1",
            code === locale && "font-semibold underline underline-offset-4"
          )}
          hrefLang={code}
          lang={code}
        >
          {LOCALE_LABELS[code]}
        </Link>
      ))}
    </div>
  );
}

export function Header({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const path = (p: string) => localePath(locale, p);
  const isHome = pathname === path("/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = cn(
    "sticky top-0 z-50 transition-all duration-300",
    scrolled || !isHome
      ? "border-b bg-background/90 backdrop-blur-lg shadow-sm"
      : "bg-transparent border-b border-transparent"
  );

  const linkClass = (active: boolean) =>
    cn(
      "text-sm font-medium transition-colors",
      isHome && !scrolled
        ? active
          ? "text-white"
          : "text-white/80 hover:text-white"
        : active
          ? "text-primary"
          : "text-muted-foreground hover:text-primary"
    );

  const bookBtnClass =
    isHome && !scrolled
      ? cn(buttonVariants(), "bg-white text-primary hover:bg-white/90 shadow-md")
      : buttonVariants();

  return (
    <header className={headerClass}>
      <div className="container mx-auto flex h-[100px] items-center justify-between px-4">
        <Link href={path("/")} className="flex items-center shrink-0">
          <SiteLogo
            size="lg"
            priority
            className="drop-shadow-sm !h-[88px] !max-w-[343px]"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={path(item.href)}
              className={linkClass(pathname === path(item.href))}
            >
              {t.nav[item.key]}
            </Link>
          ))}
          <LocaleSwitcher locale={locale} pathname={pathname} linkClass={linkClass} />
          <BookCta locale={locale} href={path("/book")} className={bookBtnClass}>
            {t.nav.book}
          </BookCta>
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "lg:hidden",
              isHome && !scrolled && "text-white hover:bg-white/10 hover:text-white"
            )}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <div className="flex flex-col gap-1 mt-8">
              <div className="mb-4 px-1">
                <SiteLogo size="md" className="!h-[74px] !max-w-[281px]" />
              </div>
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={path(item.href)}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted transition-colors"
                >
                  {t.nav[item.key]}
                </Link>
              ))}
              <hr className="my-4" />
              <LocaleSwitcher
                locale={locale}
                pathname={pathname}
                className="px-3 flex-wrap"
                linkClass={() => "text-muted-foreground hover:text-foreground"}
                onNavigate={() => setOpen(false)}
              />
              <BookCta
                locale={locale}
                href={path("/book")}
                onClick={() => setOpen(false)}
                className={cn(buttonVariants(), "mt-4")}
              >
                {t.nav.book}
              </BookCta>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const path = (p: string) => localePath(locale, p);

  return (
    <footer className="bg-primary text-primary-foreground mt-auto">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div>
            <div className="mb-4">
              <FooterBrandRow locale={locale} />
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
              {t.footer.tagline}
            </p>
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-primary-foreground/60 mb-3">
                {t.footer.social}
              </p>
              <SocialLinks variant="footer" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary-foreground/60">
              {t.footer.navigate}
            </h3>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={path(item.href)}
                  className="text-sm text-primary-foreground/80 hover:text-white transition-colors"
                >
                  {t.nav[item.key]}
                </Link>
              ))}
              <BookCta
                locale={locale}
                href={path("/book")}
                className="text-sm text-primary-foreground/80 hover:text-white transition-colors text-left"
              >
                {t.nav.book}
              </BookCta>
            </nav>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-primary-foreground/60">
              {t.footer.contact}
            </h3>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 hover:text-white">
                  <Mail className="h-4 w-4 shrink-0" />
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT_PHONE_RAW}`} className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4 shrink-0" />
                  {CONTACT_PHONE}
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT_PHONE_ALT_RAW}`} className="flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4 shrink-0" />
                  {CONTACT_PHONE_ALT}
                </a>
              </li>
              <li>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-white"
                >
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{ADDRESS}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/15 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/60">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. {t.footer.rights}.
          </p>
          <div className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-2">
            <Link href={path("/privacy")} className="hover:text-white transition-colors">
              {t.footer.privacy}
            </Link>
            <Link href={path("/terms")} className="hover:text-white transition-colors">
              {t.footer.terms}
            </Link>
            <a
              href={COMPLAINTS_BOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              {t.footer.complaints_book}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
