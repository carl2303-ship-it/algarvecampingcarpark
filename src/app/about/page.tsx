import AboutPageContent from "@/components/pages/about-page";

export const revalidate = 60;

export default function Page() {
  return <AboutPageContent locale="pt" />;
}
