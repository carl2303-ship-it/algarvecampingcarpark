"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminT } from "@/lib/admin-i18n";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/reservations", label: adminT.reservations.tabActive },
  { href: "/admin/reservations/completed", label: adminT.reservations.tabCompleted },
] as const;

export function ReservationsNav() {
  const pathname = usePathname();
  const isCompletedSection = pathname.startsWith("/admin/reservations/completed");

  return (
    <nav className="inline-flex w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground">
      {tabs.map((tab) => {
        const isCompletedTab = tab.href === "/admin/reservations/completed";
        const active = isCompletedTab ? isCompletedSection : !isCompletedSection;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
