import { NextResponse } from "next/server";
import { fetchGoogleReviews, getFallbackGoogleReviews } from "@/lib/google-reviews";
import type { Locale } from "@/lib/constants";
import { LOCALES } from "@/lib/constants";

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale") ?? "pt";
  const locale = (LOCALES.includes(localeParam as Locale) ? localeParam : "pt") as Locale;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(getFallbackGoogleReviews());
  }

  const data = await fetchGoogleReviews(locale, apiKey);

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
