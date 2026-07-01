import { GOOGLE_PLACE_ID, GOOGLE_REVIEWS_URL } from "@/lib/constants";

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  photoUrl?: string;
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

export async function getGoogleReviews(): Promise<GoogleReviewsData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID ?? GOOGLE_PLACE_ID;

  if (!apiKey) {
    return FALLBACK;
  }

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn("Google Places API error:", res.status);
      return FALLBACK;
    }

    const data = (await res.json()) as {
      rating?: number;
      userRatingCount?: number;
      reviews?: Array<{
        rating?: number;
        relativePublishTimeDescription?: string;
        text?: { text?: string };
        authorAttribution?: { displayName?: string; photoUri?: string };
      }>;
    };

    const reviews: GoogleReview[] = (data.reviews ?? [])
      .filter((r) => r.text?.text)
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? "Google User",
        rating: r.rating ?? 5,
        text: r.text!.text!,
        relativeTime: r.relativePublishTimeDescription ?? "",
        photoUrl: r.authorAttribution?.photoUri,
      }));

    if (reviews.length === 0) return FALLBACK;

    return {
      rating: data.rating ?? 0,
      totalReviews: data.userRatingCount ?? 0,
      reviews,
      source: "google",
      mapsUrl: GOOGLE_REVIEWS_URL,
    };
  } catch (error) {
    console.warn("Google reviews fetch failed:", error);
    return FALLBACK;
  }
}
