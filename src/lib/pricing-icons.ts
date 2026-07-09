import { Waves, TreePine, Zap, Droplets, Wifi, Trash2, Sparkles, type LucideIcon } from "lucide-react";

export const ZONE_ICONS: Record<string, { icon: LucideIcon; emoji: string; color: string }> = {
  "com-eletricidade": { icon: Zap, emoji: "⚡", color: "text-amber-600 bg-amber-50 ring-amber-200" },
  "sem-eletricidade": { icon: TreePine, emoji: "🏕️", color: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
  "premium-vista-mar": { icon: Waves, emoji: "🌅", color: "text-sky-700 bg-sky-50 ring-sky-200" },
  "premium-sem-eletricidade": {
    icon: Waves,
    emoji: "🌊",
    color: "text-teal-700 bg-teal-50 ring-teal-200",
  },
};

export const SERVICE_ICONS: Record<string, { icon: LucideIcon; emoji: string }> = {
  zap: { icon: Zap, emoji: "⚡" },
  droplets: { icon: Droplets, emoji: "🚰" },
  "trash-2": { icon: Trash2, emoji: "🚿" },
  wifi: { icon: Wifi, emoji: "📡" },
  sparkles: { icon: Sparkles, emoji: "✨" },
};

export const ICON_OPTIONS = Object.keys(SERVICE_ICONS);

export const SEASON_META = {
  summer: { emoji: "☀️", gradient: "from-amber-400 via-orange-400 to-rose-400" },
  winter: { emoji: "🌊", gradient: "from-sky-500 via-blue-500 to-indigo-600" },
  services: { emoji: "✨", gradient: "from-teal-400 via-emerald-500 to-green-600" },
} as const;

export function getZoneVisual(slug: string) {
  return ZONE_ICONS[slug] ?? { icon: Sparkles, emoji: "🏕️", color: "text-primary bg-primary/10" };
}

export function getServiceVisual(iconKey: string) {
  return SERVICE_ICONS[iconKey] ?? SERVICE_ICONS.sparkles;
}
