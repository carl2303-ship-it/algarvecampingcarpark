"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Mail, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminT } from "@/lib/admin-i18n";
import { cn } from "@/lib/utils";
import type { Guest } from "@/types/database";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminClientsTable({ initialGuests }: { initialGuests: Guest[] }) {
  const [guests, setGuests] = useState(initialGuests);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [habitualOnly, setHabitualOnly] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qCompact = q.replace(/\s+/g, "");
    return guests.filter((guest) => {
      if (habitualOnly && !guest.is_habitual) return false;
      if (!q) return true;
      const nameMatch = guest.name.toLowerCase().includes(q);
      const plateMatch = (guest.vehicle_plate ?? "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes(qCompact);
      return nameMatch || plateMatch;
    });
  }, [guests, query, habitualOnly]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((guest) => selectedIds.has(guest.id));

  function toggleSelectAllFiltered() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        for (const guest of filtered) next.delete(guest.id);
      } else {
        for (const guest of filtered) next.add(guest.id);
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectedGuests() {
    return guests.filter((guest) => selectedIds.has(guest.id));
  }

  function exportSelectedCsv() {
    const rows = selectedGuests();
    if (rows.length === 0) {
      toast.error(adminT.clients.selectAtLeastOne);
      return;
    }

    downloadCsv(`clients-emails-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        adminT.common.plate,
        adminT.clients.name,
        adminT.common.email,
        adminT.common.phone,
        adminT.clients.country,
        adminT.clients.habitual,
      ],
      ...rows.map((guest) => [
        guest.vehicle_plate ?? "",
        guest.name,
        guest.email,
        guest.phone ?? "",
        guest.country ?? "",
        guest.is_habitual ? "oui" : "non",
      ]),
    ]);
    toast.success(adminT.clients.exportDone.replace("{count}", String(rows.length)));
  }

  async function copySelectedEmails() {
    const emails = selectedGuests()
      .map((guest) => guest.email.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error(adminT.clients.selectAtLeastOne);
      return;
    }

    const unique = [...new Set(emails)];
    try {
      await navigator.clipboard.writeText(unique.join("; "));
      toast.success(adminT.clients.emailsCopied.replace("{count}", String(unique.length)));
    } catch {
      toast.error(adminT.clients.copyFailed);
    }
  }

  function toggleHabitual(guest: Guest, checked: boolean) {
    const previous = guest.is_habitual;
    setGuests((current) =>
      current.map((row) => (row.id === guest.id ? { ...row, is_habitual: checked } : row))
    );

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/clients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: guest.id, is_habitual: checked }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? adminT.clients.habitualSaveError);
        }
      } catch (error) {
        setGuests((current) =>
          current.map((row) =>
            row.id === guest.id ? { ...row, is_habitual: previous } : row
          )
        );
        toast.error(error instanceof Error ? error.message : adminT.clients.habitualSaveError);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={adminT.clients.searchPlaceholder}
              className="pl-8"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={habitualOnly}
              onChange={(event) => setHabitualOnly(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            {adminT.clients.filterHabitual}
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copySelectedEmails}
            disabled={selectedIds.size === 0}
          >
            <Mail className="mr-1.5 h-4 w-4" />
            {adminT.clients.copyEmails}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={exportSelectedCsv}
            disabled={selectedIds.size === 0}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {adminT.clients.exportSelected}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {adminT.clients.selectionCount
          .replace("{selected}", String(selectedIds.size))
          .replace("{total}", String(filtered.length))}
        {pending ? ` · ${adminT.common.saving}` : null}
      </p>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  aria-label={adminT.clients.selectAll}
                  className="h-4 w-4 rounded border-input"
                />
              </TableHead>
              <TableHead>{adminT.common.plate}</TableHead>
              <TableHead>{adminT.clients.name}</TableHead>
              <TableHead>{adminT.common.email}</TableHead>
              <TableHead>{adminT.common.phone}</TableHead>
              <TableHead>{adminT.clients.country}</TableHead>
              <TableHead className="text-center">{adminT.clients.habitual}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  {query.trim() ? adminT.clients.searchNoResults : adminT.clients.empty}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((guest) => (
                <TableRow
                  key={guest.id}
                  className={cn(selectedIds.has(guest.id) && "bg-muted/40")}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(guest.id)}
                      onChange={() => toggleSelect(guest.id)}
                      aria-label={adminT.clients.selectRow}
                      className="h-4 w-4 rounded border-input"
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {guest.vehicle_plate || "—"}
                  </TableCell>
                  <TableCell>{guest.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{guest.email}</TableCell>
                  <TableCell className="whitespace-nowrap">{guest.phone || "—"}</TableCell>
                  <TableCell>{guest.country || "—"}</TableCell>
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={guest.is_habitual}
                      onChange={(event) => toggleHabitual(guest, event.target.checked)}
                      aria-label={adminT.clients.habitual}
                      className="h-4 w-4 rounded border-input"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
