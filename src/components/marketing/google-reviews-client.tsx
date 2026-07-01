"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/constants";
import { getFallbackGoogleReviews, type GoogleReviewsData } from "@/lib/google-reviews";
import { GoogleReviewsSection } from "@/components/marketing/google-reviews";

export function GoogleReviewsClient({ locale }: { locale: Locale }) {
  const [data, setData] = useState<GoogleReviewsData>(getFallbackGoogleReviews);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/google-reviews?locale=${locale}`)
      .then((res) => res.json())
      .then((result: GoogleReviewsData) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(getFallbackGoogleReviews());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return <GoogleReviewsSection data={data} locale={locale} loading={loading} />;
}
