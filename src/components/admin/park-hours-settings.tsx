"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParkSettings } from "@/lib/constants";
import {
  adminT,
  formatReceptionHours24h,
  formatTime24h,
} from "@/lib/admin-i18n";

export function ParkHoursSettings({ initial }: { initial: ParkSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateField(
    field: "reception_open" | "reception_close" | "check_in_time" | "check_out_time",
    value: string
  ) {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/park-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reception_open: settings.reception_open,
        reception_close: settings.reception_close,
        check_in_time: settings.check_in_time,
        check_out_time: settings.check_out_time,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      setSettings((current) => ({ ...current, ...data.settings }));
      setMessage(adminT.hours.saved);
    } else {
      setMessage(typeof data.error === "string" ? data.error : adminT.hours.saveError);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{adminT.hours.title}</CardTitle>
        <CardDescription>{adminT.hours.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reception_open">{adminT.hours.receptionOpen}</Label>
              <Input
                id="reception_open"
                type="time"
                value={settings.reception_open}
                onChange={(e) => updateField("reception_open", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reception_close">{adminT.hours.receptionClose}</Label>
              <Input
                id="reception_close"
                type="time"
                value={settings.reception_close}
                onChange={(e) => updateField("reception_close", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_in_time">{adminT.hours.checkInFrom}</Label>
              <Input
                id="check_in_time"
                type="time"
                value={settings.check_in_time}
                onChange={(e) => updateField("check_in_time", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out_time">{adminT.hours.checkOutUntil}</Label>
              <Input
                id="check_out_time"
                type="time"
                value={settings.check_out_time}
                onChange={(e) => updateField("check_out_time", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
            <p>
              {adminT.hours.reception}{" "}
              <strong className="text-foreground">
                {formatReceptionHours24h(settings.reception_open, settings.reception_close)}
              </strong>
            </p>
            <p>
              {adminT.hours.checkIn}{" "}
              <strong className="text-foreground">
                {adminT.hours.checkInFromTime.replace(
                  "{time}",
                  formatTime24h(settings.check_in_time)
                )}
              </strong>
            </p>
            <p>
              {adminT.hours.checkOut}{" "}
              <strong className="text-foreground">
                {adminT.hours.checkOutUntilTime.replace(
                  "{time}",
                  formatTime24h(settings.check_out_time)
                )}
              </strong>
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {adminT.hours.save}
          </Button>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
