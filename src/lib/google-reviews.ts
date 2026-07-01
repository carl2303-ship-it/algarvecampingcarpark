import { GOOGLE_PLACE_ID, GOOGLE_REVIEWS_URL } from "@/lib/constants";
import type { Locale } from "@/lib/constants";

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  photoUrl?: string;
  time?: number;
}

export interface GoogleReviewsData {
  rating: number;
  totalReviews: number;
  reviews: GoogleReview[];
  source: "google" | "fallback";
  mapsUrl: string;
}

const FALLBACK: GoogleReviewsData = {
  rating: 4.6,
  totalReviews: 0,
  source: "fallback",
  mapsUrl: GOOGLE_REVIEWS_URL,
  reviews: [
    {
      author: "Visitante Google",
      rating: 5,
      relativeTime: "",
      text: "Lugar calmo e bem cuidado. Elodie e Romy são muito acolhedoras. Recomendo para quem visita o Algarve de autocaravana.",
    },
    {
      author: "Visitante Google",
      rating: 5,
      relativeTime: "",
      text: "Great spot with sea views. Easy access to shops and beaches. Very friendly hosts who speak several languages.",
    },
    {
      author: "Visitante Google",
      rating: 5,
      relativeTime: "",
      text: "Aire très calme sur les hauteurs d'Armação de Pêra. Accueil chaleureux et emplacement spacieux en pleine nature.",
    },
  ],
};

export function getFallbackGoogleReviews(): GoogleReviewsData {
  return FALLBACK;
}

interface LegacyPlacesResponse {
  status: string;
  error_message?: string;
  result?: {
    rating?: number;
    user_ratings_total?: number;
    reviews?: Array<{
      author_name?: string;
      rating?: number;
      relative_time_description?: string;
      text?: string;
      profile_photo_url?: string;
      time?: number;
    }>;
  };
}

function mapLegacyResponse(data: LegacyPlacesResponse): GoogleReviewsData | null {
  if (data.status !== "OK" || !data.result?.reviews?.length) {
    return null;
  }

  const reviews: GoogleReview[] = data.result.reviews
    .map((r) => ({
      author: r.author_name ?? "Google User",
      rating: r.rating ?? 5,
      text: r.text?.trim() ?? "",
      relativeTime: r.relative_time_description ?? "",
      photoUrl: r.profile_photo_url,
      time: r.time,
    }))
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0));

  if (reviews.length === 0) return null;

  return {
    rating: data.result.rating ?? 0,
    totalReviews: data.result.user_ratings_total ?? 0,
    reviews,
    source: "google",
    mapsUrl: GOOGLE_REVIEWS_URL,
  };
}

export async function fetchGoogleReviews(
  locale: Locale,
  apiKey: string,
  placeId: string = process.env.GOOGLE_PLACE_ID ?? GOOGLE_PLACE_ID
): Promise<GoogleReviewsData> {
  const language = locale === "en" ? "en" : "pt";
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "reviews,rating,user_ratings_total");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", language);
  url.searchParams.set("reviews_sort", "newest");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn("Google Places API HTTP error:", res.status);
      return FALLBACK;
    }

    const data = (await res.json()) as LegacyPlacesResponse;
    if (data.status !== "OK") {
      console.warn("Google Places API error:", data.status, data.error_message);
      return FALLBACK;
    }

    return mapLegacyResponse(data) ?? FALLBACK;
  } catch (error) {
    console.warn("Google reviews fetch failed:", error);
    return FALLBACK;
  }
}

export async function getGoogleReviews(locale: Locale = "pt"): Promise<GoogleReviewsData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return FALLBACK;
  }

  return fetchGoogleReviews(locale, apiKey);
}
