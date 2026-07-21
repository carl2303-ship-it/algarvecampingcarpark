import Image from "next/image";
import { SITE_NAME, type Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";

const partnerLogos = [
  {
    id: "clean-safe",
    src: "/logos/clean-and-safe.png",
    width: 500,
    height: 500,
    className: "h-[70px] w-[70px] sm:h-20 sm:w-20",
  },
  {
    id: "algarve-rede",
    src: "/logos/algarve-autocaravanismo-rede.png",
    width: 400,
    height: 500,
    className: "h-20 w-auto sm:h-[90px]",
  },
] as const;

export function FooterBrandRow({ locale }: { locale: Locale }) {
  const t = getTranslations(locale);

  return (
    <div className="flex flex-wrap items-center gap-5 sm:gap-6">
      <Image
        src="/logos/footer-logo.png"
        alt={SITE_NAME}
        width={640}
        height={640}
        className="h-[88px] w-auto max-w-[320px] shrink-0 object-contain"
      />
      <div className="flex items-center gap-4 sm:gap-5">
        {partnerLogos.map((logo) => (
          <Image
            key={logo.id}
            src={logo.src}
            alt={t.footer.partner_logos[logo.id]}
            width={logo.width}
            height={logo.height}
            className={`object-contain shrink-0 ${logo.className}`}
          />
        ))}
      </div>
    </div>
  );
}
