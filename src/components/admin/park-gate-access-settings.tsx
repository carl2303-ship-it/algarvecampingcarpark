"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ParkSettings } from "@/lib/constants";
import { adminT } from "@/lib/admin-i18n";

export function ParkGateAccessSettings({ initial }: { initial: ParkSettings }) {
  const [gateAccessCode, setGateAccessCode] = useState(initial.gate_access_code ?? "");
  const [saving, setSaving] = useState(false);
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

          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {adminT.gateAccess.save}
          </Button>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
