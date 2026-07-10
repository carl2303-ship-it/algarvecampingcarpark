"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminT } from "@/lib/admin-i18n";

type Props = {
  reservationId: string;
  guestName: string;
  redirectTo?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

export function DeleteReservationButton({
  reservationId,
  guestName,
  redirectTo,
  size = "sm",
  variant = "destructive",
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const message = adminT.reservations.deleteConfirm.replace("{name}", guestName);
    if (!confirm(message)) return;

    setDeleting(true);

    const res = await fetch(`/api/admin/reservations/${reservationId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);

    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : adminT.reservations.deleteError);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={deleting}
      onClick={handleDelete}
    >
      {deleting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 h-4 w-4" />
      )}
      {adminT.reservations.delete}
    </Button>
  );
}
