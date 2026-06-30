"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, LayoutDashboard, LogOut, Map, Settings, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Reservas", icon: Tent },
  { href: "/admin/calendar", label: "Calendário", icon: Calendar },
  { href: "/admin/zones", label: "Zonas & Tarifas", icon: Map },
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
      <div className="font-semibold text-lg mb-8 px-2">Admin ACCP</div>
      <nav className="space-y-1 flex-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <Button variant="ghost" className="justify-start gap-3" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </aside>
  );
}
