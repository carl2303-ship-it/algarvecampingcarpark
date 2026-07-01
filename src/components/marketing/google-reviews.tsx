import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { GoogleReviewsData } from "@/lib/google-reviews";
import type { Locale } from "@/lib/constants";
import { getTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export function GoogleReviewsSection({
  data,
  locale,
  loading = false,
}: {
  data: GoogleReviewsData;
  locale: Locale;
  loading?: boolean;
}) {
  const t = getTranslations(locale).about;

  return (
    <section className="py-20 md:py-28 bg-muted/30 section-pattern">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
              Google
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold">
              {t.reviews_title}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl">{t.reviews_subtitle}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="font-heading text-3xl font-bold">{data.rating.toFixed(1)}</span>
              <div>
                <StarRating rating={data.rating} />
                {data.totalReviews > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.totalReviews} {t.reviews_count}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={data.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t.reviews_cta}
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {data.source === "fallback" && !loading && (
          <p className="text-xs text-muted-foreground mb-6 rounded-lg border bg-background px-4 py-3">
            {t.reviews_api_note}
          </p>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.reviews.slice(0, 6).map((review, index) => (
            <article
              key={`${review.author}-${index}`}
              className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                {review.photoUrl ? (
                  <Image
                    src={review.photoUrl}
                    alt={review.author}
                    width={40}
                    height={40}
                    className="rounded-full h-10 w-10 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {review.author.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm leading-tight">{review.author}</p>
                  {review.relativeTime && (
                    <p className="text-xs text-muted-foreground">{review.relativeTime}</p>
                  )}
                </div>
              </div>
              <StarRating rating={review.rating} />
              <p
                className={cn(
                  "text-sm leading-relaxed mt-3 flex-1 line-clamp-6",
                  review.text ? "text-muted-foreground" : "text-muted-foreground/70 italic"
                )}
              >
                {review.text || t.reviews_no_text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
