"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Mail, Plus } from "lucide-react";
import { DeleteReservationButton } from "@/components/admin/delete-reservation-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_PAYMENT_METHODS, paymentMethodLabel } from "@/lib/admin-payment-methods";
import { adminDateLocale, adminT } from "@/lib/admin-i18n";
import { COMPLETED_RESERVATION_STATUSES } from "@/lib/admin-reservation-status";
import { getSpotZoneSlug } from "@/lib/park-pitch-map-defaults";
import type { PitchMapSpotRecord } from "@/lib/pitch-map";
import type { Zone } from "@/types/database";
import { formatPrice } from "@/lib/pricing";

type Props = {
  zones: Zone[];
  spots: PitchMapSpotRecord[];
};

export type AdminReservationPayment = {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  reservation_id: string;
  check_in: string;
  check_out: string;
  pitch_code: string | null;
};

export type AdminReservationInitial = {
  id: string;
  pitch_code: string | null;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_country?: string | null;
  vehicle_plate: string | null;
  num_guests: number;
  notes: string | null;
  operational_notes: string | null;
  total_cents: number;
  paid_cents?: number;
  status?: string;
};

function eurosToCents(value: string): number {
  return Math.round((parseFloat(value.replace(",", ".")) || 0) * 100);
}

function centsToEurosInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function AdminReservationForm({
  zones,
  spots,
  initialPitchCode,
  mode = "create",
  initialReservation,
  initialPayments = [],
}: Props & {
  initialPitchCode?: string;
  mode?: "create" | "edit";
  initialReservation?: AdminReservationInitial;
  initialPayments?: AdminReservationPayment[];
}) {
  const router = useRouter();
  const sortedSpots = useMemo(
    () =>
      [...spots].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      ),
    [spots]
  );

  const isEdit = mode === "edit" && initialReservation;

  const [pitchCode, setPitchCode] = useState(() => {
    if (initialReservation?.pitch_code && spots.some((s) => s.code === initialReservation.pitch_code)) {
      return initialReservation.pitch_code;
    }
    if (initialPitchCode && spots.some((s) => s.code === initialPitchCode)) {
      return initialPitchCode;
    }
    return sortedSpots[0]?.code ?? "";
  });
  const [checkIn, setCheckIn] = useState(initialReservation?.check_in ?? "");
  const [checkOut, setCheckOut] = useState(initialReservation?.check_out ?? "");
  const [guestName, setGuestName] = useState(initialReservation?.guest_name ?? "");
  const [guestEmail, setGuestEmail] = useState(initialReservation?.guest_email ?? "");
  const [guestPhone, setGuestPhone] = useState(initialReservation?.guest_phone ?? "");
  const [guestCountry, setGuestCountry] = useState(initialReservation?.guest_country ?? "");
  const [vehiclePlate, setVehiclePlate] = useState(initialReservation?.vehicle_plate ?? "");
  const [numGuests, setNumGuests] = useState(initialReservation?.num_guests ?? 2);
  const [notes, setNotes] = useState(initialReservation?.notes ?? "");
  const [operationalNotes, setOperationalNotes] = useState(initialReservation?.operational_notes ?? "");
  const [quotedCents, setQuotedCents] = useState<number | null>(
    initialReservation?.total_cents ?? null
  );
  const [followQuote, setFollowQuote] = useState(!isEdit);
  const [totalEuros, setTotalEuros] = useState(() =>
    initialReservation ? centsToEurosInput(initialReservation.total_cents) : ""
  );
  const [initialPaymentEuros, setInitialPaymentEuros] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("");
  const [payments, setPayments] = useState(initialPayments);
  const [paidCents, setPaidCents] = useState(initialReservation?.paid_cents ?? 0);
  const [newPaymentEuros, setNewPaymentEuros] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const [loadingClientPayments, setLoadingClientPayments] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSpot = sortedSpots.find((spot) => spot.code === pitchCode);
  const zoneSlug = selectedSpot ? getSpotZoneSlug(selectedSpot) : null;
  const zoneId = zones.find((zone) => zone.slug === zoneSlug)?.id ?? "";

  const totalCents = eurosToCents(totalEuros);
  const balanceCents = Math.max(0, totalCents - paidCents);

  useEffect(() => {
    if (!zoneId || !checkIn || !checkOut || checkOut <= checkIn) {
      setQuotedCents(null);
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
          setQuotedCents(data.pricing.totalCents);
        } else {
          setQuotedCents(null);
          setError(data.error ?? adminT.reservationForm.quoteError);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingQuote(false));

    return () => controller.abort();
  }, [zoneId, checkIn, checkOut, numGuests]);

  useEffect(() => {
    if (followQuote && quotedCents != null) {
      setTotalEuros(centsToEurosInput(quotedCents));
    }
  }, [followQuote, quotedCents]);

  useEffect(() => {
    const plate = vehiclePlate.trim();
    if (!plate) {
      setPayments([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingClientPayments(true);
      fetch(`/api/admin/client-payments?vehicle_plate=${encodeURIComponent(plate)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setPayments(data.payments ?? []);
        })
        .catch(() => {})
        .finally(() => setLoadingClientPayments(false));
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [vehiclePlate]);

  function formatStayLabel(payment: AdminReservationPayment): string {
    const from = format(new Date(payment.check_in), "dd/MM/yyyy", { locale: adminDateLocale });
    const to = format(new Date(payment.check_out), "dd/MM/yyyy", { locale: adminDateLocale });
    const pitch = payment.pitch_code ?? "—";
    return `${from} → ${to} · ${pitch}`;
  }

  async function handleAddPayment() {
    if (!isEdit || !initialReservation?.id) return;

    const amountCents = eurosToCents(newPaymentEuros);
    if (amountCents <= 0) {
      setError(adminT.reservationForm.paymentAmountRequired);
      return;
    }
    if (!newPaymentMethod) {
      setError(adminT.reservationForm.selectPaymentMethod);
      return;
    }
    if (amountCents > balanceCents) {
      setError(adminT.reservationForm.paymentExceedsBalance);
      return;
    }

    setAddingPayment(true);
    setError(null);

    const res = await fetch(`/api/admin/reservations/${initialReservation.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_cents: amountCents,
        payment_method: newPaymentMethod,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setAddingPayment(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : adminT.reservationForm.addPaymentError);
      return;
    }

    const historyRes = await fetch(
      `/api/admin/client-payments?vehicle_plate=${encodeURIComponent(vehiclePlate.trim())}`
    );
    const historyData = await historyRes.json().catch(() => ({ payments: [] }));
    setPayments(historyData.payments ?? []);
    setPaidCents(data.paid_cents ?? paidCents + amountCents);
    setNewPaymentEuros("");
    setNewPaymentMethod("");
  }

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
    if (totalCents <= 0) {
      setError(adminT.reservationForm.invalidTotal);
      return;
    }
    if (!vehiclePlate.trim()) {
      setError(adminT.reservationForm.plateRequired);
      return;
    }

    const initialPaymentCents = isEdit ? 0 : eurosToCents(initialPaymentEuros);
    if (!isEdit && initialPaymentCents > 0 && !initialPaymentMethod) {
      setError(adminT.reservationForm.selectPaymentMethod);
      return;
    }
    if (!isEdit && initialPaymentCents > totalCents) {
      setError(adminT.reservationForm.paymentExceedsBalance);
      return;
    }

    setSubmitting(true);

    const basePayload = {
      zone_id: zoneId,
      pitch_code: pitchCode,
      check_in: checkIn,
      check_out: checkOut,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      guest_country: guestCountry || undefined,
      vehicle_plate: vehiclePlate.trim(),
      num_guests: numGuests,
      notes: notes || undefined,
      operational_notes: operationalNotes || undefined,
      total_cents: totalCents,
    };

    const res = await fetch(
      isEdit ? `/api/admin/reservations/${initialReservation.id}` : "/api/admin/reservations",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? basePayload
            : {
                ...basePayload,
                initial_payment_cents: initialPaymentCents,
                initial_payment_method: initialPaymentMethod || null,
              }
        ),
      }
    );

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : isEdit
            ? adminT.reservationForm.updateError
            : adminT.reservationForm.createError
      );
      return;
    }

    if (isEdit) {
      setPaidCents(data.paid_cents ?? paidCents);
      const isCompletedReservation =
        initialReservation?.status &&
        COMPLETED_RESERVATION_STATUSES.includes(
          initialReservation.status as (typeof COMPLETED_RESERVATION_STATUSES)[number]
        );
      router.push(isCompletedReservation ? "/admin/reservations/completed" : "/admin/reservations");
    } else if (data.reservation_id) {
      router.push(`/admin/reservations/${data.reservation_id}/edit`);
    } else {
      router.push("/admin/reservations");
    }
    router.refresh();
  }

  async function handleSendConfirmation() {
    if (!isEdit || !initialReservation?.id) return;

    setSendingEmail(true);
    setEmailMessage(null);
    setError(null);

    const res = await fetch(
      `/api/admin/reservations/${initialReservation.id}/send-confirmation`,
      { method: "POST" }
    );
    const data = await res.json().catch(() => ({}));
    setSendingEmail(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : adminT.reservationForm.sendConfirmationError);
      return;
    }

    setEmailMessage(
      adminT.reservationForm.sendConfirmationSuccess.replace("{email}", data.sent_to ?? guestEmail)
    );
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
          <CardDescription>
            {isEdit ? adminT.reservationForm.editDescription : adminT.reservationForm.stayDescription}
          </CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="total_euros">{adminT.reservationForm.billableTotal}</Label>
            <Input
              id="total_euros"
              type="number"
              min={0}
              step={0.01}
              value={totalEuros}
              onChange={(event) => {
                setFollowQuote(false);
                setTotalEuros(event.target.value);
              }}
              required
              className="mt-1"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {loadingQuote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>
                {adminT.reservationForm.calculatedQuote.replace(
                  "{amount}",
                  quotedCents != null ? formatPrice(quotedCents) : "—"
                )}
              </span>
              {quotedCents != null && !followQuote && (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setFollowQuote(true)}
                >
                  {adminT.reservationForm.useCalculatedQuote}
                </Button>
              )}
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
            <Label htmlFor="guest_country">{adminT.reservationForm.country}</Label>
            <Input
              id="guest_country"
              value={guestCountry}
              onChange={(event) => setGuestCountry(event.target.value)}
              placeholder={adminT.reservationForm.countryPlaceholder}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="vehicle_plate">{adminT.common.plateClientId}</Label>
            <Input
              id="vehicle_plate"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value.toUpperCase())}
              required
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
          <CardDescription>
            {isEdit
              ? adminT.reservationForm.paymentHistoryDescription
              : adminT.reservationForm.initialPaymentDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vehiclePlate.trim() ? (
            <>
              {loadingClientPayments && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {adminT.common.loading}
                </div>
              )}
              {payments.length === 0 && !loadingClientPayments ? (
                <p className="text-sm text-muted-foreground">{adminT.reservationForm.noPayments}</p>
              ) : payments.length > 0 ? (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{adminT.reservationForm.paymentDate}</TableHead>
                      <TableHead>{adminT.reservationForm.paymentStay}</TableHead>
                      <TableHead>{adminT.reservationForm.paymentAmount}</TableHead>
                      <TableHead>{adminT.reservationForm.paymentMethod}</TableHead>
                      <TableHead>{adminT.reservationForm.paymentNotes}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const isCurrentReservation =
                        isEdit && payment.reservation_id === initialReservation?.id;

                      return (
                        <TableRow
                          key={payment.id}
                          className={isCurrentReservation ? "bg-primary/5" : undefined}
                        >
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(payment.created_at), "dd MMM yyyy HH:mm", {
                              locale: adminDateLocale,
                            })}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>{formatStayLabel(payment)}</div>
                            {isCurrentReservation && (
                              <span className="text-xs font-medium text-primary">
                                {adminT.reservationForm.currentReservationPayment}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatPrice(payment.amount_cents)}
                          </TableCell>
                          <TableCell>{paymentMethodLabel(payment.payment_method)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.notes ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{adminT.reservationForm.plateRequired}</p>
          )}

          {isEdit ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="new_payment">{adminT.reservationForm.addPaymentAmount}</Label>
                <Input
                  id="new_payment"
                  type="number"
                  min={0}
                  step={0.01}
                  max={balanceCents / 100}
                  value={newPaymentEuros}
                  onChange={(event) => setNewPaymentEuros(event.target.value)}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new_payment_method">{adminT.reservationForm.paymentMethod}</Label>
                <select
                  id="new_payment_method"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={newPaymentMethod}
                  onChange={(event) => setNewPaymentMethod(event.target.value)}
                >
                  <option value="">{adminT.common.select}</option>
                  {ADMIN_PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={addingPayment || submitting}
                onClick={handleAddPayment}
              >
                {addingPayment ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {adminT.reservationForm.addPayment}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="initial_payment">{adminT.reservationForm.initialPayment}</Label>
                <Input
                  id="initial_payment"
                  type="number"
                  min={0}
                  step={0.01}
                  value={initialPaymentEuros}
                  onChange={(event) => setInitialPaymentEuros(event.target.value)}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="initial_payment_method">{adminT.reservationForm.paymentMethod}</Label>
                <select
                  id="initial_payment_method"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={initialPaymentMethod}
                  onChange={(event) => setInitialPaymentMethod(event.target.value)}
                >
                  <option value="">{adminT.common.select}</option>
                  {ADMIN_PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div>
              <p className="text-muted-foreground">{adminT.common.total}</p>
              <p className="font-semibold">{formatPrice(totalCents)}</p>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={submitting || sendingEmail || addingPayment}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? adminT.reservationForm.saveChanges : adminT.reservationForm.create}
        </Button>

        {isEdit && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={submitting || sendingEmail || addingPayment}
            onClick={handleSendConfirmation}
          >
            {sendingEmail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {adminT.reservationForm.sendConfirmation}
          </Button>
        )}

        {isEdit && initialReservation && (
          <DeleteReservationButton
            reservationId={initialReservation.id}
            guestName={guestName || initialReservation.guest_name}
            redirectTo={
              initialReservation.status &&
              COMPLETED_RESERVATION_STATUSES.includes(
                initialReservation.status as (typeof COMPLETED_RESERVATION_STATUSES)[number]
              )
                ? "/admin/reservations/completed"
                : "/admin/reservations"
            }
            size="lg"
            variant="outline"
          />
        )}
      </div>

      {emailMessage && <p className="text-sm text-muted-foreground">{emailMessage}</p>}
    </form>
  );
}
