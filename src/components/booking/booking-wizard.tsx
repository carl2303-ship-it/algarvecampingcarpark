"use client";

import { useState } from "react";
import { format, addDays, startOfToday } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { CalendarIcon, Loader2, MapPin, Zap, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import type { Locale } from "@/lib/constants";
import { getTranslations, t as translate } from "@/lib/i18n";
import type { ZoneAvailability } from "@/types/database";
import { CHECK_IN_TIME, CHECK_OUT_TIME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Step = "dates" | "zone" | "details";

export function BookingWizard({ locale }: { locale: Locale }) {
  const tr = getTranslations(locale);
  const dateLocale = locale === "pt" ? pt : enUS;

  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [availability, setAvailability] = useState<ZoneAvailability[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [numGuests, setNumGuests] = useState(2);
  const [notes, setNotes] = useState("");

  const checkInStr = checkIn ? format(checkIn, "yyyy-MM-dd") : "";
  const checkOutStr = checkOut ? format(checkOut, "yyyy-MM-dd") : "";

  async function searchAvailability() {
    if (!checkInStr || !checkOutStr) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/availability?check_in=${checkInStr}&check_out=${checkOutStr}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      setAvailability(data.availability);
      if (data.availability.length === 0) {
        setError(tr.book.no_availability);
      } else {
        setStep("zone");
      }
    } catch {
      setError("Erro ao verificar disponibilidade");
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking() {
    if (!selectedZone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone.zone.id,
          check_in: checkInStr,
          check_out: checkOutStr,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          vehicle_plate: vehiclePlate || undefined,
          num_guests: numGuests,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar reserva");
      setLoading(false);
    }
  }

  const zoneIcon = (slug: string) => {
    if (slug.includes("premium")) return <Waves className="h-5 w-5" />;
    if (slug.includes("eletricidade") && !slug.includes("sem")) return <Zap className="h-5 w-5" />;
    return <MapPin className="h-5 w-5" />;
  };

  const zoneName = (zone: ZoneAvailability["zone"]) =>
    locale === "en" && zone.description_en ? zone.name : zone.name;

  const zoneDesc = (zone: ZoneAvailability["zone"]) =>
    locale === "en" ? zone.description_en ?? zone.description : zone.description;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex gap-2">
        {(["dates", "zone", "details"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex-1 h-1 rounded-full",
              step === s || (["dates", "zone", "details"].indexOf(step) > i)
                ? "bg-primary"
                : "bg-muted"
            )}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === "dates" && (
        <Card>
          <CardHeader>
            <CardTitle>{tr.book.select_dates}</CardTitle>
            <CardDescription>
              {tr.book.check_in}: {CHECK_IN_TIME} · {tr.book.check_out}: {CHECK_OUT_TIME}
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
                  disabled={(d) =>
                    d < startOfToday() || (checkIn ? d <= checkIn : false)
                  }
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
            <Button
              onClick={searchAvailability}
              disabled={!checkIn || !checkOut || loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tr.book.continue}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "zone" && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("dates")}>
            ← {tr.book.step_dates}
          </Button>
          {availability.map((item) => (
            <Card
              key={item.zone.id}
              className={cn(
                "rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5",
                selectedZone?.zone.id === item.zone.id && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => {
                setSelectedZone(item);
                setStep("details");
              }}
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  {zoneIcon(item.zone.slug)}
                  <div>
                    <CardTitle className="text-lg">{zoneName(item.zone)}</CardTitle>
                    <CardDescription>{zoneDesc(item.zone)}</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatPrice(item.total_price_cents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.nights} {tr.book.nights}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {translate(locale, "book.spots_left", { n: item.available_spots })}
                  </Badge>
                  <Badge variant="outline">
                    {formatPrice(item.price_per_night_cents)} {tr.book.per_night}
                  </Badge>
                  {item.min_nights > 1 && (
                    <Badge variant="outline">
                      {translate(locale, "book.min_nights", { n: item.min_nights })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {step === "details" && selectedZone && (
        <Card className="rounded-2xl shadow-lg border-primary/10">
          <CardHeader>
            <Button variant="ghost" className="w-fit -ml-2 mb-2" onClick={() => setStep("zone")}>
              ← {tr.book.step_zone}
            </Button>
            <CardTitle>{zoneName(selectedZone.zone)}</CardTitle>
            <CardDescription>
              {formatPrice(selectedZone.total_price_cents)} · {selectedZone.nights}{" "}
              {tr.book.nights}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  onChange={(e) => setNumGuests(Number(e.target.value))}
                />
              </div>
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
            <Button
              onClick={submitBooking}
              disabled={loading || !guestName || !guestEmail || !guestPhone}
              className="w-full"
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tr.book.pay} — {formatPrice(selectedZone.total_price_cents)}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
