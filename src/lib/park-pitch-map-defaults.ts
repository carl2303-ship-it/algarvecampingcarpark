export type PitchMapSpot = {
  code: string;
  x: number;
  y: number;
  panoramic: boolean;
  electric: boolean;
};

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
