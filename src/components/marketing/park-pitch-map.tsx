"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Cable, Ruler, Zap, ZapOff } from "lucide-react";
import { BookCta } from "@/components/booking/book-cta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  PARK_AERIAL_IMAGE,
  PARK_FACILITIES_PLAN_IMAGE,
  PARK_AERIAL_ASPECT_CLASS,
  PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
  LEGEND_SWATCH_STYLES,
  getSpotMarkerClass,
  getSpotVisualType,
  getSpotZoneSlug,
  spotIsOver9m,
  type PitchMapSpot,
  type SpotVisualType,
} from "@/lib/park-pitch-map-defaults";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { localePath } from "@/lib/locale-path";

const FACILITY_ITEMS = [
  { id: "1", key: "reception" as const },
  { id: "2", key: "showers" as const },
  { id: "3", key: "laundry" as const },
  { id: "4", key: "bbq" as const },
  { id: "5", key: "petanque" as const },
] as const;

function PitchMarker({
  spot,
  selected,
  onSelect,
}: {
  spot: PitchMapSpot;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <button
      type="button"
      title={spot.code}
      aria-label={spot.code}
      onClick={() => onSelect(spot.code)}
      className={cn(getSpotMarkerClass(spot, selected))}
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
    >
      {spot.code}
    </button>
  );
}

function formatDimensions(
  spot: PitchMapSpot,
  labels: { width: string; length: string; separator: string }
) {
  if (spot.width_m == null && spot.length_m == null) return null;
  const width = spot.width_m != null ? `${spot.width_m} m` : "—";
  const length = spot.length_m != null ? `${spot.length_m} m` : "—";
  return `${labels.width}: ${width} ${labels.separator} ${labels.length}: ${length}`;
}

function zoneLabelForSlug(
  zoneSlug: ReturnType<typeof getSpotZoneSlug>,
  over9m: boolean,
  mapT: ReturnType<typeof getTranslations>["about"]["pitch_map"]
) {
  if (over9m) {
    return zoneSlug === "sem-eletricidade"
      ? `${mapT.zone_long_pitch} · ${mapT.zone_no_electric}`
      : `${mapT.zone_long_pitch} · ${mapT.zone_electric}`;
  }
  if (zoneSlug === "sem-eletricidade") return mapT.zone_no_electric;
  return mapT.zone_electric;
}

function SpotDetailDialog({
  locale,
  spot,
  open,
  onOpenChange,
}: {
  locale: Locale;
  spot: PitchMapSpot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = getTranslations(locale);
  const mapT = t.about.pitch_map;

  if (!spot) return null;

  const dimensions = formatDimensions(spot, {
    width: mapT.width_label,
    length: mapT.length_label,
    separator: mapT.dimensions_separator,
  });
  const zoneSlug = getSpotZoneSlug(spot);
  const zoneLabel = zoneLabelForSlug(zoneSlug, spotIsOver9m(spot), mapT);
  const bookHref = `${localePath(locale, "/book")}?pitch=${encodeURIComponent(spot.code)}`;
  const visualType = getSpotVisualType(spot);
  const traitLabel =
    visualType === "long-pitch"
      ? mapT.long_pitch
      : visualType === "electric"
        ? mapT.electric
        : mapT.no_electric;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <div className="relative aspect-[4/3] bg-muted">
          {spot.image_url ? (
            <Image
              src={spot.image_url}
              alt={mapT.spot_photo_alt.replace("{code}", spot.code)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 448px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
              {mapT.no_photo}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="font-heading text-2xl">{spot.code}</DialogTitle>
            <DialogDescription className="sr-only">{spot.code}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              {visualType === "long-pitch" ? (
                <Cable className="h-4 w-4 text-amber-600" />
              ) : visualType === "electric" ? (
                <Zap className="h-4 w-4 text-red-500" />
              ) : (
                <ZapOff className="h-4 w-4 text-slate-500" />
              )}
              <span>{traitLabel}</span>
            </p>
            <p>{zoneLabel}</p>
            {spot.electricity_distance_m != null && (
              <p className="flex items-center gap-2">
                <Cable className="h-4 w-4" />
                {mapT.electricity_distance.replace(
                  "{distance}",
                  String(spot.electricity_distance_m)
                )}
              </p>
            )}
            {dimensions && (
              <p className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                {dimensions}
              </p>
            )}
          </div>

          <BookCta locale={locale} href={bookHref} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            {mapT.reserve}
            <ArrowRight className="ml-2 h-4 w-4" />
          </BookCta>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ParkPitchMap({
  locale,
  spots,
  showFacilities = false,
}: {
  locale: Locale;
  spots: PitchMapSpot[];
  /** About page: facilities plan image + amenity legend + pitch markers */
  showFacilities?: boolean;
}) {
  const t = getTranslations(locale);
  const mapT = t.about.pitch_map;
  const facilitiesT = t.about.facilities_map;
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selectedSpot = spots.find((spot) => spot.code === selectedCode) ?? null;

  const title = showFacilities ? facilitiesT.title : mapT.title;
  const subtitle = showFacilities ? facilitiesT.combined_subtitle : mapT.subtitle;
  const imageSrc = showFacilities ? PARK_FACILITIES_PLAN_IMAGE : PARK_AERIAL_IMAGE;
  const imageAlt = showFacilities ? facilitiesT.image_alt : mapT.image_alt;

  return (
    <div className="space-y-4">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{subtitle}</p>
      </div>

      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-2xl border shadow-xl shadow-primary/10 ring-1 ring-black/5 bg-muted",
          PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
          PARK_AERIAL_ASPECT_CLASS
        )}
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 1152px"
          priority={showFacilities}
        />

        <div className="absolute inset-0">
          {spots.map((spot) => (
            <PitchMarker
              key={spot.code}
              spot={spot}
              selected={selectedCode === spot.code}
              onSelect={setSelectedCode}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 sm:gap-x-6 text-xs sm:text-sm text-muted-foreground">
          {(
            [
              ["electric", mapT.legend_electric],
              ["no-electric", mapT.legend_no_electric],
              ["long-pitch", mapT.legend_long_pitch],
            ] as const satisfies ReadonlyArray<[SpotVisualType, string]>
          ).map(([type, label]) => (
            <span key={type} className="inline-flex items-center gap-2">
              <span className={LEGEND_SWATCH_STYLES[type]} />
              {label}
            </span>
          ))}
        </div>

        {showFacilities && (
          <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t">
            {FACILITY_ITEMS.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border bg-card/80 px-3 py-2 text-sm"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
                  aria-hidden
                >
                  {item.id}
                </span>
                <span className="font-medium text-foreground">{facilitiesT[item.key]}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-lg border bg-card/80 px-3 py-2 text-sm sm:col-span-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center text-red-600" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                  <path d="M12 4 L22 20 H2 Z" />
                </svg>
              </span>
              <span className="font-medium text-foreground">{facilitiesT.electricity}</span>
            </div>
          </div>
        )}
      </div>

      <SpotDetailDialog
        locale={locale}
        spot={selectedSpot}
        open={selectedCode !== null}
        onOpenChange={(open) => !open && setSelectedCode(null)}
      />
    </div>
  );
}
