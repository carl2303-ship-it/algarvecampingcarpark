"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminT } from "@/lib/admin-i18n";
import type { Zone } from "@/types/database";
import { cn } from "@/lib/utils";

type ZoneForm = {
  name: string;
  slug: string;
  capacity: string;
  description: string;
  description_en: string;
  amenities: string;
  active: boolean;
  sort_order: string;
};

function toForm(zone: Zone): ZoneForm {
  return {
    name: zone.name,
    slug: zone.slug,
    capacity: String(zone.capacity),
    description: zone.description ?? "",
    description_en: zone.description_en ?? "",
    amenities: (Array.isArray(zone.amenities) ? zone.amenities : []).join(", "),
    active: zone.active,
    sort_order: String(zone.sort_order),
  };
}

function emptyForm(): ZoneForm {
  return {
    name: "",
    slug: "",
    capacity: "10",
    description: "",
    description_en: "",
    amenities: "",
    active: true,
    sort_order: "10",
  };
}

function parseAmenities(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ZonesManager({ initialZones }: { initialZones: Zone[] }) {
  const [zones, setZones] = useState(initialZones);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ZoneForm>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const otherZones = useMemo(
    () => zones.filter((z) => z.id !== deleteId),
    [zones, deleteId]
  );

  function startEdit(zone: Zone) {
    setCreating(false);
    setEditingId(zone.id);
    setForm(toForm(zone));
    setMessage(null);
    setDeleteId(null);
  }

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setForm(emptyForm());
    setMessage(null);
    setDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setCreating(false);
    setForm(emptyForm());
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      capacity: parseInt(form.capacity, 10),
      description: form.description.trim() || null,
      description_en: form.description_en.trim() || null,
      amenities: parseAmenities(form.amenities),
      active: form.active,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };

    const res = await fetch(
      creating ? "/api/admin/zones" : `/api/admin/zones/${editingId}`,
      {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : adminT.zones.saveError);
      return;
    }

    const zone = data.zone as Zone;
    setZones((prev) => {
      if (creating) return [...prev, zone].sort((a, b) => a.sort_order - b.sort_order);
      return prev
        .map((item) => (item.id === zone.id ? zone : item))
        .sort((a, b) => a.sort_order - b.sort_order);
    });
    setMessage(creating ? adminT.zones.created : adminT.zones.saved);
    cancelEdit();
  }

  async function handleToggleActive(zone: Zone) {
    setMessage(null);
    const res = await fetch(`/api/admin/zones/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !zone.active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : adminT.zones.saveError);
      return;
    }
    setZones((prev) => prev.map((item) => (item.id === zone.id ? data.zone : item)));
  }

  async function handleDelete(zone: Zone) {
    setMessage(null);
    setSaving(true);

    const res = await fetch(`/api/admin/zones/${zone.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reassignTo ? { reassign_to: reassignTo } : {}),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (res.status === 409 && data.requires_reassign) {
      setDeleteId(zone.id);
      setReassignTo(otherZones.find((z) => z.active)?.id ?? otherZones[0]?.id ?? "");
      setMessage(
        adminT.zones.deleteNeedsReassign.replace(
          "{count}",
          String(data.reservation_count ?? "?")
        )
      );
      return;
    }

    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : adminT.zones.deleteError);
      return;
    }

    setZones((prev) => prev.filter((item) => item.id !== zone.id));
    setDeleteId(null);
    setReassignTo("");
    setMessage(adminT.zones.deleted);
    if (editingId === zone.id) cancelEdit();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{adminT.zones.manageTitle}</h2>
          <p className="text-sm text-muted-foreground">{adminT.zones.manageDescription}</p>
        </div>
        <Button type="button" onClick={startCreate} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" />
          {adminT.zones.addZone}
        </Button>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {(creating || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{creating ? adminT.zones.addZone : adminT.zones.editZone}</CardTitle>
            <CardDescription>{adminT.zones.formHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{adminT.zones.name}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{adminT.zones.slug}</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder={adminT.zones.slugPlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{adminT.common.capacity}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{adminT.zones.sortOrder}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{adminT.zones.descriptionPt}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{adminT.zones.descriptionEn}</Label>
                <Textarea
                  value={form.description_en}
                  onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{adminT.zones.amenitiesLabel}</Label>
                <Input
                  value={form.amenities}
                  onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                  placeholder={adminT.zones.amenitiesPlaceholder}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                {adminT.common.active}
              </label>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !form.name.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {adminT.common.save}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  {adminT.common.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {zones.map((zone) => {
          const isDeleting = deleteId === zone.id;
          return (
            <Card
              key={zone.id}
              className={cn(!zone.active && "opacity-80 border-dashed")}
            >
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 space-y-0">
                <div className="space-y-2 min-w-0">
                  <CardTitle className="flex items-center gap-3 flex-wrap text-lg">
                    {zone.name}
                    <Badge variant={zone.active ? "default" : "secondary"}>
                      {zone.active ? adminT.common.active : adminT.common.inactive}
                    </Badge>
                    <Badge variant="outline">
                      {adminT.common.capacity} {zone.capacity}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {zone.slug}
                    </Badge>
                  </CardTitle>
                  {zone.description && (
                    <p className="text-sm text-muted-foreground">{zone.description}</p>
                  )}
                  {(Array.isArray(zone.amenities) ? zone.amenities : []).length > 0 && (
                    <p className="text-sm">
                      {adminT.zones.amenities}{" "}
                      {(Array.isArray(zone.amenities) ? zone.amenities : []).join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(zone)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {adminT.zones.edit}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(zone)}
                  >
                    {zone.active ? adminT.zones.deactivate : adminT.zones.activate}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (!confirm(adminT.zones.deleteConfirm.replace("{name}", zone.name))) {
                        return;
                      }
                      void handleDelete(zone);
                    }}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {adminT.zones.delete}
                  </Button>
                </div>
              </CardHeader>

              {isDeleting && (
                <CardContent className="border-t pt-4 space-y-3">
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {adminT.zones.reassignHint}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="space-y-2 flex-1">
                      <Label>{adminT.zones.reassignTo}</Label>
                      <Select value={reassignTo} onValueChange={(v) => setReassignTo(v ?? "")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {otherZones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.name}
                              {!z.active ? ` (${adminT.common.inactive})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!reassignTo || saving}
                      onClick={() => void handleDelete(zone)}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {adminT.zones.deleteWithReassign}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDeleteId(null);
                        setMessage(null);
                      }}
                    >
                      {adminT.common.cancel}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
