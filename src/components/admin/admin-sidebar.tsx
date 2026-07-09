"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, BarChart3, Images, LayoutDashboard, LogOut, Map, MapPinned, MapPin, Plus, Settings, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/brand/site-logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Reservas", icon: Tent },
  { href: "/admin/reservations/new", label: "Nova reserva", icon: Plus },
  { href: "/admin/park-status", label: "Mapa operacional", icon: MapPin },
  { href: "/admin/timeline", label: "Gantt", icon: BarChart3 },
  { href: "/admin/calendar", label: "Calendário", icon: Calendar },
  { href: "/admin/zones", label: "Zonas & Tarifas", icon: Map },
  { href: "/admin/gallery", label: "Galeria", icon: Images },
  { href: "/admin/pitch-map", label: "Mapa de lugares", icon: MapPinned },
  { href: "/admin/settings", label: "Definições", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-64 border-r bg-muted/30 min-h-screen p-4 flex flex-col">
      <Link href="/admin" className="flex items-center gap-3 mb-8 px-2">
        <SiteLogo size="sm" />
        <span className="font-semibold text-sm leading-tight">Admin</span>
      </Link>
      <nav className="space-y-1 flex-1">
        {nav.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : item.href === "/admin/reservations"
                ? pathname === "/admin/reservations"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
          );
        })}
      </nav>
      <Button variant="ghost" className="justify-start gap-3" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </aside>
  );
}
