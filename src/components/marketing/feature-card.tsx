import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  title: string;
  description?: string;
  className?: string;
} & (
  | { icon: LucideIcon; iconSrc?: never; iconAlt?: never }
  | { icon?: never; iconSrc: string; iconAlt: string }
);

export function FeatureCard({
  icon: Icon,
  iconSrc,
  iconAlt,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card p-6 md:p-8 transition-all duration-300",
        "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/20",
        className
      )}
    >
      <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt={iconAlt}
            width={40}
            height={40}
            className="h-8 w-8 object-contain opacity-90 group-hover:brightness-0 group-hover:invert"
          />
        ) : (
          Icon && <Icon className="h-7 w-7" />
        )}
      </div>
      <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

export function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-4 py-2">
      <p className="font-heading text-3xl md:text-4xl font-semibold text-primary">{value}</p>
      <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}
