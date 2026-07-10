import { Button } from "@/components/ui/button";
import { adminT } from "@/lib/admin-i18n";
import { checkOutReservation } from "@/lib/admin-reservation-actions";

export function CheckOutButton({
  reservationId,
  pitchId,
  pitchCode,
}: {
  reservationId: string;
  pitchId: string | null;
  pitchCode: string | null;
}) {
  return (
    <form action={checkOutReservation}>
      <input type="hidden" name="reservationId" value={reservationId} />
      {pitchId && <input type="hidden" name="pitchId" value={pitchId} />}
      {pitchCode && <input type="hidden" name="pitchCode" value={pitchCode} />}
      <Button size="sm" variant="outline" type="submit">
        {adminT.reservations.checkOut}
      </Button>
    </form>
  );
}
