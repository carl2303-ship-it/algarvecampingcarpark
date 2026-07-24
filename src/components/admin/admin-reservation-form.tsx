"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Mail, Plus } from "lucide-react";
import { DeleteReservationButton } from "@/components/admin/delete-reservation-button";
import { CheckOutButton } from "@/components/admin/check-out-button";
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
import { getSpotZoneSlug, spotIsOver9m } from "@/lib/park-pitch-map-defaults";
import type { PitchMapSpotRecord } from "@/lib/pitch-map";
import type { Zone } from "@/types/database";
import { formatPrice } from "@/lib/pricing";
import type { PricingSupplement } from "@/lib/pricing-supplements";
import { cn } from "@/lib/utils";

type Props = {
  zones: Zone[];
  spots: PitchMapSpotRecord[];
  pricingSupplements?: PricingSupplement[];
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
  pitch_id?: string | null;
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
  motorhome_over_9m?: boolean;
  electricity_amperage?: 6 | 10 | null;
  manual_supplement_ids?: string[];
  pre_arrival_email_sent_at?: string | null;
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
  pricingSupplements = [],
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
  const isPendingPayment = isEdit && initialReservation?.status === "pending_payment";
  const showReserveWithoutPayment = !isEdit || isPendingPayment;

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
  const [reserveWithoutPayment, setReserveWithoutPayment] = useState(false);
  const [plateLookupMessage, setPlateLookupMessage] = useState<string | null>(null);
  const [plateBlocked, setPlateBlocked] = useState(false);
  const [payments, setPayments] = useState(initialPayments);
  const [paidCents, setPaidCents] = useState(initialReservation?.paid_cents ?? 0);
  const [newPaymentEuros, setNewPaymentEuros] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);
  const [loadingClientPayments, setLoadingClientPayments] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPreArrival, setSendingPreArrival] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [preArrivalSentAt, setPreArrivalSentAt] = useState(
    initialReservation?.pre_arrival_email_sent_at ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [extendCheckOut, setExtendCheckOut] = useState("");
  const [extendSendLink, setExtendSendLink] = useState(true);
  const [extending, setExtending] = useState(false);
  const [extendQuoteCents, setExtendQuoteCents] = useState<number | null>(null);
  const [extendNights, setExtendNights] = useState(0);
  const [extendQuoteError, setExtendQuoteError] = useState<string | null>(null);
  const [loadingExtendQuote, setLoadingExtendQuote] = useState(false);
  const [extendMessage, setExtendMessage] = useState<string | null>(null);
  const [motorhomeOver9m, setMotorhomeOver9m] = useState(
    initialReservation?.motorhome_over_9m ?? false
  );
  const [electricityAmperage, setElectricityAmperage] = useState<6 | 10 | null>(
    initialReservation?.electricity_amperage ?? 6
  );
  const [manualSupplementIds, setManualSupplementIds] = useState<string[]>(
    initialReservation?.manual_supplement_ids ?? []
  );

  const motorhomeSupplement = pricingSupplements.find((item) => item.slug === "motorhome_over_9m");
  const electricity10aSupplement = pricingSupplements.find((item) => item.slug === "electricity_10a");
  const manualSupplements = pricingSupplements.filter(
    (item) => item.trigger_type === "manual_per_night" && item.applies_admin && item.active
  );

  const canExtend =
    isEdit &&
    initialReservation?.status &&
    ["confirmed", "checked_in"].includes(initialReservation.status);

  const selectedSpot = sortedSpots.find((spot) => spot.code === pitchCode);
  const zoneSlug = selectedSpot ? getSpotZoneSlug(selectedSpot) : null;
  const zoneId = zones.find((zone) => zone.slug === zoneSlug)?.id ?? "";
  const pitchHasElectricity = Boolean(selectedSpot?.electric);

  useEffect(() => {
    if (!pitchHasElectricity) {
      setElectricityAmperage(null);
    } else if (electricityAmperage == null) {
      setElectricityAmperage(6);
    }
  }, [pitchHasElectricity, pitchCode]);

  const quoteAmperageParam =
    pitchHasElectricity && electricityAmperage != null
      ? `&electricity_amperage=${electricityAmperage}`
      : "";

  const quoteManualParam =
    manualSupplementIds.length > 0
      ? `&manual_supplement_ids=${manualSupplementIds.join(",")}`
      : "";

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
      `/api/admin/reservations/quote?zone_id=${zoneId}&check_in=${checkIn}&check_out=${checkOut}&num_guests=${numGuests}&over_9m=${motorhomeOver9m ? "true" : "false"}${quoteAmperageParam}${quoteManualParam}`,
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
  }, [zoneId, checkIn, checkOut, numGuests, motorhomeOver9m, quoteAmperageParam, quoteManualParam]);

  useEffect(() => {
    if (followQuote && quotedCents != null) {
      setTotalEuros(centsToEurosInput(quotedCents));
    }
  }, [followQuote, quotedCents]);

  useEffect(() => {
    const plate = vehiclePlate.trim();
    if (!plate) {
      setPayments([]);
      setPlateLookupMessage(null);
      setPlateBlocked(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingClientPayments(true);
      const excludeParam =
        isEdit && initialReservation?.id
          ? `&exclude_id=${encodeURIComponent(initialReservation.id)}`
          : "";

      Promise.all([
        fetch(`/api/admin/client-payments?vehicle_plate=${encodeURIComponent(plate)}`, {
          signal: controller.signal,
        }).then((res) => res.json()),
        fetch(
          `/api/admin/clients/by-plate?vehicle_plate=${encodeURIComponent(plate)}${excludeParam}`,
          { signal: controller.signal }
        ).then((res) => res.json()),
      ])
        .then(([paymentsData, lookupData]) => {
          setPayments(paymentsData.payments ?? []);

          const active = lookupData.activeReservation;
          if (active) {
            const pitch = active.pitch_code ? ` · ${active.pitch_code}` : "";
            setPlateBlocked(true);
            setPlateLookupMessage(
              adminT.reservationForm.plateActiveReservation
                .replace("{dates}", `${active.check_in} → ${active.check_out}`)
                .replace("{pitch}", pitch)
            );
          } else {
            setPlateBlocked(false);
            if (lookupData.guest && !isEdit) {
              setGuestName(lookupData.guest.name || "");
              setGuestEmail(lookupData.guest.email || "");
              setGuestPhone(lookupData.guest.phone || "");
              setGuestCountry(lookupData.guest.country || "");
              setPlateLookupMessage(adminT.reservationForm.plateAutofilled);
            } else if (lookupData.guest && isEdit) {
              // Only fill empty fields when editing
              if (!guestName.trim()) setGuestName(lookupData.guest.name || "");
              if (!guestEmail.trim()) setGuestEmail(lookupData.guest.email || "");
              if (!guestPhone.trim()) setGuestPhone(lookupData.guest.phone || "");
              if (!guestCountry.trim() && lookupData.guest.country) {
                setGuestCountry(lookupData.guest.country);
              }
              setPlateLookupMessage(null);
            } else {
              setPlateLookupMessage(null);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingClientPayments(false));
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autofill only when plate changes
  }, [vehiclePlate, isEdit, initialReservation?.id]);

  useEffect(() => {
    if (!canExtend || !initialReservation || !extendCheckOut || !zoneId) {
      setExtendQuoteCents(null);
      setExtendNights(0);
      setExtendQuoteError(null);
      return;
    }

    if (extendCheckOut <= initialReservation.check_out) {
      setExtendQuoteCents(null);
      setExtendNights(0);
      setExtendQuoteError(adminT.reservationForm.extendUnavailable);
      return;
    }

    const controller = new AbortController();
    setLoadingExtendQuote(true);
    setExtendQuoteError(null);

    fetch(
      `/api/admin/reservations/quote?zone_id=${zoneId}&check_in=${initialReservation.check_in}&check_out=${extendCheckOut}&num_guests=${numGuests}&over_9m=${motorhomeOver9m ? "true" : "false"}${quoteAmperageParam}${quoteManualParam}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.pricing?.totalCents != null) {
          const extra = Math.max(0, data.pricing.totalCents - totalCents);
          setExtendQuoteCents(extra);
          const oldOut = new Date(initialReservation.check_out + "T12:00:00");
          const newOut = new Date(extendCheckOut + "T12:00:00");
          setExtendNights(
            Math.max(
              0,
              Math.round((newOut.getTime() - oldOut.getTime()) / (1000 * 60 * 60 * 24))
            )
          );
        } else {
          setExtendQuoteCents(null);
          setExtendQuoteError(adminT.reservationForm.extendUnavailable);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setExtendQuoteCents(null);
          setExtendQuoteError(adminT.reservationForm.quoteError);
        }
      })
      .finally(() => setLoadingExtendQuote(false));

    return () => controller.abort();
  }, [
    canExtend,
    initialReservation,
    extendCheckOut,
    zoneId,
    numGuests,
    totalCents,
    motorhomeOver9m,
    quoteAmperageParam,
    quoteManualParam,
  ]);

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
    if (plateBlocked) {
      setError(plateLookupMessage || adminT.reservationForm.plateActiveReservation);
      return;
    }

    const initialPaymentCents =
      isEdit || reserveWithoutPayment ? 0 : eurosToCents(initialPaymentEuros);
    if (!isEdit && !reserveWithoutPayment && initialPaymentCents > 0 && !initialPaymentMethod) {
      setError(adminT.reservationForm.selectPaymentMethod);
      return;
    }
    if (!isEdit && !reserveWithoutPayment && initialPaymentCents > totalCents) {
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
      guest_country: guestCountry.trim(),
      vehicle_plate: vehiclePlate.trim(),
      num_guests: numGuests,
      notes: notes || undefined,
      operational_notes: operationalNotes || undefined,
      total_cents: totalCents,
      motorhome_over_9m: motorhomeOver9m,
      electricity_amperage: pitchHasElectricity ? (electricityAmperage ?? 6) : null,
      manual_supplement_ids: manualSupplementIds,
    };

    const res = await fetch(
      isEdit ? `/api/admin/reservations/${initialReservation.id}` : "/api/admin/reservations",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? {
                ...basePayload,
                ...(isPendingPayment
                  ? { confirm_without_payment: reserveWithoutPayment }
                  : {}),
              }
            : {
                ...basePayload,
                initial_payment_cents: initialPaymentCents,
                initial_payment_method: reserveWithoutPayment
                  ? null
                  : initialPaymentMethod || null,
                confirm_without_payment: reserveWithoutPayment,
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

  async function handleSendPreArrival(force = false) {
    if (!isEdit || !initialReservation?.id) return;

    if (preArrivalSentAt && !force) {
      const ok = window.confirm(adminT.reservationForm.sendPreArrivalAlready);
      if (!ok) return;
      force = true;
    }

    setSendingPreArrival(true);
    setEmailMessage(null);
    setError(null);

    const url = `/api/admin/reservations/${initialReservation.id}/send-pre-arrival${force ? "?force=1" : ""}`;
    const res = await fetch(url, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSendingPreArrival(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : adminT.reservationForm.sendPreArrivalError);
      return;
    }

    setPreArrivalSentAt(new Date().toISOString());
    setEmailMessage(
      adminT.reservationForm.sendPreArrivalSuccess.replace("{email}", data.sent_to ?? guestEmail)
    );
  }

  async function handleExtend() {
    if (!isEdit || !initialReservation?.id || !extendCheckOut) return;

    setExtending(true);
    setError(null);
    setExtendMessage(null);

    const res = await fetch(`/api/admin/reservations/${initialReservation.id}/extend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        check_out: extendCheckOut,
        send_payment_link: extendSendLink,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setExtending(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : adminT.reservationForm.extendError);
      return;
    }

    const amount = formatPrice(data.extension_cents ?? 0);
    setExtendMessage(
      (data.extension_cents ?? 0) > 0
        ? adminT.reservationForm.extendSuccess
            .replace("{date}", data.check_out)
            .replace("{amount}", amount)
        : adminT.reservationForm.extendSuccessNoCharge.replace("{date}", data.check_out)
    );
    setCheckOut(data.check_out);
    setTotalEuros(centsToEurosInput(data.total_cents ?? totalCents));
    setFollowQuote(false);
    setExtendCheckOut("");
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
                  {spotIsOver9m(spot)
                    ? ` ${adminT.reservationForm.longPitch}`
                    : ""}
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

          <div className="sm:col-span-2 rounded-xl border p-4 space-y-4">
            <p className="font-medium text-sm">{adminT.reservationForm.supplementsTitle}</p>

            <label className="flex items-start gap-3 cursor-pointer rounded-lg border px-4 py-3 hover:bg-muted/40">
              <input
                type="checkbox"
                checked={motorhomeOver9m}
                onChange={(event) => setMotorhomeOver9m(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">
                  {motorhomeSupplement?.name_pt ?? adminT.reservationForm.supplementOver9mLabel}
                </span>
                <span className="block text-muted-foreground mt-0.5">
                  {motorhomeSupplement?.description_pt ?? adminT.reservationForm.supplementOver9mHint}
                  {motorhomeSupplement ? (
                    <span className="block mt-1">
                      {formatPrice(motorhomeSupplement.amount_cents_per_night)} / nuit
                    </span>
                  ) : null}
                </span>
              </span>
            </label>

            {pitchHasElectricity && (
              <div className="space-y-2">
                <Label>{adminT.reservationForm.supplementElectricityLabel}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setElectricityAmperage(6)}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                      electricityAmperage === 6
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {adminT.reservationForm.supplement6a}
                  </button>
                  <button
                    type="button"
                    onClick={() => setElectricityAmperage(10)}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                      electricityAmperage === 10
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                      <span className="font-medium">{adminT.reservationForm.supplement10a}</span>
                      <span className="block text-muted-foreground mt-0.5 text-xs">
                        {electricity10aSupplement
                          ? `${formatPrice(electricity10aSupplement.amount_cents_per_night)} / nuit`
                          : adminT.reservationForm.supplement10aHint}
                      </span>
                  </button>
                </div>
              </div>
            )}

            {manualSupplements.map((supplement) => (
              <label
                key={supplement.id}
                className="flex items-start gap-3 cursor-pointer rounded-lg border px-4 py-3 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={manualSupplementIds.includes(supplement.id)}
                  onChange={(event) => {
                    setManualSupplementIds((current) =>
                      event.target.checked
                        ? [...current, supplement.id]
                        : current.filter((id) => id !== supplement.id)
                    );
                  }}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">{supplement.name_pt}</span>
                  {supplement.description_pt && (
                    <span className="block text-muted-foreground mt-0.5">
                      {supplement.description_pt}
                    </span>
                  )}
                  <span className="block text-muted-foreground mt-0.5 text-xs">
                    {formatPrice(supplement.amount_cents_per_night)} / nuit
                  </span>
                </span>
              </label>
            ))}
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

      {isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>{adminT.reservationForm.extendTitle}</CardTitle>
            <CardDescription>
              {canExtend
                ? adminT.reservationForm.extendDescription
                : adminT.reservationForm.extendNotEligible}
            </CardDescription>
          </CardHeader>
          {canExtend && (
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="extend_check_out">
                    {adminT.reservationForm.extendNewDeparture}
                  </Label>
                  <Input
                    id="extend_check_out"
                    type="date"
                    min={checkOut || undefined}
                    value={extendCheckOut}
                    onChange={(event) => setExtendCheckOut(event.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-col justify-end text-sm text-muted-foreground">
                  {loadingExtendQuote && (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {adminT.common.loading}
                    </span>
                  )}
                  {!loadingExtendQuote && extendQuoteError && (
                    <span className="text-destructive">{extendQuoteError}</span>
                  )}
                  {!loadingExtendQuote && extendQuoteCents != null && !extendQuoteError && (
                    <span>
                      {adminT.reservationForm.extendQuote
                        .replace("{amount}", formatPrice(extendQuoteCents))
                        .replace("{nights}", String(extendNights))}
                    </span>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={extendSendLink}
                  onChange={(event) => setExtendSendLink(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-input accent-primary"
                />
                <span>{adminT.reservationForm.extendSendLink}</span>
              </label>

              <Button
                type="button"
                variant="outline"
                disabled={
                  extending ||
                  !extendCheckOut ||
                  extendQuoteCents == null ||
                  Boolean(extendQuoteError) ||
                  loadingExtendQuote
                }
                onClick={handleExtend}
              >
                {extending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {adminT.reservationForm.extendSubmit}
              </Button>

              {extendMessage && (
                <p className="text-sm text-muted-foreground">{extendMessage}</p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{adminT.reservationForm.clientData}</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="vehicle_plate">{adminT.common.plateClientId}</Label>
            <Input
              id="vehicle_plate"
              value={vehiclePlate}
              onChange={(event) => setVehiclePlate(event.target.value.toUpperCase())}
              required
              className="mt-1"
            />
            {plateLookupMessage && (
              <p
                className={
                  plateBlocked
                    ? "mt-1 text-sm text-destructive"
                    : "mt-1 text-sm text-emerald-700"
                }
              >
                {plateLookupMessage}
              </p>
            )}
          </div>
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
            <p
              role="alert"
              className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            >
              {adminT.reservationForm.emailConfirmAlert}
            </p>
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
            <div className="space-y-4">
              {isPendingPayment && (
                <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reserveWithoutPayment}
                    onChange={(event) => setReserveWithoutPayment(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <span>
                    <span className="block font-medium">
                      {adminT.reservationForm.reserveWithoutPayment}
                    </span>
                    <span className="block text-sm text-muted-foreground mt-0.5">
                      {adminT.reservationForm.reserveWithoutPaymentHint}
                    </span>
                  </span>
                </label>
              )}
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
            </div>
          ) : (
            <div className="space-y-4">
              {showReserveWithoutPayment && (
                <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reserveWithoutPayment}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setReserveWithoutPayment(checked);
                      if (checked) {
                        setInitialPaymentEuros("");
                        setInitialPaymentMethod("");
                      }
                    }}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <span>
                    <span className="block font-medium">
                      {adminT.reservationForm.reserveWithoutPayment}
                    </span>
                    <span className="block text-sm text-muted-foreground mt-0.5">
                      {adminT.reservationForm.reserveWithoutPaymentHint}
                    </span>
                  </span>
                </label>
              )}

              {!reserveWithoutPayment && (
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
                    <Label htmlFor="initial_payment_method">
                      {adminT.reservationForm.paymentMethod}
                    </Label>
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
        <Button
          type="submit"
          size="lg"
          disabled={submitting || sendingEmail || sendingPreArrival || addingPayment || plateBlocked}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? adminT.reservationForm.saveChanges : adminT.reservationForm.create}
        </Button>

        {isEdit && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={submitting || sendingEmail || sendingPreArrival || addingPayment}
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

        {isEdit && (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={submitting || sendingEmail || sendingPreArrival || addingPayment || !pitchCode}
            onClick={() => handleSendPreArrival(false)}
          >
            {sendingPreArrival ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {adminT.reservationForm.sendPreArrival}
          </Button>
        )}

        {isEdit &&
          initialReservation &&
          (initialReservation.status === "confirmed" ||
            initialReservation.status === "checked_in") && (
            <CheckOutButton
              reservationId={initialReservation.id}
              pitchId={initialReservation.pitch_id ?? null}
              pitchCode={initialReservation.pitch_code ?? pitchCode ?? null}
              size="lg"
              variant="secondary"
              redirectTo="/admin/reservations"
            />
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

      {isEdit && (
        <p className="text-xs text-muted-foreground">
          {preArrivalSentAt
            ? adminT.reservationForm.preArrivalSentAt.replace(
                "{date}",
                new Date(preArrivalSentAt).toLocaleString("fr-FR")
              )
            : adminT.reservationForm.preArrivalNotSent}
        </p>
      )}

      {emailMessage && <p className="text-sm text-muted-foreground">{emailMessage}</p>}
    </form>
  );
}
