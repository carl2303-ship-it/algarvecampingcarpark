import { getPricingCatalog } from "@/lib/pricing-catalog";
import PricesPageContent from "@/components/pages/prices-page";

export const revalidate = 60;

export default async function Page() {
  const catalog = await getPricingCatalog();
  return <PricesPageContent locale="en" catalog={catalog} />;
}
