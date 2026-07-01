import { NextResponse } from "next/server";
import {
  fetchGoogleReviews,
  getFallbackGoogleReviews,
  getGooglePlacesApiKey,
} from "@/lib/google-reviews";
import type { Locale } from "@/lib/constants";
import { LOCALES } from "@/lib/constants";

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale") ?? "pt";
  const locale = (LOCALES.includes(localeParam as Locale) ? localeParam : "pt") as Locale;

  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    console.error("[google-reviews] Missing GOOGLE_PLACES_API_KEY on server");
    return NextResponse.json(getFallbackGoogleReviews(), {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Google-Reviews": "missing-key",
      },
    });
  }

  const { data, googleStatus, googleError } = await fetchGoogleReviews(locale, apiKey);

  const debugHeader =
    data.source === "google"
      ? "ok"
      : googleStatus
        ? `${googleStatus}${googleError ? `: ${googleError}` : ""}`
        : "fallback";

  if (data.source !== "google") {
    console.error("[google-reviews] Google API failed:", debugHeader);
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control":
        data.source === "google"
          ? "public, s-maxage=3600, stale-while-revalidate=86400"
          : "public, s-maxage=300, stale-while-revalidate=600",
      "X-Google-Reviews": debugHeader,
    },
  });
}
