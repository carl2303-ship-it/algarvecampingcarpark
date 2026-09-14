import { revalidatePath } from "next/cache";

/** Invalidate public prices pages after admin supplement / tariff changes. */
export function revalidatePublicPricesPages() {
  for (const path of [
    "/precos",
    "/prices",
    "/fr/prices",
    "/en/prices",
    "/es/prices",
    "/de/prices",
    "/about",
    "/fr/about",
    "/en/about",
    "/es/about",
    "/de/about",
    "/book",
    "/fr/book",
    "/en/book",
    "/es/book",
    "/de/book",
  ]) {
    revalidatePath(path);
  }
}
