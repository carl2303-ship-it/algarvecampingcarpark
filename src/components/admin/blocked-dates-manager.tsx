"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlockedDate {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  zone: { name: string } | null;
}

interface Zone {
  id: string;
  name: string;
}

export function BlockedDatesManager({ zones }: { zones: Zone[] }) {
  const [items, setItems] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoneId, setZoneId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    const res = await fetch("/api/admin/blocked-dates");
    const data = await res.json();
    setItems(data.blocked_dates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone_id: zoneId === "all" ? null : zoneId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      }),
    });
    setStartDate("");
    setEndDate("");
    setReason("");
    setSaving(false);
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bloquear datas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Zona</Label>
            <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as zonas</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Manutenção, fecho..." />
          </div>
          <div className="space-y-2">
            <Label>Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Adicionar bloqueio
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Sem bloqueios ativos</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center border rounded-lg p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {item.start_date} → {item.end_date}
                  </p>
                  <p className="text-muted-foreground">
                    {item.zone?.name ?? "Todas as zonas"}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </p>
                </div>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
