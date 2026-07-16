"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParkSettings } from "@/lib/constants";
import { adminT } from "@/lib/admin-i18n";

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function OnlineBookingSettings({ initial }: { initial: ParkSettings }) {
  const [enabled, setEnabled] = useState(initial.online_booking_enabled);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(initial.online_booking_starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(initial.online_booking_ends_at));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const startsIso = fromLocalInputValue(startsAt);
    const endsIso = fromLocalInputValue(endsAt);

    if (startsIso && endsIso && new Date(startsIso) > new Date(endsIso)) {
      setSaving(false);
      setMessage(adminT.onlineBooking.invalidRange);
      return;
    }

    const res = await fetch("/api/admin/park-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        online_booking_enabled: enabled,
        online_booking_starts_at: startsIso,
        online_booking_ends_at: endsIso,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      setEnabled(Boolean(data.settings.online_booking_enabled));
      setStartsAt(toLocalInputValue(data.settings.online_booking_starts_at));
      setEndsAt(toLocalInputValue(data.settings.online_booking_ends_at));
      setMessage(adminT.onlineBooking.saved);
    } else {
      setMessage(
        typeof data.error === "string" ? data.error : adminT.onlineBooking.saveError
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{adminT.onlineBooking.title}</CardTitle>
        <CardDescription>{adminT.onlineBooking.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => {
                setEnabled(event.target.checked);
                setMessage(null);
              }}
              className="mt-1 h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">{adminT.onlineBooking.enabled}</span>
              <span className="block text-muted-foreground mt-1">
                {adminT.onlineBooking.enabledHint}
              </span>
            </span>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="online_booking_starts_at">{adminT.onlineBooking.startsAt}</Label>
              <Input
                id="online_booking_starts_at"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => {
                  setStartsAt(event.target.value);
                  setMessage(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="online_booking_ends_at">{adminT.onlineBooking.endsAt}</Label>
              <Input
                id="online_booking_ends_at"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => {
                  setEndsAt(event.target.value);
                  setMessage(null);
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{adminT.onlineBooking.datesHint}</p>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {adminT.onlineBooking.save}
          </Button>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
