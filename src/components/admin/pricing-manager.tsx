"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getServiceVisual, ICON_OPTIONS } from "@/lib/pricing-icons";
import type { Zone, ZoneRate, ServiceItem } from "@/types/database";

type RateSeason = ZoneRate["season"];

const SEASON_OPTIONS: { value: RateSeason; label: string }[] = [
  { value: "august", label: adminT.pricing.seasonAugust },
  { value: "summer", label: adminT.pricing.seasonSummer },
  { value: "low", label: adminT.pricing.seasonLow },
  { value: "winter", label: adminT.pricing.seasonWinter },
];

function seasonLabel(season: RateSeason) {
  return SEASON_OPTIONS.find((s) => s.value === season)?.label ?? season;
}

interface RateWithZone extends ZoneRate {
  zone?: { name: string } | null;
}

export function PricingManager({
  zones,
  initialRates,
  initialServices,
}: {
  zones: Zone[];
  initialRates: RateWithZone[];
  initialServices: ServiceItem[];
}) {
  const [rates, setRates] = useState(initialRates);
  const [services, setServices] = useState(initialServices);
  const [editRate, setEditRate] = useState<Partial<RateWithZone>>({});
  const [editService, setEditService] = useState<Partial<ServiceItem>>({});
  const [saving, setSaving] = useState(false);

  const [newRate, setNewRate] = useState({
    zone_id: zones[0]?.id ?? "",
    start_date: "",
    end_date: "",
    price_euros: "",
    price_euros_3_4: "",
    min_nights: "1",
    season: "summer" as RateSeason,
  });

  const [newService, setNewService] = useState({
    name: "",
    name_en: "",
    description: "",
    price_label_pt: "",
    price_label_en: "",
    icon: "sparkles",
  });

  async function refreshRates() {
    const res = await fetch("/api/admin/zone-rates");
    const data = await res.json();
    setRates(data.rates ?? []);
  }

  async function refreshServices() {
    const res = await fetch("/api/admin/service-items");
    const data = await res.json();
    setServices(data.services ?? []);
  }

  async function handleAddRate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/zone-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone_id: newRate.zone_id,
        start_date: newRate.start_date,
        end_date: newRate.end_date,
        price_cents_per_night: Math.round(parseFloat(newRate.price_euros) * 100),
        price_cents_3_4_guests: Math.round(parseFloat(newRate.price_euros_3_4) * 100),
        min_nights: parseInt(newRate.min_nights, 10),
        season: newRate.season,
      }),
    });
    setNewRate((r) => ({ ...r, start_date: "", end_date: "", price_euros: "", price_euros_3_4: "" }));
    setSaving(false);
    refreshRates();
  }

  async function handleUpdateRate() {
    if (!editRate.id) return;
    setSaving(true);
    await fetch(`/api/admin/zone-rates/${editRate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_date: editRate.start_date,
        end_date: editRate.end_date,
        price_cents_per_night: Math.round(editRate.price_cents_per_night ?? 0),
        price_cents_3_4_guests: Math.round(editRate.price_cents_3_4_guests ?? 0),
        min_nights: editRate.min_nights,
        season: editRate.season,
      }),
    });
    setEditRate({});
    setSaving(false);
    refreshRates();
  }

  async function handleDeleteRate(id: string) {
    if (!confirm(adminT.pricing.deleteRateConfirm)) return;
    setSaving(true);
    await fetch(`/api/admin/zone-rates/${id}`, { method: "DELETE" });
    setSaving(false);
    refreshRates();
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/service-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newService,
        sort_order: services.length + 1,
      }),
    });
    setNewService({
      name: "",
      name_en: "",
      description: "",
      price_label_pt: "",
      price_label_en: "",
      icon: "sparkles",
    });
    setSaving(false);
    refreshServices();
  }

  async function handleUpdateService() {
    if (!editService.id) return;
    setSaving(true);
    await fetch(`/api/admin/service-items/${editService.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editService.name,
        name_en: editService.name_en || null,
        description: editService.description || null,
        price_label_pt: editService.price_label_pt || null,
        price_label_en: editService.price_label_en || null,
        icon: editService.icon,
        price_cents: editService.price_cents,
        active: editService.active,
      }),
    });
    setEditService({});
    setSaving(false);
    refreshServices();
  }

  async function handleDeleteService(id: string) {
    if (!confirm(adminT.pricing.deleteServiceConfirm)) return;
    setSaving(true);
    await fetch(`/api/admin/service-items/${id}`, { method: "DELETE" });
    setSaving(false);
    refreshServices();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{adminT.pricing.seasonalRates}</CardTitle>
          <CardDescription>{adminT.pricing.seasonalDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{adminT.pricing.zone}</TableHead>
                <TableHead>{adminT.pricing.season}</TableHead>
                <TableHead>{adminT.pricing.start}</TableHead>
                <TableHead>{adminT.pricing.end}</TableHead>
                <TableHead>{adminT.pricing.price2p}</TableHead>
                <TableHead>{adminT.pricing.price34p}</TableHead>
                <TableHead>{adminT.pricing.minNights}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) =>
                editRate.id === rate.id ? (
                  <TableRow key={rate.id}>
                    <TableCell colSpan={8}>
                      <div className="grid md:grid-cols-7 gap-3 items-end">
                        <div>
                          <Label className="text-xs">{adminT.pricing.season}</Label>
                          <Select
                            value={editRate.season}
                            onValueChange={(v) =>
                              setEditRate((r) => ({ ...r, season: (v as RateSeason) ?? r.season }))
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SEASON_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{adminT.pricing.start}</Label>
                          <Input
                            type="date"
                            value={editRate.start_date ?? ""}
                            onChange={(e) => setEditRate((r) => ({ ...r, start_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{adminT.pricing.end}</Label>
                          <Input
                            type="date"
                            value={editRate.end_date ?? ""}
                            onChange={(e) => setEditRate((r) => ({ ...r, end_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{adminT.pricing.price2pLabel}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={((editRate.price_cents_per_night ?? 0) / 100).toFixed(2)}
                            onChange={(e) =>
                              setEditRate((r) => ({
                                ...r,
                                price_cents_per_night: Math.round(parseFloat(e.target.value) * 100),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{adminT.pricing.price34pLabel}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={((editRate.price_cents_3_4_guests ?? 0) / 100).toFixed(2)}
                            onChange={(e) =>
                              setEditRate((r) => ({
                                ...r,
                                price_cents_3_4_guests: Math.round(parseFloat(e.target.value) * 100),
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{adminT.pricing.minNightsLabel}</Label>
                          <Input
                            type="number"
                            value={editRate.min_nights ?? 1}
                            onChange={(e) =>
                              setEditRate((r) => ({ ...r, min_nights: parseInt(e.target.value, 10) }))
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="icon" onClick={handleUpdateRate} disabled={saving}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => setEditRate({})}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={rate.id}>
                    <TableCell>{rate.zone?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{seasonLabel(rate.season)}</Badge>
                    </TableCell>
                    <TableCell>{rate.start_date}</TableCell>
                    <TableCell>{rate.end_date}</TableCell>
                    <TableCell className="font-medium">{formatPrice(rate.price_cents_per_night)}</TableCell>
                    <TableCell className="font-medium">{formatPrice(rate.price_cents_3_4_guests)}</TableCell>
                    <TableCell>{rate.min_nights}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditRate({ ...rate })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteRate(rate.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>

          <form onSubmit={handleAddRate} className="grid md:grid-cols-6 gap-4 border-t pt-6">
            <div className="space-y-2">
              <Label>{adminT.pricing.zone}</Label>
              <Select
                value={newRate.zone_id}
                onValueChange={(v) => setNewRate((r) => ({ ...r, zone_id: v ?? r.zone_id }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.season}</Label>
              <Select
                value={newRate.season}
                onValueChange={(v) =>
                  setNewRate((r) => ({ ...r, season: (v as RateSeason) ?? r.season }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEASON_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.start}</Label>
              <Input type="date" value={newRate.start_date} onChange={(e) => setNewRate((r) => ({ ...r, start_date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.end}</Label>
              <Input type="date" value={newRate.end_date} onChange={(e) => setNewRate((r) => ({ ...r, end_date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.price2pLabel}</Label>
              <Input type="number" step="0.01" value={newRate.price_euros} onChange={(e) => setNewRate((r) => ({ ...r, price_euros: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.price34pLabel}</Label>
              <Input type="number" step="0.01" value={newRate.price_euros_3_4} onChange={(e) => setNewRate((r) => ({ ...r, price_euros_3_4: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.minNightsLabel}</Label>
              <Input type="number" value={newRate.min_nights} onChange={(e) => setNewRate((r) => ({ ...r, min_nights: e.target.value }))} required />
            </div>
            <div className="md:col-span-6">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {adminT.pricing.addRate}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{adminT.pricing.extraServices}</CardTitle>
          <CardDescription>{adminT.pricing.extraServicesDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {services.map((service) => {
              const visual = getServiceVisual(service.icon);
              return editService.id === service.id ? (
                <div key={service.id} className="grid md:grid-cols-4 gap-3 p-4 border rounded-lg">
                  <div>
                    <Label className="text-xs">{adminT.pricing.namePt}</Label>
                    <Input
                      value={editService.name ?? ""}
                      onChange={(e) => setEditService((s) => ({ ...s, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{adminT.pricing.nameEn}</Label>
                    <Input
                      value={editService.name_en ?? ""}
                      onChange={(e) => setEditService((s) => ({ ...s, name_en: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{adminT.pricing.icon}</Label>
                    <Select
                      value={editService.icon}
                      onValueChange={(v) => setEditService((s) => ({ ...s, icon: v ?? s.icon }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((key) => (
                          <SelectItem key={key} value={key}>
                            {getServiceVisual(key).emoji} {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{adminT.pricing.priceOptional}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editService.price_cents != null ? (editService.price_cents / 100).toFixed(2) : ""}
                      onChange={(e) =>
                        setEditService((s) => ({
                          ...s,
                          price_cents: e.target.value
                            ? Math.round(parseFloat(e.target.value) * 100)
                            : null,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{adminT.pricing.labelPt}</Label>
                    <Input
                      value={editService.price_label_pt ?? ""}
                      onChange={(e) => setEditService((s) => ({ ...s, price_label_pt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{adminT.pricing.labelEn}</Label>
                    <Input
                      value={editService.price_label_en ?? ""}
                      onChange={(e) => setEditService((s) => ({ ...s, price_label_en: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{adminT.pricing.description}</Label>
                    <Input
                      value={editService.description ?? ""}
                      onChange={(e) => setEditService((s) => ({ ...s, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{adminT.pricing.active}</Label>
                    <Select
                      value={editService.active ? "true" : "false"}
                      onValueChange={(v) => setEditService((s) => ({ ...s, active: v === "true" }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">{adminT.common.yes}</SelectItem>
                        <SelectItem value="false">{adminT.common.no}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4 flex gap-2">
                    <Button type="button" onClick={handleUpdateService} disabled={saving}>{adminT.common.save}</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditService({})}>{adminT.common.cancel}</Button>
                  </div>
                </div>
              ) : (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{visual.emoji}</span>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.price_label_pt ?? (service.price_cents != null ? formatPrice(service.price_cents) : "—")}
                        {!service.active && ` ${adminT.pricing.inactiveSuffix}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditService({ ...service })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteService(service.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddService} className="grid md:grid-cols-4 gap-4 border-t pt-6">
            <div className="space-y-2">
              <Label>{adminT.pricing.namePt}</Label>
              <Input value={newService.name} onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.nameEn}</Label>
              <Input value={newService.name_en} onChange={(e) => setNewService((s) => ({ ...s, name_en: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.icon}</Label>
              <Select value={newService.icon} onValueChange={(v) => setNewService((s) => ({ ...s, icon: v ?? s.icon }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {getServiceVisual(key).emoji} {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{adminT.pricing.labelPt}</Label>
              <Input value={newService.price_label_pt} onChange={(e) => setNewService((s) => ({ ...s, price_label_pt: e.target.value }))} placeholder={adminT.common.included} />
            </div>
            <div className="md:col-span-4">
              <Button type="submit" disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                {adminT.pricing.addService}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
