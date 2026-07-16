"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_ALT,
  CONTACT_PHONE_ALT_RAW,
  CONTACT_PHONE_RAW,
} from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { localePath } from "@/lib/locale-path";
import { cn } from "@/lib/utils";
import { useBookingOpen } from "@/components/booking/booking-open-context";

export function BookingUnavailableContent({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);
  const contactPath = localePath(locale, "/contact");

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{t.book.unavailable_title}</DialogTitle>
        <DialogDescription className="text-base leading-relaxed">
          {t.book.unavailable_message}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
        >
          <Mail className="h-4 w-4 shrink-0 text-primary" />
          <span>{CONTACT_EMAIL}</span>
        </a>
        <a
          href={`tel:${CONTACT_PHONE_RAW}`}
          className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
        >
          <Phone className="h-4 w-4 shrink-0 text-primary" />
          <span>{CONTACT_PHONE}</span>
        </a>
        <a
          href={`tel:${CONTACT_PHONE_ALT_RAW}`}
          className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm hover:bg-muted transition-colors"
        >
          <Phone className="h-4 w-4 shrink-0 text-primary" />
          <span>{CONTACT_PHONE_ALT}</span>
        </a>
      </div>

      <DialogFooter className="sm:justify-start">
        <Link href={contactPath} className={cn(buttonVariants(), "w-full sm:w-auto")}>
          {t.book.unavailable_contact}
        </Link>
      </DialogFooter>
    </>
  );
}

export function BookingUnavailableDialog({
  locale,
  open,
  onOpenChange,
}: {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <BookingUnavailableContent locale={locale} />
      </DialogContent>
    </Dialog>
  );
}

export function BookCta({
  locale,
  href,
  className,
  children,
  onClick,
}: {
  locale: Locale;
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const bookingOpen = useBookingOpen();
  const [open, setOpen] = React.useState(false);

  if (bookingOpen) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onClick?.();
          setOpen(true);
        }}
        className={className}
      >
        {children}
      </button>
      <BookingUnavailableDialog locale={locale} open={open} onOpenChange={setOpen} />
    </>
  );
}
