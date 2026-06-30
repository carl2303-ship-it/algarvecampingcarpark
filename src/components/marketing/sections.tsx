import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b",
        dark ? "bg-primary text-primary-foreground" : "bg-sand/40 section-pattern",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-ocean/5 pointer-events-none" />
      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl">
          {eyebrow && (
            <p
              className={cn(
                "text-sm font-semibold uppercase tracking-[0.2em] mb-4",
                dark ? "text-primary-foreground/70" : "text-primary"
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-balance mb-6">
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "text-lg md:text-xl leading-relaxed max-w-2xl",
                dark ? "text-primary-foreground/85" : "text-muted-foreground"
              )}
            >
              {description}
            </p>
          )}
          {children && <div className="mt-8 flex flex-wrap gap-4">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "mb-12 md:mb-16 max-w-2xl",
        align === "center" && "mx-auto text-center"
      )}
    >
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="font-heading text-3xl md:text-4xl font-semibold text-balance mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export function CTABanner({
  title,
  description,
  buttonLabel,
  buttonHref,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
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
        <Link
          href={buttonHref}
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-white text-primary hover:bg-white/90 shadow-xl"
          )}
        >
          {buttonLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
