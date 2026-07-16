export type PitchMapSpot = {
  code: string;
  x: number;
  y: number;
  /** @deprecated Prefer zone_slug; kept for DB compatibility */
  panoramic: boolean;
  electric: boolean;
  /** Long pitch (+9 m) — quality attribute, not a pricing zone */
  over_9m?: boolean;
  image_url?: string | null;
  width_m?: number | null;
  length_m?: number | null;
  zone_slug?: string | null;
  electricity_distance_m?: number | null;
  category?: string | null;
  max_amperage?: number;
  status?: "available" | "occupied" | "maintenance";
};

/** Zones used for public pricing / online booking */
export const PRICING_ZONE_SLUGS = ["com-eletricidade", "sem-eletricidade"] as const;

export type PricingZoneSlug = (typeof PRICING_ZONE_SLUGS)[number];

/** @deprecated Prefer PRICING_ZONE_SLUGS — adaptada-9m is no longer a tariff zone */
export const ZONE_SLUGS = [...PRICING_ZONE_SLUGS, "adaptada-9m"] as const;

export type ZoneSlug = (typeof ZONE_SLUGS)[number];

export type SpotVisualType = "electric" | "no-electric" | "long-pitch";

export function isPricingZoneSlug(slug: string): slug is PricingZoneSlug {
  return (PRICING_ZONE_SLUGS as readonly string[]).includes(slug);
}

export function zoneSlugHasElectricity(slug: string): boolean {
  return slug === "com-eletricidade";
}

export function spotIsOver9m(
  spot: Pick<PitchMapSpot, "over_9m" | "zone_slug">
): boolean {
  return Boolean(spot.over_9m) || spot.zone_slug === "adaptada-9m";
}

/** Pricing / booking zone from electricity (never adaptada-9m). */
export function getSpotZoneSlug(
  spot: Pick<PitchMapSpot, "electric" | "zone_slug">
): PricingZoneSlug {
  if (spot.zone_slug === "sem-eletricidade") return "sem-eletricidade";
  if (spot.zone_slug === "com-eletricidade") return "com-eletricidade";
  // Legacy adaptada-9m or missing slug → derive from electricity
  return spot.electric ? "com-eletricidade" : "sem-eletricidade";
}

export function getSpotVisualType(
  spot: Pick<PitchMapSpot, "electric" | "zone_slug" | "over_9m">
): SpotVisualType {
  if (spotIsOver9m(spot)) return "long-pitch";
  if (!spot.electric) return "no-electric";
  return "electric";
}

/** Independently set +9 m and electricity. Tariff zone follows electricity only. */
export function applyPitchTypeToSpot(
  over9m: boolean,
  electric: boolean
): Pick<PitchMapSpot, "zone_slug" | "electric" | "over_9m" | "panoramic"> {
  return {
    zone_slug: electric ? "com-eletricidade" : "sem-eletricidade",
    electric,
    over_9m: over9m,
    panoramic: false,
  };
}

export function applyZoneSlugToSpot(
  zoneSlug: PricingZoneSlug | ZoneSlug,
  electric?: boolean,
  over9m = false
): Pick<PitchMapSpot, "zone_slug" | "electric" | "over_9m" | "panoramic"> {
  const pricingSlug: PricingZoneSlug =
    zoneSlug === "sem-eletricidade" || electric === false
      ? "sem-eletricidade"
      : "com-eletricidade";
  return {
    zone_slug: pricingSlug,
    electric: electric ?? pricingSlug === "com-eletricidade",
    over_9m: over9m || zoneSlug === "adaptada-9m",
    panoramic: false,
  };
}

const MARKER_BASE =
  "absolute -translate-x-1/2 -translate-y-1/2 rounded px-0.5 py-px text-[6px] sm:text-[7px] font-bold leading-none shadow-sm border transition-transform hover:scale-110 hover:z-20";

