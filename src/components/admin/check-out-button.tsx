import { Button } from "@/components/ui/button";
import { adminT } from "@/lib/admin-i18n";
import { checkOutReservation } from "@/lib/admin-reservation-actions";

export function CheckOutButton({
  reservationId,
  pitchId,
  pitchCode,
  size = "sm",
  variant = "outline",
  redirectTo,
}: {
  reservationId: string;
  pitchId: string | null;
  pitchCode: string | null;
  size?: "sm" | "lg" | "default";
  variant?: "outline" | "secondary" | "default";
  redirectTo?: string;
}) {
  return (
    <form action={checkOutReservation}>
      <input type="hidden" name="reservationId" value={reservationId} />
      {pitchId && <input type="hidden" name="pitchId" value={pitchId} />}
      {pitchCode && <input type="hidden" name="pitchCode" value={pitchCode} />}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <Button size={size} variant={variant} type="submit">
        {adminT.reservations.checkOut}
      </Button>
    </form>
  );
}
