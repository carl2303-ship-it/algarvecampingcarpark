"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_PAYMENT_METHODS } from "@/lib/admin-payment-methods";
import { adminT } from "@/lib/admin-i18n";
import { getSpotZoneSlug } from "@/lib/park-pitch-map-defaults";
import type { PitchMapSpotRecord } from "@/lib/pitch-map";
import type { Zone } from "@/types/database";
import { formatPrice } from "@/lib/pricing";

type Props = {
  zones: Zone[];
  spots: PitchMapSpotRecord[];
};

export function AdminReservationForm({
  zones,
  spots,
  initialPitchCode,
}: Props & { initialPitchCode?: string }) {
  const router = useRouter();
  const sortedSpots = useMemo(
    () =>
      [...spots].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      ),
    [spots]
  );

  const [pitchCode, setPitchCode] = useState(
    initialPitchCode && spots.some((s) => s.code === initialPitchCode)
      ? initialPitchCode
      : sortedSpots[0]?.code ?? ""
  );
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [numGuests, setNumGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [operationalNotes, setOperationalNotes] = useState("");
  const [totalCents, setTotalCents] = useState<number | null>(null);
  const [isFullyPaid, setIsFullyPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [partialPaymentCents, setPartialPaymentCents] = useState("");
  const [partialPaymentMethod, setPartialPaymentMethod] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSpot = sortedSpots.find((spot) => spot.code === pitchCode);
  const zoneSlug = selectedSpot ? getSpotZoneSlug(selectedSpot) : null;
  const zoneId = zones.find((zone) => zone.slug === zoneSlug)?.id ?? "";

  const paidCents = isFullyPaid
    ? totalCents ?? 0
    : Math.round((parseFloat(partialPaymentCents.replace(",", ".")) || 0) * 100);
  const balanceCents = Math.max(0, (totalCents ?? 0) - paidCents);

  useEffect(() => {
    if (!zoneId || !checkIn || !checkOut || checkOut <= checkIn) {
      setTotalCents(null);
      return;
    }

    const controller = new AbortController();
    setLoadingQuote(true);

    fetch(
      `/api/admin/reservations/quote?zone_id=${zoneId}&check_in=${checkIn}&check_out=${checkOut}&num_guests=${numGuests}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.pricing?.totalCents != null) {
          setTotalCents(data.pricing.totalCents);
        } else {
          setTotalCents(null);
          setError(data.error ?? adminT.reservationForm.quoteError);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingQuote(false));

    return () => controller.abort();
  }, [zoneId, checkIn, checkOut, numGuests]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!zoneId) {
      setError(adminT.reservationForm.invalidZone);
      return;
    }
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError(adminT.reservationForm.invalidDates);
      return;
    }
    if (totalCents == null) {
      setError(adminT.reservationForm.waitForQuote);
      return;
    }
    if (isFullyPaid && !paymentMethod) {
      setError(adminT.reservationForm.selectPaymentMethod);
      return;
    }
    if (!isFullyPaid && paidCents > 0 && !partialPaymentMethod) {
      setError(adminT.reservationForm.selectPartialMethod);
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone_id: zoneId,
        pitch_code: pitchCode,
        check_in: checkIn,
        check_out: checkOut,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        vehicle_plate: vehiclePlate || undefined,
        num_guests: numGuests,
        notes: notes || undefined,
        operational_notes: operationalNotes || undefined,
        total_cents: totalCents,
        is_fully_paid: isFullyPaid,
        payment_method: paymentMethod || null,
        partial_payment_cents: isFullyPaid ? 0 : paidCents,
        partial_payment_method: partialPaymentMethod || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : adminT.reservationForm.createError);
      return;
    }

    router.push("/admin/reservations");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{adminT.reservationForm.stay}</CardTitle>
          <CardDescription>{adminT.reservationForm.stayDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="pitch">{adminT.reservationForm.pitchNumber}</Label>
            <select
              id="pitch"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={pitchCode}
              onChange={(event) => setPitchCode(event.target.value)}
              required
            >
              {sortedSpots.map((spot) => (
                <option key={spot.code} value={spot.code}>
                  {spot.code}
                  {spot.panoramic ? ` ${adminT.reservationForm.panoramic}` : ""}
                  {spot.electric ? "" : ` ${adminT.reservationForm.noElectricity}`}
                </option>
              ))}
            </select>
            {zoneSlug && (
              <p className="text-xs text-muted-foreground mt-1">
                {adminT.reservationForm.zoneLabel.replace(
                  "{name}",
                  zones.find((zone) => zone.slug === zoneSlug)?.name ?? zoneSlug
                )}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="check_in">{adminT.reservationForm.arrivalDate}</Label>
            <Input
              id="check_in"
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="check_out">{adminT.reservationForm.departureDate}</Label>
            <Input
              id="check_out"
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="guests">{adminT.reservationForm.numGuests}</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={10}
              value={numGuests}
              onChange={(event) => setNumGuests(Number(event.target.value))}
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <div className="rounded-lg border bg-muted/40 px-4 py-3 w-full">
              <p className="text-xs text-muted-foreground">{adminT.reservationForm.estimatedTotal}</p>
              <p className="text-xl font-bold flex items-center gap-2">
                {loadingQuote && <Loader2 className="h-4 w-4 animate-spin" />}
                {totalCents != null ? formatPrice(totalCents) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{adminT.reservationForm.clientData}</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="guest_name">{adminT.reservationForm.name}</Label>
            <Input
              id="guest_name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="guest_email">{adminT.common.email}</Label>
            <Input
              id="guest_email"
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="guest_phone">{adminT.common.phone}</Label>
            <Input
              id="guest_phone"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="vehicle_plate">{adminT.common.plate}</Label>
            <Input
              id="vehicle_plate"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="operational_notes">{adminT.reservationForm.operationalNotes}</Label>
            <Textarea
              id="operational_notes"
              value={operationalNotes}
              onChange={(event) => setOperationalNotes(event.target.value)}
              placeholder={adminT.reservationForm.operationalNotesPlaceholder}
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">{adminT.reservationForm.internalNotes}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{adminT.reservationForm.payment}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={isFullyPaid}
              onChange={(event) => setIsFullyPaid(event.target.checked)}
            />
            {adminT.reservationForm.fullyPaid}
          </label>

          {isFullyPaid ? (
            <div>
              <Label htmlFor="payment_method">{adminT.reservationForm.paymentMethod}</Label>
              <select
                id="payment_method"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                required
              >
                <option value="">{adminT.common.select}</option>
                {ADMIN_PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="partial_payment">{adminT.reservationForm.partialPayment}</Label>
                <Input
                  id="partial_payment"
                  type="number"
                  min={0}
                  step={0.01}
                  value={partialPaymentCents}
                  onChange={(event) => setPartialPaymentCents(event.target.value)}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              {paidCents > 0 && (
                <div>
                  <Label htmlFor="partial_payment_method">{adminT.reservationForm.partialMethod}</Label>
                  <select
                    id="partial_payment_method"
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={partialPaymentMethod}
                    onChange={(event) => setPartialPaymentMethod(event.target.value)}
                  >
                    <option value="">{adminT.common.select}</option>
                    {ADMIN_PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label htmlFor="balance_method">{adminT.reservationForm.balanceMethod}</Label>
                <select
                  id="balance_method"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="">{adminT.common.toDefine}</option>
                  {ADMIN_PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid sm:grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div>
              <p className="text-muted-foreground">{adminT.common.total}</p>
              <p className="font-semibold">{totalCents != null ? formatPrice(totalCents) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{adminT.common.paid}</p>
              <p className="font-semibold">{formatPrice(paidCents)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{adminT.common.balanceDue}</p>
              <p className="font-semibold text-primary">{formatPrice(balanceCents)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {adminT.reservationForm.create}
      </Button>
    </form>
  );
}
