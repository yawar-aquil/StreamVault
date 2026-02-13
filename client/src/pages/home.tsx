import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContentRow } from "@/components/content-row";
import { Top10Row } from "@/components/top10-row";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import type { Show, Movie, Anime, ViewingProgress } from "@shared/schema";
import { useMemo } from "react";
import { Link } from "wouter";
import { GuestSignupModal } from "@/components/guest-signup-modal";
import { AdContainer } from "@/components/ad-manager";

export default function Home() {
  const { t } = useTranslation();
  const { data: shows, isLoading: showsLoading } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies, isLoading: moviesLoading } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const { data: animeList } = useQuery<Anime[]>({
    queryKey: ["/api/anime"],
  });

  const { data: recommendations = [] } = useQuery<any[]>({
    queryKey: ["/api/recommendations"],
  });

  // Fetch trending content from API (synced with TMDB)
  const { data: trending = [] } = useQuery<(Show | Movie | Anime)[]>({
    queryKey: ["/api/trending"],
  });

  const isLoading = showsLoading || moviesLoading;

  const { data: progressData = [] } = useQuery<any[]>({
    queryKey: ["/api/progress"],
  });

  // Combine all continue watching items (shows, movies, anime)
  const { continueWatching, progressMap, progressDataMap, totalInProgress } = useMemo(() => {
    if (!shows || !progressData.length) {
      return { continueWatching: [], progressMap: new Map<string, number>(), progressDataMap: new Map<string, { season?: number; episodeNumber?: number }>(), totalInProgress: 0 };
    }

    // Shows progress
    const showProgress = progressData
      .filter((p) => p.showId)
      .map((progress) => {
        const show = shows.find((s) => s.id === progress.showId);
        if (!show) return null;
        const percentage = progress.duration > 0
          ? Math.min(100, (progress.progress / progress.duration) * 100)
          : 0;
        return { item: show, itemId: show.id, percentage, lastWatched: progress.lastWatched, type: 'show' };
      })
      .filter((item) => item !== null && item.percentage < 95);

    // Movies progress
    const movieProgress = progressData
      .filter((p) => p.movieId)
      .map((progress) => {
        const movie = movies?.find((m) => m.id === progress.movieId);
        if (!movie) return null;
        const percentage = progress.duration > 0
          ? Math.min(100, (progress.progress / progress.duration) * 100)
          : 0;
        return { item: movie, itemId: movie.id, percentage, lastWatched: progress.lastWatched, type: 'movie' };
      })
      .filter((item) => item !== null && item.percentage < 95);

    // Anime progress  
    const animeProgress = progressData
      .filter((p) => p.animeId)
      .map((progress) => {
        const anime = animeList?.find((a) => a.id === progress.animeId);
        if (!anime) return null;
        const percentage = progress.duration > 0
          ? Math.min(100, (progress.progress / progress.duration) * 100)
          : 0;
        return { item: anime, itemId: anime.id, percentage, lastWatched: progress.lastWatched, type: 'anime' };
      })
      .filter((item) => item !== null && item.percentage < 95);

    // Combine and sort by last watched
    const allProgress = [...(showProgress as any[]), ...(movieProgress as any[]), ...(animeProgress as any[])]
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());

    // For the ContentRow, pass mixed content (Show, Movie, Anime)
    const continueWatchingShows = allProgress
      .slice(0, 10)
      .map(p => p.item as Show | Movie | Anime);

    // Create progressDataMap with season/episode info for Resume navigation
    const progressDataMap = new Map<string, { season?: number; episodeNumber?: number }>();
    progressData.forEach((p: any) => {
      const id = p.showId || p.movieId || p.animeId;
      if (id && (p.season || p.episodeNumber)) {
        progressDataMap.set(id, { season: p.season, episodeNumber: p.episodeNumber });
      }
    });

    return {
      continueWatching: continueWatchingShows,
      progressMap: new Map(allProgress.map((item) => [item.itemId, item.percentage])),
      progressDataMap,
      totalInProgress: allProgress.length,
    };
  }, [shows, movies, animeList, progressData]);

  // Combine shows and movies and sort by createdAt (Newest first)
  const allContent: (Show | Movie | Anime)[] = useMemo(() => {
    return [...(shows || []), ...(movies || []), ...(animeList || [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [shows, movies, animeList]);

  const featured = useMemo(() => allContent.filter((item) => item.featured) || [], [allContent]);
  const action = useMemo(() => allContent.filter((item) => item.genres?.toLowerCase().includes("action")) || [], [allContent]);
  const drama = useMemo(() => allContent.filter((item) => item.genres?.toLowerCase().includes("drama")) || [], [allContent]);
  const comedy = useMemo(() => allContent.filter((item) => item.genres?.toLowerCase().includes("comedy")) || [], [allContent]);
  const horror = useMemo(() => allContent.filter((item) => item.genres?.toLowerCase().includes("horror")) || [], [allContent]);

  // Ensure we have 10 items for the Top 10 row
  const top10Items = useMemo(() => {
    const items = [...trending];
    const existingIds = new Set(items.map(i => i.id));

    // Fill with high rated content if we don't have 10
    if (items.length < 10) {
      const topRated = allContent
        .filter(i => !existingIds.has(i.id))
        .sort((a, b) => (Number(b.imdbRating) || 0) - (Number(a.imdbRating) || 0));

      items.push(...topRated.slice(0, 10 - items.length));
    }

    return items;
  }, [trending, allContent]);

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
        title="Free Movies Online | Watch TV Shows Free | HD Streaming"
        description="Watch 200+ movies & TV shows free in HD. No registration required. Stream Hollywood, Bollywood & international content instantly on any device."
        canonical="https://streamvault.live"
      />

      {/* Hero Carousel */}
      {featured.length > 0 && <HeroCarousel shows={featured} />}

      {/* Content Rows */}
      <div className="container mx-auto py-8 space-y-12">
        <AdContainer type="native" />

        {top10Items.length > 0 && (
          <Top10Row
            title="Top 10 Today"
            items={top10Items}
          />
        )}

        <AdContainer type="banner" />

        {/* Recommendations Row */}
        {recommendations.length > 0 && (
          <ContentRow
            title={t('home.recommended')}
            shows={recommendations}
            orientation="portrait"
          />
        )}

        {continueWatching.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t('home.continueWatching')}</h2>
              {totalInProgress > continueWatching.length && (
                <Link href="/continue-watching">
                  <a className="text-sm text-primary hover:underline">
                    View All ({totalInProgress})
                  </a>
                </Link>
              )}
            </div>
            <ContentRow
              title=""
              shows={continueWatching}
              orientation="landscape"
              showProgress={progressMap}
              progressDataMap={progressDataMap}
            />
          </div>
        )}

        {action.length > 0 && (
          <ContentRow title="Action & Thriller" shows={action} />
        )}

        {drama.length > 0 && <ContentRow title="Drama & Romance" shows={drama} />}

        {comedy.length > 0 && <ContentRow title="Comedy" shows={comedy} />}

        {horror.length > 0 && (
          <ContentRow title="Horror & Mystery" shows={horror} />
        )}

        {allContent.length > 0 && (
          <ContentRow
            title={t('home.newReleases')}
            shows={allContent.slice(0, 12)}
            orientation="landscape"
          />
        )}
      </div>

      {/* Guest Signup Modal */}
      <GuestSignupModal />
    </div>
  );
}
