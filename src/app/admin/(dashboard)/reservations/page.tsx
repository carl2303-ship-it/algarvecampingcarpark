import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckInDialog } from "@/components/admin/check-in-dialog";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseReservationPitch } from "@/lib/reservation-checkout";
import { formatPrice } from "@/lib/pricing";
import type { Pitch, Reservation } from "@/types/database";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_payment: "outline",
  confirmed: "default",
  checked_in: "secondary",
  checked_out: "outline",
  cancelled: "destructive",
  expired: "destructive",
};

export default async function ReservationsPage() {
  const supabase = createAdminClient();

  const [{ data: reservations }, { data: pitches }] = await Promise.all([
    supabase
      .from("reservations")
      .select("*, zone:zones(name), pitch:pitches(code)")
      .order("check_in", { ascending: false })
      .limit(100),
    supabase.from("pitches").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Reservas</h1>
        <div className="flex gap-2">
          <Link href="/admin/reservations/new" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova reserva
          </Link>
          <a href="/api/admin/export" className={buttonVariants({ variant: "outline" })}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </a>
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead>Datas</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Lugar</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reservations as Reservation[])?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{r.guest_email}</p>
                  </div>
                </TableCell>
                <TableCell>{(r.zone as { name: string } | null)?.name}</TableCell>
                <TableCell className="text-sm">
                  {r.check_in} → {r.check_out}
                </TableCell>
                <TableCell>{formatPrice(r.total_cents)}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[r.status] ?? "outline"}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.pitch_code ?? (r.pitch as { code: string } | null)?.code ?? "—"}
                </TableCell>
                <TableCell>
                  {r.status === "confirmed" && (
                    <CheckInDialog
                      reservation={r}
                      pitches={(pitches as Pitch[]) ?? []}
                    />
                  )}
                  {r.status === "checked_in" && (
                    <CheckOutButton
                      reservationId={r.id}
                      pitchId={r.pitch_id}
                      pitchCode={r.pitch_code ?? null}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CheckOutButton({
  reservationId,
  pitchId,
  pitchCode,
}: {
  reservationId: string;
  pitchId: string | null;
  pitchCode: string | null;
}) {
  return (
    <form
      action={async () => {
        "use server";
        const supabase = createAdminClient();
        await supabase
          .from("reservations")
          .update({
            status: "checked_out",
            checked_out_at: new Date().toISOString(),
          })
          .eq("id", reservationId);
        await releaseReservationPitch({ pitch_id: pitchId, pitch_code: pitchCode });
      }}
    >
      <Button size="sm" variant="outline" type="submit">
        Check-out
      </Button>
    </form>
  );
}
