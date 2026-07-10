import { AdminMobileHeader, AdminSidebar } from "@/components/admin/admin-sidebar";

export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <AdminMobileHeader />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
