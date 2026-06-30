"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Pitch, Reservation } from "@/types/database";

export function CheckInDialog({
  reservation,
  pitches,
}: {
  reservation: Reservation;
  pitches: Pitch[];
}) {
  const [pitchId, setPitchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const availablePitches = pitches.filter(
    (p) => p.zone_id === reservation.zone_id && p.status === "available"
  );

  async function handleCheckIn() {
    if (!pitchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservation.id}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch_id: pitchId }),
      });
      if (!res.ok) throw new Error("Erro");
      setOpen(false);
      window.location.reload();
    } catch {
      alert("Erro ao fazer check-in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "sm", variant: "outline" })}>
        Check-in
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in — {reservation.guest_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={pitchId} onValueChange={(v) => setPitchId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar lugar" />
            </SelectTrigger>
            <SelectContent>
              {availablePitches.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  Lugar {p.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCheckIn} disabled={!pitchId || loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar check-in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
