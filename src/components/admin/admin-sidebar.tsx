"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Images,
  LayoutDashboard,
  LogOut,
  Map,
  MapPinned,
  MapPin,
  Menu,
  Settings,
  Tent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SiteLogo } from "@/components/brand/site-logo";
import { adminT } from "@/lib/admin-i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: adminT.nav.dashboard, icon: LayoutDashboard },
  { href: "/admin/reservations", label: adminT.nav.reservations, icon: Tent },
  { href: "/admin/park-status", label: adminT.nav.parkStatus, icon: MapPin },
  { href: "/admin/timeline", label: adminT.nav.calendar, icon: BarChart3 },
  { href: "/admin/zones", label: adminT.nav.zones, icon: Map },
  { href: "/admin/gallery", label: adminT.nav.gallery, icon: Images },
  { href: "/admin/pitch-map", label: adminT.nav.pitchMap, icon: MapPinned },
  { href: "/admin/settings", label: adminT.nav.settings, icon: Settings },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/reservations") {
    return (
      pathname === "/admin/reservations" ||
      (pathname.startsWith("/admin/reservations/") &&
        !pathname.startsWith("/admin/reservations/completed"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("space-y-1", className)}>
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isNavActive(pathname, item.href)
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function AdminLogoutButton({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    onNavigate?.();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" className="justify-start gap-3 w-full" onClick={logout}>
      <LogOut className="h-4 w-4" />
      {adminT.common.logout}
    </Button>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 border-r bg-muted/30 min-h-screen p-4 flex-col shrink-0">
      <Link href="/admin" className="flex items-center gap-3 mb-8 px-2">
        <SiteLogo size="sm" />
        <span className="font-semibold text-sm leading-tight">{adminT.common.admin}</span>
      </Link>
      <AdminNavLinks pathname={pathname} className="flex-1" />
      <AdminLogoutButton />
    </aside>
  );
}

export function AdminMobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 px-4 py-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="icon" aria-label={adminT.nav.menu}>
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0 gap-0">
          <SheetTitle className="sr-only">{adminT.nav.menu}</SheetTitle>
          <div className="flex h-full flex-col p-4 pt-12">
            <Link
              href="/admin"
              className="flex items-center gap-3 mb-6 px-2"
              onClick={() => setOpen(false)}
            >
              <SiteLogo size="sm" />
              <span className="font-semibold text-sm leading-tight">{adminT.common.admin}</span>
            </Link>
            <AdminNavLinks
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              className="flex-1 overflow-y-auto"
            />
            <AdminLogoutButton onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/admin" className="flex items-center gap-2 min-w-0">
        <SiteLogo size="sm" />
        <span className="font-semibold text-sm truncate">{adminT.common.admin}</span>
      </Link>

      <div className="w-9 shrink-0" aria-hidden />
    </header>
  );
}
