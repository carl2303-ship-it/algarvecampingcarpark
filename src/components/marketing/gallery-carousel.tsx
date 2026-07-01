"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GalleryImage } from "@/lib/gallery";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function GalleryCarousel({
  images,
  locale,
}: {
  images: GalleryImage[];
  locale: Locale;
}) {
  const [index, setIndex] = useState(0);
  const total = images.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex((next + total) % total);
    },
    [total]
  );

  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prev, next]);

  if (total === 0) return null;

  const current = images[index];
  const alt = locale === "en" ? current.alt_en : current.alt_pt;

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-2xl border bg-muted shadow-lg aspect-[5/3]">
        {images.map((image, i) => {
          const imageAlt = locale === "en" ? image.alt_en : image.alt_pt;
          return (
            <div
              key={image.id ?? image.src}
              className={cn(
                "absolute inset-0 transition-opacity duration-500 ease-in-out",
                i === index ? "opacity-100 z-10" : "opacity-0 z-0"
              )}
              aria-hidden={i !== index}
            >
              <Image
                src={image.src}
                alt={imageAlt}
                fill
                priority={i === 0}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          );
        })}

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-4 pt-16 pb-4 md:px-6 md:pb-5">
          <p className="text-white text-sm md:text-base text-center font-medium">{alt}</p>
          <p className="text-white/60 text-xs text-center mt-1">
            {index + 1} / {total}
          </p>
        </div>

        {total > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={prev}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white h-10 w-10"
              aria-label={locale === "en" ? "Previous image" : "Imagem anterior"}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={next}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white h-10 w-10"
              aria-label={locale === "en" ? "Next image" : "Imagem seguinte"}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {images.map((image, i) => (
            <button
              key={image.id ?? image.src}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative w-24 overflow-hidden rounded-lg border-2 transition-all shrink-0 aspect-[5/3]",
                i === index
                  ? "border-primary ring-2 ring-primary/30 scale-105"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
              aria-label={locale === "en" ? image.alt_en : image.alt_pt}
              aria-current={i === index}
            >
              <Image
                src={image.src}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
