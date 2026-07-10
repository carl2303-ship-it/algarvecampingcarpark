import { ReservationsNav } from "@/components/admin/reservations-nav";

export default function ReservationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ReservationsNav />
      {children}
    </div>
  );
}
