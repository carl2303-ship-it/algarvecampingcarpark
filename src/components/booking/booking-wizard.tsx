"use client";

import { useEffect, useMemo, useState } from "react";
import { format, addDays, startOfToday } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestCountStepper } from "@/components/ui/guest-count-stepper";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TermsDialog } from "@/components/legal/terms-dialog";
import { appendPublicEntryQuery } from "@/lib/gate-entry";
import { ParkPitchMap } from "@/components/marketing/park-pitch-map";
import { formatPrice } from "@/lib/pricing";
import {
  formatSeasonDayPt,
  getOnlineBookableSeason,
  isOnlineBookableCheckInDay,
  isOnlineBookableCheckOutDay,
} from "@/lib/park-settings";
import type { Locale, ParkSettings } from "@/lib/constants";
import { getTranslations, t as translate } from "@/lib/i18n";
import { dateFnsLocale } from "@/lib/locale-format";
import type { TermsContent } from "@/lib/legal/terms-content";
import type { ZoneAvailability } from "@/types/database";
import {
  getSpotZoneSlug,
  spotIsOver9m,
  type PitchMapSpot,
  type PricingZoneSlug,
} from "@/lib/park-pitch-map-defaults";
import { cn } from "@/lib/utils";

type Step = "details" | "pitch" | "pay";

type AvailablePitch = PitchMapSpot & {
  zone_id: string;
  zone_slug: string;
};

function resolvePricingZoneSlug(withElectricity: boolean): PricingZoneSlug {
  return withElectricity ? "com-eletricidade" : "sem-eletricidade";
}

