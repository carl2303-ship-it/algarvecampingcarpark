import PricesPageContent from "@/components/pages/prices-page";

export const revalidate = 60;

export default function Page() {
  return <PricesPageContent locale="pt" />;
}
