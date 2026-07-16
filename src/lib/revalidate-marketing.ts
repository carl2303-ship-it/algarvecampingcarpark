import { revalidatePath } from "next/cache";
import { LOCALES, type Locale } from "@/lib/constants";
import { localePath } from "@/lib/locale-path";

const MARKETING_PATHS = [
  "/",
  "/about",
  "/prices",
  "/location",
  "/contact",
  "/book",
  "/terms",
  "/privacy",
] as const;

/** Revalidate a path for every public locale (PT unprefixed, others /{locale}/…). */
export function revalidateMarketingPaths(
  paths: readonly string[] = MARKETING_PATHS
) {
  for (const path of paths) {
    for (const locale of LOCALES) {
      revalidatePath(localePath(locale as Locale, path));
    }
  }
}
