"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Plus, Save, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminT } from "@/lib/admin-i18n";
import {
  applyPitchTypeToSpot,
  getSpotMarkerClass,
  getSpotZoneSlug,
  PARK_AERIAL_IMAGE,
  PARK_AERIAL_ASPECT_CLASS,
  spotIsOver9m,
} from "@/lib/park-pitch-map-defaults";
import type { PitchMapSpotRecord } from "@/lib/pitch-map";
import { cn } from "@/lib/utils";

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

function normalizePitchCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidPitchCode(code: string) {
  return /^[A-Z0-9]{1,10}$/.test(code);
}

function spotClassName(spot: PitchMapSpotRecord, selected: boolean, dragging: boolean) {
  return cn(
    getSpotMarkerClass(spot, selected).replace("hover:scale-110 hover:z-20", ""),
    "px-1 py-px text-[7px] shadow-md cursor-grab select-none touch-none",
    dragging ? "cursor-grabbing z-40 scale-[1.1]" : "z-10",
    selected && !dragging && "z-30"
  );
}

export function PitchMapEditor({ initialSpots }: { initialSpots: PitchMapSpotRecord[] }) {
  const [spots, setSpots] = useState(
    [...initialSpots].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [selectedCode, setSelectedCode] = useState(initialSpots[0]?.code ?? "");
  const [filter, setFilter] = useState("");
  const [newCode, setNewCode] = useState("");
  const [draggingCode, setDraggingCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const selected = spots.find((spot) => spot.code === selectedCode) ?? spots[0];

  const filteredSpots = useMemo(() => {
    const query = filter.trim().toUpperCase();
    const list = query ? spots.filter((spot) => spot.code.includes(query)) : spots;
    return [...list].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [filter, spots]);

  const updateSpot = useCallback((code: string, patch: Partial<PitchMapSpotRecord>) => {
    setSpots((current) =>
      current.map((spot) => (spot.code === code ? { ...spot, ...patch } : spot))
    );
    setDirty(true);
    setMessage(null);
  }, []);

  function handleAddPitch() {
    const code = normalizePitchCode(newCode);
    if (!code) {
      setMessage(adminT.pitchMap.addPitchEmpty);
      return;
    }
    if (!isValidPitchCode(code)) {
      setMessage(adminT.pitchMap.addPitchInvalid);
      return;
    }
    if (spots.some((spot) => spot.code.toUpperCase() === code)) {
      setMessage(adminT.pitchMap.addPitchExists);
      return;
    }

    const pitchType = applyPitchTypeToSpot(false, true);
    const next: PitchMapSpotRecord = {
      code,
      x: 50,
      y: 50,
      panoramic: false,
      electric: pitchType.electric,
      over_9m: pitchType.over_9m,
      zone_slug: pitchType.zone_slug,
      sort_order: spots.length + 1,
      image_url: null,
      width_m: null,
      length_m: null,
      electricity_distance_m: null,
    };

    setSpots((current) => [...current, next]);
    setSelectedCode(code);
    setNewCode("");
    setDirty(true);
    setMessage(null);
  }

  function handleRemovePitch() {
    if (!selected) return;
    if (spots.length <= 1) {
      setMessage(adminT.pitchMap.removePitchLast);
      return;
    }
    if (
      !window.confirm(
        adminT.pitchMap.removePitchConfirm.replace("{code}", selected.code)
      )
    ) {
      return;
    }

    const remaining = spots.filter((spot) => spot.code !== selected.code);
    setSpots(remaining);
    setSelectedCode(remaining[0]?.code ?? "");
    setDirty(true);
    setMessage(null);
  }

  const positionFromClient = useCallback((clientX: number, clientY: number) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clampPercent(((clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((clientY - rect.top) / rect.height) * 100);
    return { x, y };
  }, []);

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedCode || draggingCode) return;
    if ((event.target as HTMLElement).closest("[data-pitch-marker]")) return;
    const position = positionFromClient(event.clientX, event.clientY);
    if (!position) return;
    updateSpot(selectedCode, position);
  };

  useEffect(() => {
    if (!draggingCode) return;

    const handleMove = (event: PointerEvent) => {
      const position = positionFromClient(event.clientX, event.clientY);
      if (!position) return;
      updateSpot(draggingCode, position);
    };

    const handleUp = () => setDraggingCode(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingCode, positionFromClient, updateSpot]);

  async function handlePhotoUpload(file: File) {
    if (!selected) return;
    setUploadingPhoto(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("code", selected.code);
    const res = await fetch("/api/admin/pitch-map/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    setUploadingPhoto(false);
    if (res.ok) {
      updateSpot(selected.code, { image_url: data.image_url });
      setMessage(adminT.pitchMap.photoUpdated.replace("{code}", selected.code));
      setDirty(false);
    } else {
      setMessage(data.error ?? adminT.pitchMap.photoUploadError);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/pitch-map", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spots: spots.map((spot, index) => ({
          code: spot.code,
          x: spot.x,
          y: spot.y,
          panoramic: false,
          electric: spot.electric,
          over_9m: Boolean(spot.over_9m),
          sort_order: index + 1,
          image_url: spot.image_url ?? null,
          width_m: spot.width_m ?? null,
          length_m: spot.length_m ?? null,
          electricity_distance_m: spot.electricity_distance_m ?? null,
          zone_slug: spot.zone_slug ?? getSpotZoneSlug(spot),
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      setMessage(adminT.pitchMap.mapSaved);
    } else {
      setMessage(data.error ?? adminT.pitchMap.mapSaveError);
    }
  }

  return (
    <div className="grid xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle className="text-lg">{adminT.pitchMap.pitches}</CardTitle>
          <CardDescription>{adminT.pitchMap.pitchesDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={adminT.pitchMap.filterPlaceholder}
          />

          <div className="flex gap-2">
            <Input
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddPitch();
                }
              }}
              placeholder={adminT.pitchMap.addPitchPlaceholder}
              className="uppercase"
              maxLength={10}
            />
            <Button type="button" variant="outline" onClick={handleAddPitch} className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              {adminT.pitchMap.addPitch}
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto grid grid-cols-3 gap-2">
            {filteredSpots.map((spot) => (
              <button
                key={spot.code}
                type="button"
                onClick={() => setSelectedCode(spot.code)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors",
                  selectedCode === spot.code
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {spot.code}
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-3 border-t pt-4">
              <p className="font-semibold">{selected.code}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">X (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={selected.x}
                    onChange={(event) =>
                      updateSpot(selected.code, { x: clampPercent(Number(event.target.value)) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Y (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={selected.y}
                    onChange={(event) =>
                      updateSpot(selected.code, { y: clampPercent(Number(event.target.value)) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-lg border p-3">
                <Label className="text-xs">{adminT.pitchMap.pitchType}</Label>
                {(() => {
                  const isOver9m = spotIsOver9m(selected);
                  const withElectricity = Boolean(selected.electric);

                  function setPitchType(nextElectricity: boolean, nextOver9m: boolean) {
                    updateSpot(selected.code, applyPitchTypeToSpot(nextOver9m, nextElectricity));
                  }

                  return (
                    <>
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">
                          {adminT.pitchMap.electricityLabel}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPitchType(true, isOver9m)}
                            className={cn(
                              "flex-1 rounded-md border px-2 py-2 text-xs transition-colors",
                              withElectricity
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "hover:bg-muted/50"
                            )}
                          >
                            {adminT.pitchMap.zoneWithElectricity}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPitchType(false, isOver9m)}
                            className={cn(
                              "flex-1 rounded-md border px-2 py-2 text-xs transition-colors",
                              !withElectricity
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "hover:bg-muted/50"
                            )}
                          >
                            {adminT.pitchMap.zoneWithoutElectricity}
                          </button>
                        </div>
                      </div>

                      <label className="flex items-start gap-2 cursor-pointer rounded-md border px-2 py-2 hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={isOver9m}
                          onChange={(event) => {
                            setPitchType(withElectricity, event.target.checked);
                          }}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                        />
                        <span className="text-xs leading-snug">
                          <span className="font-medium">{adminT.pitchMap.over9mLabel}</span>
                          <span className="block text-muted-foreground mt-0.5">
                            {adminT.pitchMap.over9mHint}
                          </span>
                        </span>
                      </label>
                    </>
                  );
                })()}
              </div>

              <div>
                <Label className="text-xs">{adminT.pitchMap.electricityDistance}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder={adminT.pitchMap.electricityDistancePlaceholder}
                  value={selected.electricity_distance_m ?? ""}
                  onChange={(event) =>
                    updateSpot(selected.code, {
                      electricity_distance_m: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{adminT.pitchMap.width}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder={adminT.pitchMap.widthPlaceholder}
                    value={selected.width_m ?? ""}
                    onChange={(event) =>
                      updateSpot(selected.code, {
                        width_m: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">{adminT.pitchMap.length}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    placeholder={adminT.pitchMap.lengthPlaceholder}
                    value={selected.length_m ?? ""}
                    onChange={(event) =>
                      updateSpot(selected.code, {
                        length_m: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{adminT.pitchMap.pitchPhoto}</Label>
                {selected.image_url ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={selected.image_url}
                      alt={adminT.pitchMap.pitchAlt.replace("{code}", selected.code)}
                      fill
                      className="object-cover"
                      sizes="280px"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{adminT.pitchMap.noPhoto}</p>
                )}
                <label
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "inline-flex cursor-pointer",
                    uploadingPhoto && "pointer-events-none opacity-50"
                  )}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handlePhotoUpload(file);
                      event.target.value = "";
                    }}
                  />
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {adminT.pitchMap.uploadPhoto}
                </label>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleRemovePitch}
                disabled={spots.length <= 1}
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {adminT.pitchMap.removePitch}
              </Button>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving || !dirty} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {adminT.pitchMap.saveMap}
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {adminT.pitchMap.positionMarkers}
          </CardTitle>
          <CardDescription>{adminT.pitchMap.positionDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={mapRef}
            onClick={handleMapClick}
            className={cn(
              "relative w-full overflow-hidden rounded-xl border bg-muted cursor-crosshair",
              PARK_AERIAL_ASPECT_CLASS
            )}
          >
            <Image
              src={PARK_AERIAL_IMAGE}
              alt={adminT.pitchMap.aerialAlt}
              fill
              className="object-contain pointer-events-none"
              sizes="(max-width: 1280px) 100vw, 1152px"
              draggable={false}
            />

            {spots.map((spot) => (
              <button
                key={spot.code}
                type="button"
                data-pitch-marker
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedCode(spot.code);
                  setDraggingCode(spot.code);
                }}
                className={spotClassName(spot, selectedCode === spot.code, draggingCode === spot.code)}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              >
                {spot.code}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
