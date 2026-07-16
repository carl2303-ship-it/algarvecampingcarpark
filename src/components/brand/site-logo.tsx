import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "h-8 w-auto max-w-[120px]",
  sm: "h-9 w-auto max-w-[140px]",
  md: "h-12 w-auto max-w-[180px]",
  lg: "h-14 w-auto max-w-[220px]",
  xl: "h-20 w-auto max-w-[300px]",
} as const;

export function SiteLogo({
  size = "md",
  className,
  priority = false,
}: {
  size?: keyof typeof sizes;
  className?: string;
  priority?: boolean;
}) {
  return (
    // PNG com fundo transparente — servido diretamente, sem otimização Next.js
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt={SITE_NAME}
      width={500}
      height={500}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("bg-transparent object-contain", sizes[size], className)}
    />
  );
}
