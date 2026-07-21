"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminT } from "@/lib/admin-i18n";
import { formatPrice } from "@/lib/pricing";
import type { PricingSupplementRow } from "@/types/database";

type SupplementRow = PricingSupplementRow;

const TRIGGER_LABELS: Record<SupplementRow["trigger_type"], string> = {
  extra_guest: adminT.pricingSupplements.triggerExtraGuest,
  motorhome_over_9m: adminT.pricingSupplements.triggerMotorhome,
  electricity_10a: adminT.pricingSupplements.triggerElectricity10a,
  manual_per_night: adminT.pricingSupplements.triggerManual,
};

function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function PricingSupplementsManager({
  initialSupplements,
}: {
  initialSupplements: SupplementRow[];
}) {
  const [supplements, setSupplements] = useState(initialSupplements);
  const [editRow, setEditRow] = useState<Partial<SupplementRow>>({});
  const [saving, setSaving] = useState(false);
  const [newSupplement, setNewSupplement] = useState({
    name_pt: "",
    name_en: "",
    amount_euros: "",
    description_pt: "",
  });

  const sorted = useMemo(
    () => [...supplements].sort((a, b) => a.sort_order - b.sort_order),
    [supplements]
  );

  async function refreshSupplements() {
    const res = await fetch("/api/admin/pricing-supplements");
    const data = await res.json();
    setSupplements(data.supplements ?? []);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    await fetch("/api/admin/pricing-supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_pt: newSupplement.name_pt,
        name_en: newSupplement.name_en || undefined,
        description_pt: newSupplement.description_pt || undefined,
        amount_cents_per_night: Math.round(parseFloat(newSupplement.amount_euros || "0") * 100),
        trigger_type: "manual_per_night",
        applies_admin: true,
        applies_online: false,
      }),
    });
    setNewSupplement({ name_pt: "", name_en: "", amount_euros: "", description_pt: "" });
    setSaving(false);
    refreshSupplements();
  }

  async function handleUpdate() {
    if (!editRow.id) return;
    setSaving(true);
    await fetch(`/api/admin/pricing-supplements/${editRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_pt: editRow.name_pt,
        name_en: editRow.name_en,
        description_pt: editRow.description_pt,
        amount_cents_per_night: editRow.amount_cents_per_night,
        active: editRow.active,
        applies_admin: editRow.applies_admin,
        applies_online: editRow.applies_online,
      }),
    });
    setEditRow({});
    setSaving(false);
    refreshSupplements();
  }

  async function handleDelete(id: string) {
    if (!confirm(adminT.pricingSupplements.deleteConfirm)) return;
    setSaving(true);
    const res = await fetch(`/api/admin/pricing-supplements/${id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : adminT.pricingSupplements.deleteError);
      return;
    }
    refreshSupplements();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{adminT.pricingSupplements.title}</CardTitle>
        <CardDescription>{adminT.pricingSupplements.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{adminT.pricingSupplements.namePt}</TableHead>
              <TableHead>{adminT.pricingSupplements.trigger}</TableHead>
              <TableHead>{adminT.pricingSupplements.amountPerNight}</TableHead>
              <TableHead>{adminT.pricing.active}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) =>
              editRow.id === row.id ? (
                <TableRow key={row.id}>
                  <TableCell colSpan={5}>
                    <div className="grid md:grid-cols-5 gap-3 items-end">
                      <div>
                        <Label className="text-xs">{adminT.pricingSupplements.namePt}</Label>
                        <Input
                          value={editRow.name_pt ?? ""}
                          onChange={(event) =>
                            setEditRow((current) => ({ ...current, name_pt: event.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{adminT.pricingSupplements.nameEn}</Label>
                        <Input
                          value={editRow.name_en ?? ""}
                          onChange={(event) =>
                            setEditRow((current) => ({ ...current, name_en: event.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{adminT.pricingSupplements.amountPerNight}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={((editRow.amount_cents_per_night ?? 0) / 100).toFixed(2)}
                          onChange={(event) =>
                            setEditRow((current) => ({
                              ...current,
                              amount_cents_per_night: Math.round(
                                parseFloat(event.target.value || "0") * 100
                              ),
                            }))
                          }
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm pb-2">
                        <input
                          type="checkbox"
                          checked={editRow.active ?? true}
                          onChange={(event) =>
                            setEditRow((current) => ({ ...current, active: event.target.checked }))
                          }
                        />
                        {adminT.pricing.active}
                      </label>
                      <div className="flex gap-2">
                        <Button type="button" size="icon" onClick={handleUpdate} disabled={saving}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setEditRow({})}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.name_pt}</p>
                      {row.description_pt && (
                        <p className="text-xs text-muted-foreground mt-0.5">{row.description_pt}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TRIGGER_LABELS[row.trigger_type]}</Badge>
                    {row.is_system && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {adminT.pricingSupplements.systemBadge}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(row.amount_cents_per_night)}
                  </TableCell>
                  <TableCell>{row.active ? adminT.common.yes : adminT.common.no}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditRow({ ...row })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!row.is_system && (
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>

        <form onSubmit={handleAdd} className="grid md:grid-cols-4 gap-4 border-t pt-6">
          <div className="space-y-2">
            <Label>{adminT.pricingSupplements.namePt}</Label>
            <Input
              value={newSupplement.name_pt}
              onChange={(event) =>
                setNewSupplement((current) => ({ ...current, name_pt: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{adminT.pricingSupplements.nameEn}</Label>
            <Input
              value={newSupplement.name_en}
              onChange={(event) =>
                setNewSupplement((current) => ({ ...current, name_en: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{adminT.pricingSupplements.amountPerNight}</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={newSupplement.amount_euros}
              onChange={(event) =>
                setNewSupplement((current) => ({ ...current, amount_euros: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{adminT.pricingSupplements.descriptionPt}</Label>
            <Input
              value={newSupplement.description_pt}
              onChange={(event) =>
                setNewSupplement((current) => ({
                  ...current,
                  description_pt: event.target.value,
                }))
              }
            />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {adminT.pricingSupplements.addManual}
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground">{adminT.pricingSupplements.hint}</p>
      </CardContent>
    </Card>
  );
}
