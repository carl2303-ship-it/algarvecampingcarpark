"use client";

import { ArrowRight } from "lucide-react";
import { BookCta } from "@/components/booking/book-cta";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function CTABanner({
  title,
  description,
  buttonLabel,
  buttonHref,
  locale,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  locale: Locale;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-ocean to-primary" />
      <div className="absolute inset-0 opacity-20 section-pattern" />
      <div className="container relative mx-auto px-4 py-16 md:py-20 text-center">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-4 text-balance">
          {title}
        </h2>
        <p className="text-white/85 text-lg max-w-xl mx-auto mb-8">{description}</p>
        <BookCta
          locale={locale}
          href={buttonHref}
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-white text-primary hover:bg-white/90 shadow-xl"
          )}
        >
          {buttonLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </BookCta>
      </div>
    </section>
  );
}
