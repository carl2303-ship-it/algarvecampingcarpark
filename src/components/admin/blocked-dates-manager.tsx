"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminT } from "@/lib/admin-i18n";

interface BlockedDate {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  pitch_code: string | null;
}

interface PitchOption {
  code: string;
}

export function BlockedDatesManager({ pitches }: { pitches: PitchOption[] }) {
  const [items, setItems] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pitchCode, setPitchCode] = useState(pitches[0]?.code ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const sortedPitches = useMemo(
    () =>
      [...pitches].sort((a, b) =>
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
      ),
    [pitches]
  );

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
    if (!pitchCode) return;
    setSaving(true);
    await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pitch_code: pitchCode,
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

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/admin/blocked-dates?id=${id}`, { method: "DELETE" });
    setDeletingId(null);
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{adminT.blockedDates.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>{adminT.blockedDates.pitch}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={pitchCode}
              onChange={(event) => setPitchCode(event.target.value)}
              required
            >
              {sortedPitches.map((pitch) => (
                <option key={pitch.code} value={pitch.code}>
                  {pitch.code}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{adminT.blockedDates.reason}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={adminT.blockedDates.reasonPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label>{adminT.blockedDates.start}</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{adminT.blockedDates.end}</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving || !pitchCode}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {adminT.blockedDates.add}
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="text-muted-foreground">{adminT.blockedDates.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">{adminT.blockedDates.empty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center gap-3 border rounded-lg p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {adminT.blockedDates.entry
                      .replace("{code}", item.pitch_code ?? "—")
                      .replace("{start}", item.start_date)
                      .replace("{end}", item.end_date)}
                  </p>
                  {item.reason && <p className="text-muted-foreground">{item.reason}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                  aria-label={adminT.common.removeBlock}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