const MARKER_STYLES: Record<SpotVisualType, string> = {
  electric: "bg-white/90 text-primary border-white/80 ring-1 ring-red-400/80",
  "no-electric": "bg-slate-500/90 text-white border-slate-300",
  "long-pitch": "bg-amber-500/90 text-white border-amber-300 ring-1 ring-amber-200/80",
};

export const LEGEND_SWATCH_STYLES: Record<SpotVisualType, string> = {
  electric: "h-3 w-5 rounded border bg-white ring-1 ring-red-400/80",
  "no-electric": "h-3 w-5 rounded bg-slate-500 border border-slate-300",
  "long-pitch": "h-3 w-5 rounded bg-amber-500 border border-amber-300",
};

export function getSpotMarkerClass(
  spot: Pick<PitchMapSpot, "electric" | "zone_slug" | "over_9m">,
  selected = false
) {
  const selectedClass = selected ? "scale-[1.15] z-30 ring-2 ring-amber-400" : "";
  return `${MARKER_BASE} ${MARKER_STYLES[getSpotVisualType(spot)]} ${selectedClass}`;
}

function spread(count: number, startX: number, endX: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Number(((startX + endX) / 2).toFixed(2))];
  return Array.from({ length: count }, (_, index) =>
    Number((startX + (index * (endX - startX)) / (count - 1)).toFixed(2))
  );
}

function rowSpots(
  prefix: string,
  numbers: number[],
  y: number,
  startX: number,
  endX: number,
  options: { electric?: boolean; over_9m?: boolean } = {}
): PitchMapSpot[] {
  const xs = spread(numbers.length, startX, endX);
  const electric = options.electric ?? true;
  const over_9m = options.over_9m ?? false;
  return numbers.map((number, index) => ({
    code: `${prefix}${number}`,
    x: xs[index],
    y,
    panoramic: false,
    electric,
    over_9m,
    zone_slug: electric ? "com-eletricidade" : "sem-eletricidade",
  }));
}

/** Fallback layout when database is empty or unavailable. */
export const DEFAULT_PITCH_MAP: PitchMapSpot[] = [
  ...rowSpots("A", [1, 2, 3, 4, 5, 6, 7, 8, 9], 10.5, 7, 40),
  ...rowSpots("B", [1, 2, 3, 4, 5], 10.5, 42.5, 56.5),
  ...rowSpots("C", [1, 2, 3], 8.5, 68, 80),
  ...rowSpots("A", [10, 11, 12, 13, 14, 15, 16], 23.5, 5, 34),
  ...rowSpots("B", [6, 7, 8, 9], 23.5, 36.5, 49),
  ...rowSpots("C", [4, 5, 6], 23.5, 66, 78),
  ...rowSpots("E", [1, 2, 3, 4, 5, 6, 7], 31, 5, 32),
  ...rowSpots("D", [1, 2, 3], 31, 35, 44),
  { code: "D7", x: 50.5, y: 31, panoramic: false, electric: true, over_9m: false, zone_slug: "com-eletricidade" },
  ...rowSpots("C", [7, 8, 9], 31, 66, 78),
  ...rowSpots("E", [8, 9, 10, 11, 12, 13], 41.5, 5, 30),
  ...rowSpots("D", [4, 5, 6], 41.5, 34.5, 46.5, { electric: true, over_9m: true }),
  ...rowSpots("F", [3, 2, 1], 49.5, 36, 46),
  ...rowSpots("F", [8, 7, 6, 5, 4], 62.5, 8, 33),
];

export const PARK_AERIAL_IMAGE = "/images/park-aerial.jpg";
/** Annotated plan with amenity numbers and electricity triangles (Sobre). */
export const PARK_FACILITIES_PLAN_IMAGE = "/images/park-facilities-plan.png";

/** Matches public/images/park-aerial.jpg (1024×541) so markers align without edge cropping. */
export const PARK_AERIAL_ASPECT_CLASS = "aspect-[1024/541]";
export const PARK_AERIAL_MAP_MAX_WIDTH_CLASS = "max-w-[1400px]";
