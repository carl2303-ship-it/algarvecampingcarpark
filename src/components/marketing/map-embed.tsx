import { MAPS_EMBED, MAPS_URL } from "@/lib/constants";
import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";

export function MapEmbed({
  title,
  openLabel,
  className,
}: {
  title: string;
  openLabel: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-2xl overflow-hidden border shadow-xl shadow-primary/10 ring-1 ring-black/5">
        <iframe
          title={title}
          src={MAPS_EMBED}
          width="100%"
          height="100%"
          className="absolute inset-0"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <Link
        href={MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline"
      >
        <MapPin className="h-4 w-4" />
        {openLabel}
        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
      </Link>
    </div>
  );
}
