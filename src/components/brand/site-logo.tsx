import Image from "next/image";
import { SITE_SHORT_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "h-10 w-10",
  sm: "h-[50px] w-[50px]",
  md: "h-[60px] w-[60px]",
  lg: "h-[70px] w-[70px]",
  xl: "h-[100px] w-[100px]",
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
    <Image
      src="/logo.png"
      alt={SITE_SHORT_NAME}
      width={512}
      height={512}
      priority={priority}
      className={cn("object-contain", sizes[size], className)}
    />
  );
}
