"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParkSettings } from "@/lib/constants";
import { formatReceptionHours, formatTimeForLocale } from "@/lib/constants";

export function ParkHoursSettings({ initial }: { initial: ParkSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateField(field: keyof ParkSettings, value: string) {
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
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      setSettings(data.settings);
      setMessage("Horários guardados. A app foi atualizada.");
    } else {
      setMessage(typeof data.error === "string" ? data.error : "Erro ao guardar horários.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horários</CardTitle>
        <CardDescription>
          Receção, check-in e check-out — visíveis na reserva, termos, emails e mapa operacional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reception_open">Receção — abertura</Label>
              <Input
                id="reception_open"
                type="time"
                value={settings.reception_open}
                onChange={(e) => updateField("reception_open", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reception_close">Receção — encerramento</Label>
              <Input
                id="reception_close"
                type="time"
                value={settings.reception_close}
                onChange={(e) => updateField("reception_close", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_in_time">Check-in (a partir de)</Label>
              <Input
                id="check_in_time"
                type="time"
                value={settings.check_in_time}
                onChange={(e) => updateField("check_in_time", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out_time">Check-out (até)</Label>
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
              Receção: <strong className="text-foreground">{formatReceptionHours(settings)}</strong>
            </p>
            <p>
              Check-in:{" "}
              <strong className="text-foreground">
                a partir das {formatTimeForLocale(settings.check_in_time)}
              </strong>
            </p>
            <p>
              Check-out:{" "}
              <strong className="text-foreground">
                até às {formatTimeForLocale(settings.check_out_time)}
              </strong>
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar horários
          </Button>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
