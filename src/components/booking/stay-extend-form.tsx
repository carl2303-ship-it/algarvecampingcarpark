"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { formatPrice } from "@/lib/pricing";

export type StaySummary = {
  guest_name: string;
  pitch_code: string | null;
  zone_name: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_cents: number;
  paid_cents: number;
  status: string;
  can_extend: boolean;
};

export function StayExtendForm({
  locale,
  token,
  stay,
}: {
  locale: Locale;
  token: string;
  stay: StaySummary;
}) {
  const t = getTranslations(locale).stay;
  const [newCheckOut, setNewCheckOut] = useState("");
  const [extensionCents, setExtensionCents] = useState<number | null>(null);
  const [nightsAdded, setNightsAdded] = useState(0);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!newCheckOut || newCheckOut <= stay.check_out) {
      setExtensionCents(null);
      setNightsAdded(0);
      setQuoteError(newCheckOut && newCheckOut <= stay.check_out ? t.unavailable : null);
      return;
    }

    const controller = new AbortController();
    setLoadingQuote(true);
    setQuoteError(null);

    fetch(
      `/api/stay/quote?token=${encodeURIComponent(token)}&check_out=${encodeURIComponent(newCheckOut)}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setExtensionCents(null);
          setQuoteError(typeof data.error === "string" ? data.error : t.unavailable);
          return;
        }
        setExtensionCents(data.extension_cents ?? 0);
        setNightsAdded(data.nights_added ?? 0);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setExtensionCents(null);
          setQuoteError(t.unavailable);
        }
      })
      .finally(() => setLoadingQuote(false));

    return () => controller.abort();
  }, [newCheckOut, stay.check_out, token, t.unavailable]);

  async function handlePay() {
    if (!newCheckOut || extensionCents == null) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/stay/extend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, check_out: newCheckOut, locale }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : t.unavailable);
      return;
    }

    if (data.payment_url) {
      window.location.href = data.payment_url;
      return;
    }

    setError(typeof data.error === "string" ? data.error : t.unavailable);
  }

  const minDate = (() => {
    const d = new Date(stay.check_out + "T12:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">{t.arrival}: </span>
            <strong>{stay.check_in}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">{t.current_departure}: </span>
            <strong>{stay.check_out}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">{t.pitch}: </span>
            <strong>{stay.pitch_code ?? "—"}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">{t.zone}: </span>
            <strong>{stay.zone_name}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">{t.guests}: </span>
            <strong>{stay.num_guests}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">{t.total}: </span>
            <strong>{formatPrice(stay.total_cents)}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">{t.paid}: </span>
            <strong>{formatPrice(stay.paid_cents)}</strong>
          </p>
        </CardContent>
      </Card>

      {stay.can_extend ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.new_departure}</CardTitle>
            <CardDescription>{t.hint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="new_check_out">{t.new_departure}</Label>
              <Input
                id="new_check_out"
                type="date"
                min={minDate}
                value={newCheckOut}
                onChange={(event) => setNewCheckOut(event.target.value)}
                className="mt-1"
              />
            </div>

            {loadingQuote && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </p>
            )}

            {quoteError && <p className="text-sm text-destructive">{quoteError}</p>}

            {extensionCents != null && !quoteError && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">{t.extension_cost}: </span>
                  <strong>{formatPrice(extensionCents)}</strong>
                </p>
                <p className="text-muted-foreground">
                  {t.nights_added.replace("{n}", String(nightsAdded))}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="button"
              className="w-full"
              disabled={
                submitting ||
                loadingQuote ||
                extensionCents == null ||
                Boolean(quoteError) ||
                !newCheckOut
              }
              onClick={handlePay}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.pay}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground text-center">{t.not_eligible}</p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {t.contact}:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
