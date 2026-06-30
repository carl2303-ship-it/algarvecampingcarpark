"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Tent, X } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SITE_NAME } from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/location", key: "location" },
  { href: "/contact", key: "contact" },
] as const;

export function Header({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const otherLocale = locale === "pt" ? "en" : "pt";
  const localePath = (path: string) =>
    locale === "pt" ? path : `/en${path === "/" ? "" : path}`;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={localePath("/")} className="flex items-center gap-2 font-semibold">
          <Tent className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline text-sm md:text-base">{SITE_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={localePath(item.href)}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === localePath(item.href) && "text-primary"
              )}
            >
              {t.nav[item.key]}
            </Link>
          ))}
          <Link
            href={locale === "pt" ? "/en" : "/"}
            className="text-sm text-muted-foreground hover:text-primary uppercase"
          >
            {otherLocale}
          </Link>
          <Link href={localePath("/book")} className={buttonVariants()}>
            {t.nav.book}
          </Link>
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-4 mt-8">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={localePath(item.href)}
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium"
                >
                  {t.nav[item.key]}
                </Link>
              ))}
              <Link
                href={locale === "pt" ? "/en" : "/"}
                onClick={() => setOpen(false)}
                className="text-muted-foreground uppercase"
              >
                {otherLocale}
              </Link>
              <Link
                href={localePath("/book")}
                onClick={() => setOpen(false)}
                className={cn(buttonVariants(), "mt-4")}
              >
                {t.nav.book}
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const localePath = (path: string) =>
    locale === "pt" ? path : `/en${path === "/" ? "" : path}`;

  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME}. {t.footer.rights}.
          </p>
          <div className="flex gap-4 text-sm">
            <Link href={localePath("/privacy")} className="text-muted-foreground hover:text-primary">
              {t.footer.privacy}
            </Link>
            <Link href={localePath("/terms")} className="text-muted-foreground hover:text-primary">
              {t.footer.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
