import { useQuery } from "@tanstack/react-query";
import { MovieHeroCarousel } from "@/components/movie-hero-carousel";
import { MovieContentRow } from "@/components/movie-content-row";
import { Top10Row } from "@/components/top10-row";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdContainer } from "@/components/ad-manager";
import type { Movie } from "@shared/schema";
import { useMemo } from "react";

export default function MoviesPage() {
  const { data: movies, isLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  // Sort by rating for "Top 10"
  const topRated = useMemo(() => {
    if (!movies) return [];
    return [...movies].sort((a, b) => (Number(b.imdbRating) || 0) - (Number(a.imdbRating) || 0));
  }, [movies]);

  const featured = useMemo(() => movies?.filter((movie) => movie.featured) || [], [movies]);
  const trending = useMemo(() => movies?.filter((movie) => movie.trending) || [], [movies]);
  const action = useMemo(() => movies?.filter((movie) => movie.genres?.toLowerCase().includes("action")).slice(0, 15) || [], [movies]);
  const drama = useMemo(() => movies?.filter((movie) => movie.genres?.toLowerCase().includes("drama")).slice(0, 15) || [], [movies]);
  const comedy = useMemo(() => movies?.filter((movie) => movie.genres?.toLowerCase().includes("comedy")).slice(0, 15) || [], [movies]);
  const horror = useMemo(() => movies?.filter((movie) => movie.genres?.toLowerCase().includes("horror")).slice(0, 15) || [], [movies]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[70vh]" />
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="w-48 aspect-[2/3] flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title="Watch Movies Free Online | HD Movies Streaming"
        description="Stream 200+ movies free in HD. Action, Drama, Comedy, Horror and more. No registration required."
        canonical="https://streamvault.live/movies"
      />

      {/* Hero Carousel */}
      {featured.length > 0 && <MovieHeroCarousel movies={featured} />}

      {/* Content Rows */}
      <div className="container mx-auto py-8 space-y-12">
        {/* Top 10 Movies */}
        {topRated.length > 0 && (
          <Top10Row
            title="Top 10 Movies"
            items={topRated}
          />
        )}

        {trending.length > 0 && (
          <MovieContentRow
            title="Trending Now"
            movies={trending}
            orientation="landscape"
          />
        )}

        <AdContainer type="native" />

        {action.length > 0 && (
          <MovieContentRow title="Action & Thriller" movies={action} />
        )}

        {drama.length > 0 && <MovieContentRow title="Drama & Romance" movies={drama} />}

        <AdContainer type="banner" />

        {comedy.length > 0 && <MovieContentRow title="Comedy" movies={comedy} />}

        {horror.length > 0 && (
          <MovieContentRow title="Horror & Mystery" movies={horror} />
        )}

        {movies && movies.length > 0 && (
          <MovieContentRow
            title="Recently Added"
            movies={movies.slice(0, 12)}
            orientation="landscape"
          />
        )}
      </div>
    </div>
  );
}
