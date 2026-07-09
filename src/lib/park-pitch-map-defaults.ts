export type PitchMapSpot = {
  code: string;
  x: number;
  y: number;
  panoramic: boolean;
  electric: boolean;
  image_url?: string | null;
  width_m?: number | null;
  length_m?: number | null;
  zone_slug?: string | null;
  category?: string | null;
  max_amperage?: number;
  status?: "available" | "occupied" | "maintenance";
};

export const ZONE_SLUGS = [
  "com-eletricidade",
  "sem-eletricidade",
  "premium-vista-mar",
  "premium-sem-eletricidade",
] as const;

export type ZoneSlug = (typeof ZONE_SLUGS)[number];

export type SpotVisualType =
  | "electric"
  | "no-electric"
  | "panoramic-electric"
  | "panoramic-no-electric";

export function getSpotVisualType(
  spot: Pick<PitchMapSpot, "panoramic" | "electric">
): SpotVisualType {
  if (spot.panoramic && spot.electric) return "panoramic-electric";
  if (spot.panoramic) return "panoramic-no-electric";
  if (!spot.electric) return "no-electric";
  return "electric";
}

export function getSpotZoneSlug(spot: Pick<PitchMapSpot, "panoramic" | "electric" | "zone_slug">): ZoneSlug {
  if (spot.zone_slug && ZONE_SLUGS.includes(spot.zone_slug as ZoneSlug)) {
    return spot.zone_slug as ZoneSlug;
  }
  if (spot.panoramic && spot.electric) return "premium-vista-mar";
  if (spot.panoramic && !spot.electric) return "premium-sem-eletricidade";
  if (!spot.electric) return "sem-eletricidade";
  return "com-eletricidade";
}

const MARKER_BASE =
  "absolute -translate-x-1/2 -translate-y-1/2 rounded px-0.5 py-px text-[6px] sm:text-[7px] font-bold leading-none shadow-sm border transition-transform hover:scale-110 hover:z-20";

const MARKER_STYLES: Record<SpotVisualType, string> = {
  electric: "bg-white/90 text-primary border-white/80 ring-1 ring-red-400/80",
  "no-electric": "bg-slate-500/90 text-white border-slate-300",
  "panoramic-electric": "bg-emerald-500/90 text-white border-emerald-300 ring-1 ring-red-400/80",
  "panoramic-no-electric": "bg-emerald-700/90 text-white border-emerald-200",
};

export const LEGEND_SWATCH_STYLES: Record<SpotVisualType, string> = {
  electric: "h-3 w-5 rounded border bg-white ring-1 ring-red-400/80",
  "no-electric": "h-3 w-5 rounded bg-slate-500 border border-slate-300",
  "panoramic-electric": "h-3 w-5 rounded bg-emerald-500 border border-emerald-300 ring-1 ring-red-400/80",
  "panoramic-no-electric": "h-3 w-5 rounded bg-emerald-700 border border-emerald-200",
};

export function getSpotMarkerClass(spot: Pick<PitchMapSpot, "panoramic" | "electric">, selected = false) {
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
  options: { panoramic?: boolean; electric?: boolean } = {}
): PitchMapSpot[] {
  const xs = spread(numbers.length, startX, endX);
  return numbers.map((number, index) => ({
    code: `${prefix}${number}`,
    x: xs[index],
    y,
    panoramic: options.panoramic ?? false,
    electric: options.electric ?? true,
  }));
}

/** Fallback layout when database is empty or unavailable. */
export const DEFAULT_PITCH_MAP: PitchMapSpot[] = [
  ...rowSpots("A", [1, 2, 3, 4, 5, 6, 7, 8, 9], 10.5, 7, 40),
  ...rowSpots("B", [1, 2, 3, 4, 5], 10.5, 42.5, 56.5),
  ...rowSpots("C", [1, 2, 3], 8.5, 68, 80),
  ...rowSpots("A", [10, 11, 12, 13, 14, 15, 16], 23.5, 5, 34, { panoramic: true }),
  ...rowSpots("B", [6, 7, 8, 9], 23.5, 36.5, 49, { panoramic: true }),
  ...rowSpots("C", [4, 5, 6], 23.5, 66, 78),
  ...rowSpots("E", [1, 2, 3, 4, 5, 6, 7], 31, 5, 32),
  ...rowSpots("D", [1, 2, 3], 31, 35, 44),
  { code: "D7", x: 50.5, y: 31, panoramic: false, electric: true },
  ...rowSpots("C", [7, 8, 9], 31, 66, 78),
  ...rowSpots("E", [8, 9, 10, 11, 12, 13], 41.5, 5, 30),
  ...rowSpots("D", [4, 5, 6], 41.5, 34.5, 46.5, { panoramic: true }),
  ...rowSpots("F", [3, 2, 1], 49.5, 36, 46),
  ...rowSpots("F", [8, 7, 6, 5, 4], 62.5, 8, 33),
];

export const PARK_AERIAL_IMAGE = "/images/park-aerial.jpg";

/** Matches public/images/park-aerial.jpg (1024×541) so markers align without edge cropping. */
export const PARK_AERIAL_ASPECT_CLASS = "aspect-[1024/541]";
export const PARK_AERIAL_MAP_MAX_WIDTH_CLASS = "max-w-[1400px]";
