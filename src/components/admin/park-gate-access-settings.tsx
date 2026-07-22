"use client";

import { useState } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParkSettings } from "@/lib/constants";
import { adminT } from "@/lib/admin-i18n";

export function ParkGateAccessSettings({ initial }: { initial: ParkSettings }) {
  const [gateAccessCode, setGateAccessCode] = useState(initial.gate_access_code ?? "");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/park-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gate_access_code: gateAccessCode.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.ok) {
      setGateAccessCode(data.settings.gate_access_code ?? "");
      setMessage(adminT.gateAccess.saved);
    } else {
      setMessage(typeof data.error === "string" ? data.error : adminT.gateAccess.saveError);
    }
  }

  async function handleRunPreArrival() {
    setRunning(true);
    setMessage(null);
    const res = await fetch("/api/admin/pre-arrival/run", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setRunning(false);

    if (!res.ok) {
      setMessage(
        typeof data.error === "string" ? data.error : adminT.gateAccess.runPreArrivalError
      );
      return;
    }

    setMessage(
      adminT.gateAccess.runPreArrivalSuccess
        .replace("{sent}", String(data.sent ?? 0))
        .replace("{failed}", String(data.failed ?? 0))
        .replace("{candidates}", String(data.candidates ?? 0))
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{adminT.gateAccess.title}</CardTitle>
        <CardDescription>{adminT.gateAccess.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gate_access_code">{adminT.gateAccess.codeLabel}</Label>
            <Input
              id="gate_access_code"
              value={gateAccessCode}
              onChange={(event) => {
                setGateAccessCode(event.target.value);
                setMessage(null);
              }}
              placeholder={adminT.gateAccess.codePlaceholder}
              maxLength={32}
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{adminT.gateAccess.hint}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || running}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {adminT.gateAccess.save}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || running}
              onClick={handleRunPreArrival}
            >
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {adminT.gateAccess.runPreArrival}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{adminT.gateAccess.runPreArrivalHint}</p>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
