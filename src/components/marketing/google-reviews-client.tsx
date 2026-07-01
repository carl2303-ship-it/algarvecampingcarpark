"use client";

import { useEffect, useState } from "react";
import { GOOGLE_PLACE_ID } from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import {
  fetchGoogleReviews,
  type GoogleReviewsData,
} from "@/lib/google-reviews";
import { GoogleReviewsSection } from "@/components/marketing/google-reviews";

export function GoogleReviewsClient({ locale }: { locale: Locale }) {
  const [data, setData] = useState<GoogleReviewsData | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) return;

    let cancelled = false;

    fetchGoogleReviews(locale, apiKey, GOOGLE_PLACE_ID).then((result) => {
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY) {
    return null;
  }

  if (!data) {
    return (
      <section className="py-20 md:py-28 bg-muted/30 section-pattern">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="h-8 w-48 rounded bg-muted animate-pulse mb-4" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return <GoogleReviewsSection data={data} locale={locale} />;
}
