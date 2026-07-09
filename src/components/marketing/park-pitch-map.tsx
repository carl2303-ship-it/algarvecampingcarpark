"use client";

import Image from "next/image";
import { useState } from "react";
import { PARK_AERIAL_IMAGE } from "@/lib/park-pitch-map-defaults";
import type { PitchMapSpot } from "@/lib/park-pitch-map-defaults";
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
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-bold leading-none shadow-sm border transition-transform hover:scale-110 hover:z-20",
        spot.panoramic
          ? "bg-emerald-500/90 text-white border-emerald-300"
          : "bg-white/90 text-primary border-white/80",
        spot.electric && !spot.panoramic && "ring-1 ring-red-400/80",
        selected && "scale-125 z-30 ring-2 ring-amber-400"
      )}
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
    >
      {spot.code}
    </button>
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
  const [selected, setSelected] = useState<string | null>(null);
  const selectedSpot = spots.find((spot) => spot.code === selected);

  return (
    <div className="space-y-4">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-2">
          {t.location.pitch_map_title}
        </h2>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
          {t.location.pitch_map_subtitle}
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border shadow-xl shadow-primary/10 ring-1 ring-black/5 bg-muted aspect-[16/10]">
        <Image
          src={PARK_AERIAL_IMAGE}
          alt={t.location.pitch_map_image_alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1152px"
          priority={false}
        />

        <div className="absolute inset-0">
          {spots.map((spot) => (
            <PitchMarker
              key={spot.code}
              spot={spot}
              selected={selected === spot.code}
              onSelect={setSelected}
            />
          ))}
        </div>

        {selectedSpot && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-56 rounded-xl bg-black/75 text-white px-4 py-3 text-sm backdrop-blur-sm">
            <p className="font-semibold text-base">{selectedSpot.code}</p>
            <p className="text-white/80 text-xs mt-1">
              {selectedSpot.panoramic
                ? t.location.pitch_map_panoramic
                : t.location.pitch_map_standard}
              {" · "}
              {selectedSpot.electric
                ? t.location.pitch_map_electric
                : t.location.pitch_map_no_electric}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-xs sm:text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded border bg-white ring-1 ring-red-400/80" />
          {t.location.pitch_map_legend_electric}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-emerald-500 border border-emerald-300" />
          {t.location.pitch_map_legend_panoramic}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-white/90 border border-white/80" />
          {t.location.pitch_map_legend_standard}
        </span>
      </div>
    </div>
  );
}
