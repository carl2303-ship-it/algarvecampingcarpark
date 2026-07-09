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
import { adminT } from "@/lib/admin-i18n";
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
      alert(adminT.reservations.checkInError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "sm", variant: "outline" })}>
        {adminT.reservations.checkIn}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {adminT.reservations.checkInTitle.replace("{name}", reservation.guest_name)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={pitchId} onValueChange={(v) => setPitchId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder={adminT.reservations.selectPitch} />
            </SelectTrigger>
            <SelectContent>
              {availablePitches.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {adminT.reservations.pitchOption.replace("{code}", p.code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCheckIn} disabled={!pitchId || loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {adminT.reservations.confirmCheckIn}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