function toLocalDay(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function BookingWizard({
  locale,
  preferredSpot = null,
  parkSettings,
  gateEntry = false,
  termsContent,
}: {
  locale: Locale;
  preferredSpot?: PitchMapSpot | null;
  parkSettings: ParkSettings;
  gateEntry?: boolean;
  termsContent: TermsContent;
}) {
  const tr = getTranslations(locale);
  const dateLocale = dateFnsLocale(locale);

  const preferredSlug = preferredSpot ? getSpotZoneSlug(preferredSpot) : null;

  const [step, setStep] = useState<Step>("details");
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [selectedZone, setSelectedZone] = useState<ZoneAvailability | null>(null);
  const [pitches, setPitches] = useState<AvailablePitch[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<AvailablePitch | null>(null);
  const [totalCents, setTotalCents] = useState(0);
  const [depositCents, setDepositCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [plateBlocked, setPlateBlocked] = useState(false);
  const [plateLookupMessage, setPlateLookupMessage] = useState<string | null>(null);
  const [numGuests, setNumGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [withElectricity, setWithElectricity] = useState(
    preferredSpot ? Boolean(preferredSpot.electric) : preferredSlug !== "sem-eletricidade"
  );
  const [over9m, setOver9m] = useState(preferredSpot ? spotIsOver9m(preferredSpot) : false);

  const checkInStr = checkIn ? format(checkIn, "yyyy-MM-dd") : "";
  const checkOutStr = checkOut ? format(checkOut, "yyyy-MM-dd") : "";
  const steps: Step[] = useMemo(() => ["details", "pitch", "pay"], []);

  // Public online booking: lock calendar to annual season. Desk/gate QR can pick any future date.
  const bookableSeason = useMemo(
    () =>
      gateEntry
        ? { fromMd: null, untilMd: null }
        : getOnlineBookableSeason(parkSettings),
    [gateEntry, parkSettings]
  );

  useEffect(() => {
    if (!preferredSpot) return;
    const label = translate(locale, "book.preferred_pitch", { code: preferredSpot.code });
    setNotes((current) => current || label);
  }, [preferredSpot, locale]);

  useEffect(() => {
    const plate = vehiclePlate.trim();
    if (plate.length < 3) {
      setPlateBlocked(false);
      setPlateLookupMessage(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/bookings/plate-lookup?vehicle_plate=${encodeURIComponent(plate)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.activeReservation) {
            setPlateBlocked(true);
            setPlateLookupMessage(
              tr.book.vehicle_plate_active.replace(
                "{dates}",
                `${data.activeReservation.check_in} → ${data.activeReservation.check_out}`
              )
            );
            return;
          }

          setPlateBlocked(false);
          if (data.guest) {
            setGuestName(data.guest.name || "");
            setGuestEmail(data.guest.email || "");
            setGuestPhone(data.guest.phone || "");
            if (data.guest.country) setGuestCountry(data.guest.country);
            setPlateLookupMessage(tr.book.vehicle_plate_autofilled);
          } else {
            setPlateLookupMessage(null);
          }
        })
        .catch(() => {});
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [vehiclePlate, tr.book.vehicle_plate_active, tr.book.vehicle_plate_autofilled]);

  async function continueToPitches() {
    if (!checkInStr || !checkOutStr) return;
    if (
      !guestName ||
      !guestEmail ||
      !guestPhone ||
      !guestCountry.trim() ||
      !vehiclePlate.trim() ||
      !acceptedTerms
    ) {
      setError(tr.book.terms_fill_required);
      return;
    }
    if (plateBlocked) {
      setError(plateLookupMessage || tr.book.vehicle_plate_active);
      return;
    }

    setLoading(true);
    setError(null);

    const targetSlug = resolvePricingZoneSlug(withElectricity);

    try {
      const availRes = await fetch(
        appendPublicEntryQuery(
          `/api/availability?check_in=${checkInStr}&check_out=${checkOutStr}&num_guests=${numGuests}`,
          { gateEntry }
        )
      );
      const availText = await availRes.text();
      let availData: { availability?: ZoneAvailability[]; error?: unknown } = {};
      try {
        availData = availText ? JSON.parse(availText) : {};
      } catch {
        throw new Error(tr.book.network_error);
      }
      if (!availRes.ok) {
        throw new Error(
          typeof availData.error === "string" ? availData.error : tr.book.network_error
        );
      }

      const zones = (availData.availability ?? []) as ZoneAvailability[];
      const zone = zones.find((item) => item.zone.slug === targetSlug);

      if (!zone) {
        setError(tr.book.no_pitches);
        setLoading(false);
        return;
      }

      const electricParam = withElectricity ? "&electric=true&electricity_amperage=6" : "&electric=false";
      const pitchRes = await fetch(
        appendPublicEntryQuery(
          `/api/availability/pitches?check_in=${checkInStr}&check_out=${checkOutStr}&zone_id=${zone.zone.id}&num_guests=${numGuests}${electricParam}&over_9m=${over9m ? "true" : "false"}`,
          { gateEntry }
        )
      );
      const pitchText = await pitchRes.text();
      let pitchData: {
        pitches?: AvailablePitch[];
        total_price_cents?: number;
        deposit_cents?: number;
        error?: unknown;
      } = {};
      try {
        pitchData = pitchText ? JSON.parse(pitchText) : {};
      } catch {
        throw new Error(tr.book.network_error);
      }
      if (!pitchRes.ok) {
        throw new Error(
          typeof pitchData.error === "string" ? pitchData.error : tr.book.network_error
        );
      }

      const list = (pitchData.pitches ?? []) as AvailablePitch[];
      setSelectedZone(zone);
      setPitches(list);
      const total = pitchData.total_price_cents ?? zone.total_price_cents;
      const charge =
        typeof pitchData.deposit_cents === "number" ? pitchData.deposit_cents : total;
      setTotalCents(total);
      setDepositCents(charge);

      if (list.length === 0) {
        setError(tr.book.no_pitches);
        setLoading(false);
        return;
      }

      const preferred =
        preferredSpot &&
        list.find((p) => p.code.toUpperCase() === preferredSpot.code.toUpperCase());
      setSelectedPitch(preferred ?? null);
      setStep("pitch");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const message =
        e instanceof TypeError
          ? tr.book.network_error
          : e instanceof Error
            ? e.message
            : tr.book.network_error;
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking() {
    if (!selectedZone || !selectedPitch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone.zone.id,
          pitch_code: selectedPitch.code,
          check_in: checkInStr,
          check_out: checkOutStr,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          guest_country: guestCountry.trim(),
          vehicle_plate: vehiclePlate.trim(),
          num_guests: numGuests,
          notes: notes || undefined,
          locale,
          gate_entry: gateEntry || undefined,
          over_9m: over9m || undefined,
          electricity_amperage: withElectricity ? 6 : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Erro");
      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar reserva");
      setLoading(false);
    }
  }

  const typeSummary = [
    over9m ? tr.book.type_over_9m : null,
    withElectricity ? tr.book.type_with_electricity : tr.book.type_without_electricity,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {preferredSpot && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="font-medium text-primary">
            {translate(locale, "book.preferred_pitch", { code: preferredSpot.code })}
          </p>
          <p className="text-muted-foreground mt-1">{tr.book.preferred_pitch_hint}</p>
        </div>
      )}

      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex-1 h-1 rounded-full",
              steps.indexOf(step) >= i ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>{tr.book.select_dates}</CardTitle>
            <CardDescription>
              {tr.book.check_in}: {parkSettings.check_in_time} · {tr.book.check_out}:{" "}
              {parkSettings.check_out_time}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>{tr.book.check_in}</Label>
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={(d) => {
                    setCheckIn(d);
                    if (d && checkOut && d >= checkOut) setCheckOut(addDays(d, 1));
                  }}
                  disabled={(d) =>
                    d < startOfToday() ||
                    (!gateEntry && !isOnlineBookableCheckInDay(parkSettings, toLocalDay(d)))
                  }
                  locale={dateLocale}
                  className="rounded-md border mt-2"
                />
              </div>
              <div>
                <Label>{tr.book.check_out}</Label>
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(d) =>
                    d < startOfToday() ||
                    (checkIn ? d <= checkIn : false) ||
                    (!gateEntry && !isOnlineBookableCheckOutDay(parkSettings, toLocalDay(d)))
                  }
                  locale={dateLocale}
                  className="rounded-md border mt-2"
                />
              </div>
            </div>
            {!gateEntry && (bookableSeason.fromMd || bookableSeason.untilMd) && (
              <p className="text-xs text-muted-foreground">
                {tr.book.online_period_hint
                  .replaceAll("{from}", formatSeasonDayPt(bookableSeason.fromMd))
                  .replaceAll("{until}", formatSeasonDayPt(bookableSeason.untilMd))}
              </p>
            )}
            {checkIn && checkOut && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(checkIn, "dd MMM yyyy", { locale: dateLocale })} →{" "}
                {format(checkOut, "dd MMM yyyy", { locale: dateLocale })}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="plate">{tr.book.vehicle_plate}</Label>
                <Input
                  id="plate"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  required
                />
                {plateLookupMessage && (
                  <p
                    className={
                      plateBlocked
                        ? "text-sm text-destructive"
                        : "text-sm text-emerald-700"
                    }
                  >
                    {plateLookupMessage}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{tr.book.guest_name}</Label>
                <Input
                  id="name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{tr.book.guest_country}</Label>
                <Input
                  id="country"
                  value={guestCountry}
                  onChange={(e) => setGuestCountry(e.target.value)}
                  placeholder={tr.book.guest_country_placeholder}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{tr.book.guest_email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
                <p
                  role="alert"
                  className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                >
                  {tr.book.email_confirm_alert}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{tr.book.guest_phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">{tr.book.num_guests}</Label>
                <GuestCountStepper
                  id="guests"
                  value={numGuests}
                  onChange={setNumGuests}
                  decreaseLabel={tr.book.guests_step_down}
                  increaseLabel={tr.book.guests_step_up}
                />
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <p className="font-medium text-sm">{tr.book.pitch_type_title}</p>

              <div className="space-y-2">
                <Label>{tr.book.electricity_label}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWithElectricity(true);
                    }}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                      withElectricity
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {tr.book.type_with_electricity}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithElectricity(false)}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                      !withElectricity
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {tr.book.type_without_electricity}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg border px-4 py-3 hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={over9m}
                  onChange={(event) => setOver9m(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">{tr.book.over_9m_label}</span>
                  <span className="block text-muted-foreground mt-0.5">
                    {tr.book.over_9m_hint}
                  </span>
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{tr.book.notes}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="rounded-xl border bg-muted/40 p-4 space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{tr.book.terms_notice_title}</p>
              <ul className="space-y-2 list-disc pl-5">
                <li>{tr.book.terms_refund_fees}</li>
                <li>{tr.book.terms_data_verification}</li>
                <li>{tr.book.pre_arrival_alert}</li>
              </ul>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
                />
                <span>
                  {tr.book.terms_accept_before}{" "}
                  <TermsDialog label={tr.book.terms_link} content={termsContent} />{" "}
                  {tr.book.terms_accept_after}
                </span>
              </label>
            </div>

            <Button
              type="button"
              onClick={continueToPitches}
              disabled={!checkIn || !checkOut || loading || plateBlocked || !vehiclePlate.trim()}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tr.book.continue}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "pitch" && selectedZone && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("details")}>
            ← {tr.book.step_dates}
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{tr.book.select_pitch}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {typeSummary} · {formatPrice(totalCents)} · {tr.book.pay_full}:{" "}
              {formatPrice(depositCents)}
            </p>
          </div>

          <ParkPitchMap
            locale={locale}
            spots={pitches}
            mode="booking"
            showFacilities
            hideHeader
            selectedPitchCode={selectedPitch?.code ?? null}
            onSelectPitch={(spot) => {
              const match = pitches.find((p) => p.code === spot.code);
              if (match) setSelectedPitch(match);
            }}
          />

          <div>
            <p className="text-sm font-medium mb-2">{tr.book.pitch_list_title}</p>
            <div className="flex flex-wrap gap-2">
              {pitches.map((spot) => (
                <Button
                  key={spot.code}
                  type="button"
                  size="sm"
                  variant={selectedPitch?.code === spot.code ? "default" : "outline"}
                  onClick={() => setSelectedPitch(spot)}
                >
                  {spot.code}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={() => setStep("pay")} disabled={!selectedPitch} className="w-full">
            {tr.book.continue}
            {selectedPitch ? ` — ${selectedPitch.code}` : ""}
          </Button>
        </div>
      )}

      {step === "pay" && selectedZone && selectedPitch && (
        <Card className="rounded-2xl shadow-lg border-primary/10">
          <CardHeader>
            <Button variant="ghost" className="w-fit -ml-2 mb-2" onClick={() => setStep("pitch")}>
              ← {tr.book.step_pitch}
            </Button>
            <CardTitle>
              {typeSummary} · {selectedPitch.code}
            </CardTitle>
            <CardDescription>
              {format(checkIn!, "dd MMM yyyy", { locale: dateLocale })} →{" "}
              {format(checkOut!, "dd MMM yyyy", { locale: dateLocale })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{tr.book.total}</span>
                <span className="font-semibold">{formatPrice(totalCents)}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>{tr.book.pay_full}</span>
                <span className="font-semibold">{formatPrice(depositCents)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              {tr.book.pre_arrival_alert}
            </div>

            <Button onClick={submitBooking} disabled={loading} className="w-full" size="lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tr.book.pay_full} — {formatPrice(depositCents)}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
