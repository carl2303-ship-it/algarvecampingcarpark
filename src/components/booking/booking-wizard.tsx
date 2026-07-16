"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, addDays, startOfToday } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/pricing";
import type { Locale, ParkSettings } from "@/lib/constants";
import { getTranslations, t as translate } from "@/lib/i18n";
import { dateFnsLocale } from "@/lib/locale-format";
import { localePath } from "@/lib/locale-path";
import type { ZoneAvailability } from "@/types/database";
import {
  PARK_AERIAL_ASPECT_CLASS,
  PARK_AERIAL_IMAGE,
  PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
  getSpotMarkerClass,
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

export function BookingWizard({
  locale,
  preferredSpot = null,
  parkSettings,
}: {
  locale: Locale;
  preferredSpot?: PitchMapSpot | null;
  parkSettings: ParkSettings;
}) {
  const tr = getTranslations(locale);
  const dateLocale = dateFnsLocale(locale);
  const termsPath = localePath(locale, "/terms");

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
  const [vehiclePlate, setVehiclePlate] = useState("");
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

  useEffect(() => {
    if (!preferredSpot) return;
    const label = translate(locale, "book.preferred_pitch", { code: preferredSpot.code });
    setNotes((current) => current || label);
  }, [preferredSpot, locale]);

  async function continueToPitches() {
    if (!checkInStr || !checkOutStr) return;
    if (!guestName || !guestEmail || !guestPhone || !acceptedTerms) {
      setError(tr.book.terms_fill_required);
      return;
    }

    setLoading(true);
    setError(null);

    const targetSlug = resolvePricingZoneSlug(withElectricity);

    try {
      const availRes = await fetch(
        `/api/availability?check_in=${checkInStr}&check_out=${checkOutStr}&num_guests=${numGuests}`
      );
      const availData = await availRes.json();
      if (!availRes.ok) throw new Error(availData.error ?? "Erro");

      const zones = (availData.availability ?? []) as ZoneAvailability[];
      const zone = zones.find((item) => item.zone.slug === targetSlug);

      if (!zone) {
        setError(tr.book.no_pitches);
        setLoading(false);
        return;
      }

      const pitchRes = await fetch(
        `/api/availability/pitches?check_in=${checkInStr}&check_out=${checkOutStr}&zone_id=${zone.zone.id}&num_guests=${numGuests}&electric=${withElectricity ? "true" : "false"}&over_9m=${over9m ? "true" : "false"}`
      );
      const pitchData = await pitchRes.json();
      if (!pitchRes.ok) {
        throw new Error(typeof pitchData.error === "string" ? pitchData.error : "Erro");
      }

      const list = (pitchData.pitches ?? []) as AvailablePitch[];
      setSelectedZone(zone);
      setPitches(list);
      setTotalCents(pitchData.total_price_cents ?? zone.total_price_cents);
      setDepositCents(
        pitchData.deposit_cents ??
          Math.round((pitchData.total_price_cents ?? zone.total_price_cents) * 0.5)
      );

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao verificar disponibilidade");
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
          vehicle_plate: vehiclePlate || undefined,
          num_guests: numGuests,
          notes: notes || undefined,
          locale,
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
                  disabled={(d) => d < startOfToday()}
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
                  disabled={(d) => d < startOfToday() || (checkIn ? d <= checkIn : false)}
                  locale={dateLocale}
                  className="rounded-md border mt-2"
                />
              </div>
            </div>
            {checkIn && checkOut && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(checkIn, "dd MMM yyyy", { locale: dateLocale })} →{" "}
                {format(checkOut, "dd MMM yyyy", { locale: dateLocale })}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
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
                <Label htmlFor="email">{tr.book.guest_email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
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
                <Label htmlFor="plate">{tr.book.vehicle_plate}</Label>
                <Input
                  id="plate"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">{tr.book.num_guests}</Label>
                <Input
                  id="guests"
                  type="number"
                  min={1}
                  max={10}
                  value={numGuests}
                  onChange={(e) => setNumGuests(parseInt(e.target.value, 10) || 1)}
                  className="max-w-[120px]"
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
                    onClick={() => setWithElectricity(true)}
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
                  <Link href={termsPath} className="text-primary underline underline-offset-2">
                    {tr.book.terms_link}
                  </Link>{" "}
                  {tr.book.terms_accept_after}
                </span>
              </label>
            </div>

            <Button
              onClick={continueToPitches}
              disabled={!checkIn || !checkOut || loading}
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
              {typeSummary} · {formatPrice(totalCents)} · {tr.book.deposit}:{" "}
              {formatPrice(depositCents)}
            </p>
          </div>

          <div
            className={cn(
              "relative mx-auto w-full overflow-hidden rounded-2xl border bg-muted",
              PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
              PARK_AERIAL_ASPECT_CLASS
            )}
          >
            <Image
              src={PARK_AERIAL_IMAGE}
              alt=""
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 1152px"
            />
            <div className="absolute inset-0">
              {pitches.map((spot) => (
                <button
                  key={spot.code}
                  type="button"
                  title={spot.code}
                  aria-label={spot.code}
                  onClick={() => setSelectedPitch(spot)}
                  className={cn(getSpotMarkerClass(spot, selectedPitch?.code === spot.code))}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                >
                  {spot.code}
                </button>
              ))}
            </div>
          </div>

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
                <span>{tr.book.deposit}</span>
                <span className="font-semibold">{formatPrice(depositCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{tr.book.balance_on_arrival}</span>
                <span>{formatPrice(totalCents - depositCents)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              {tr.book.pre_arrival_alert}
            </div>

            <Button onClick={submitBooking} disabled={loading} className="w-full" size="lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tr.book.pay} — {formatPrice(depositCents)}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
