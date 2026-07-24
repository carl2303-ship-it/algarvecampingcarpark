"use client";

import { useEffect, useState } from "react";
import { format, addDays, startOfToday } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TermsDialog } from "@/components/legal/terms-dialog";
import {
  formatPrice,
  ELECTRICITY_10A_SURCHARGE_CENTS_PER_NIGHT,
  type ElectricityAmperage,
} from "@/lib/pricing";
import type { Locale, ParkSettings } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { dateFnsLocale } from "@/lib/locale-format";
import type { TermsContent } from "@/lib/legal/terms-content";
import { cn } from "@/lib/utils";

export function ReceptionIntakeForm({
  locale,
  parkSettings,
  termsContent,
}: {
  locale: Locale;
  parkSettings: ParkSettings;
  termsContent: TermsContent;
}) {
  const tr = getTranslations(locale);
  const dateLocale = dateFnsLocale(locale);

  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [withElectricity, setWithElectricity] = useState(true);
  const [electricityAmperage, setElectricityAmperage] = useState<ElectricityAmperage>(6);
  const [over9m, setOver9m] = useState(false);

  const checkInStr = checkIn ? format(checkIn, "yyyy-MM-dd") : "";
  const checkOutStr = checkOut ? format(checkOut, "yyyy-MM-dd") : "";
  const amperage10SurchargeLabel = formatPrice(ELECTRICITY_10A_SURCHARGE_CENTS_PER_NIGHT);

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

  async function submitIntake() {
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
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_in: checkInStr,
          check_out: checkOutStr,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          guest_country: guestCountry.trim(),
          vehicle_plate: vehiclePlate.trim(),
          num_guests: numGuests,
          locale,
          reception_entry: true,
          over_9m: over9m || undefined,
          electricity_amperage: withElectricity ? electricityAmperage : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Erro");
      if (typeof data.redirect_url === "string") {
        window.location.href = data.redirect_url;
        return;
      }
      throw new Error("Erro");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar reserva");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{tr.book.reception_form_title}</CardTitle>
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
                    plateBlocked ? "text-sm text-destructive" : "text-sm text-emerald-700"
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
                  onClick={() => {
                    setWithElectricity(false);
                    setElectricityAmperage(6);
                  }}
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

            {withElectricity && (
              <div className="space-y-2">
                <Label>{tr.book.amperage_label}</Label>
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
                    <span className="font-medium">{tr.book.amperage_6a}</span>
                    <span className="block text-muted-foreground mt-0.5 text-xs">
                      {tr.book.amperage_6a_hint}
                    </span>
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
                    <span className="font-medium">{tr.book.amperage_10a}</span>
                    <span className="block text-muted-foreground mt-0.5 text-xs">
                      {tr.book.amperage_10a_hint.replace("{amount}", amperage10SurchargeLabel)}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={over9m}
                onChange={(e) => setOver9m(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-input accent-primary"
              />
              <span>
                <span className="font-medium text-sm">{tr.book.over_9m_label}</span>
                <span className="block text-muted-foreground text-xs mt-0.5">
                  {tr.book.over_9m_hint}
                </span>
              </span>
            </label>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4 space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{tr.book.terms_notice_title}</p>
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

          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-primary">
            {tr.book.reception_submit_hint}
          </div>

          <Button
            onClick={submitIntake}
            disabled={!checkIn || !checkOut || loading || plateBlocked || !vehiclePlate.trim()}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tr.book.confirm_reception}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
