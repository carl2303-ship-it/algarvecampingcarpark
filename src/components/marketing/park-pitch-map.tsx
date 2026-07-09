"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Ruler, Zap, ZapOff, Waves } from "lucide-react";
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
  PARK_AERIAL_ASPECT_CLASS,
  PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
  LEGEND_SWATCH_STYLES,
  getSpotMarkerClass,
  getSpotVisualType,
  getSpotZoneSlug,
  type PitchMapSpot,
  type SpotVisualType,
} from "@/lib/park-pitch-map-defaults";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
  locale: Locale,
  labels: { width: string; length: string; separator: string }
) {
  if (spot.width_m == null && spot.length_m == null) return null;
  const width = spot.width_m != null ? `${spot.width_m} m` : "—";
  const length = spot.length_m != null ? `${spot.length_m} m` : "—";
  return locale === "pt"
    ? `${labels.width}: ${width} · ${labels.length}: ${length}`
    : `${labels.width}: ${width} ${labels.separator} ${labels.length}: ${length}`;
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
  const prefix = locale === "en" ? "/en" : "";
  const mapT = t.about.pitch_map;

  if (!spot) return null;

  const dimensions = formatDimensions(spot, locale, {
    width: mapT.width_label,
    length: mapT.length_label,
    separator: mapT.dimensions_separator,
  });
  const zoneSlug = getSpotZoneSlug(spot);
  const zoneLabel =
    zoneSlug === "premium-vista-mar"
      ? mapT.zone_premium
      : zoneSlug === "premium-sem-eletricidade"
        ? mapT.zone_premium_no_electric
        : zoneSlug === "sem-eletricidade"
          ? mapT.zone_no_electric
          : mapT.zone_electric;

  const bookHref = `${prefix}/book?pitch=${encodeURIComponent(spot.code)}`;
  const visualType = getSpotVisualType(spot);
  const traitLabel =
    visualType === "panoramic-electric"
      ? mapT.panoramic_electric
      : visualType === "panoramic-no-electric"
        ? mapT.panoramic_no_electric
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
            <DialogDescription className="sr-only">
              {spot.code}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              {visualType === "panoramic-electric" || visualType === "panoramic-no-electric" ? (
                <Waves className="h-4 w-4 text-emerald-600" />
              ) : visualType === "electric" ? (
                <Zap className="h-4 w-4 text-red-500" />
              ) : (
                <ZapOff className="h-4 w-4 text-slate-500" />
              )}
              <span>{traitLabel}</span>
            </p>
                <p>{zoneLabel}</p>
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
}: {
  locale: Locale;
  spots: PitchMapSpot[];
}) {
  const t = getTranslations(locale);
  const mapT = t.about.pitch_map;
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selectedSpot = spots.find((spot) => spot.code === selectedCode) ?? null;

  return (
    <div className="space-y-4">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-2">{mapT.title}</h2>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{mapT.subtitle}</p>
      </div>

      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden rounded-2xl border shadow-xl shadow-primary/10 ring-1 ring-black/5 bg-muted",
          PARK_AERIAL_MAP_MAX_WIDTH_CLASS,
          PARK_AERIAL_ASPECT_CLASS
        )}
      >
        <Image
          src={PARK_AERIAL_IMAGE}
          alt={mapT.image_alt}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 1152px"
          priority={false}
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

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 sm:gap-x-6 text-xs sm:text-sm text-muted-foreground max-w-3xl mx-auto">
        {(
          [
            ["electric", mapT.legend_electric],
            ["no-electric", mapT.legend_no_electric],
            ["panoramic-electric", mapT.legend_panoramic_electric],
            ["panoramic-no-electric", mapT.legend_panoramic_no_electric],
          ] as const satisfies ReadonlyArray<[SpotVisualType, string]>
        ).map(([type, label]) => (
          <span key={type} className="inline-flex items-center gap-2">
            <span className={LEGEND_SWATCH_STYLES[type]} />
            {label}
          </span>
        ))}
      </div>

      <SpotDetailDialog
        locale={locale}
        spot={selectedSpot}
        open={selectedCode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCode(null);
        }}
      />
    </div>
  );
}
