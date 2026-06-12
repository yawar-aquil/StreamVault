import { useQuery } from "@tanstack/react-query";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContentRow } from "@/components/content-row";
import { Top10Row } from "@/components/top10-row";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdContainer } from "@/components/ad-manager";
import type { Show } from "@shared/schema";
import { useMemo } from "react";

export default function SeriesPage() {
    const { data: shows, isLoading } = useQuery<Show[]>({
        queryKey: ["/api/shows"],
    });

    // Sort by rating for "Top Rated"
    const topRated = useMemo(() => {
        if (!shows) return [];
        return [...shows].sort((a, b) => (Number(b.imdbRating) || 0) - (Number(a.imdbRating) || 0));
    }, [shows]);

    const featured = useMemo(() => shows?.filter((s) => s.featured) || [], [shows]);
    const trending = useMemo(() => shows?.filter((s) => s.trending) || [], [shows]);
    const action = useMemo(() => shows?.filter((s) => s.genres?.toLowerCase().includes("action")).slice(0, 15) || [], [shows]);
    const drama = useMemo(() => shows?.filter((s) => s.genres?.toLowerCase().includes("drama")).slice(0, 15) || [], [shows]);
    const comedy = useMemo(() => shows?.filter((s) => s.genres?.toLowerCase().includes("comedy")).slice(0, 15) || [], [shows]);
    const scifi = useMemo(() => shows?.filter((s) => s.genres?.toLowerCase().includes("sci-fi") || s.genres?.toLowerCase().includes("science fiction")).slice(0, 15) || [], [shows]);
    const horror = useMemo(() => shows?.filter((s) => s.genres?.toLowerCase().includes("horror")).slice(0, 15) || [], [shows]);

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
                title="Watch TV Shows Free Online | HD Series Streaming"
                description="Stream popular TV shows free in HD. Action, Drama, Comedy, Sci-Fi and more. No registration required."
                canonical="https://streamvault.live/series"
            />

            {/* Hero Carousel */}
            {featured.length > 0 && <HeroCarousel shows={featured} />}

            {/* Content Rows */}
            <div className="container mx-auto py-8 space-y-12">
                {/* Top 10 Series (using top rated) */}
                {topRated.length > 0 && (
                    <Top10Row
                        title="Top 10 Series"
                        items={topRated}
                    />
                )}

                {trending.length > 0 && (
                    <ContentRow
                        title="Trending Now"
                        shows={trending}
                        orientation="landscape"
                    />
                )}

                <AdContainer type="native" />

                {action.length > 0 && (
                    <ContentRow title="Action & Adventure" shows={action} />
                )}

                {drama.length > 0 && <ContentRow title="Drama" shows={drama} />}

                <AdContainer type="banner" />

                {comedy.length > 0 && <ContentRow title="Comedy" shows={comedy} />}

                {scifi.length > 0 && <ContentRow title="Sci-Fi & Fantasy" shows={scifi} />}

                {horror.length > 0 && (
                    <ContentRow title="Horror & Mystery" shows={horror} />
                )}

                {shows && shows.length > 0 && (
                    <ContentRow
                        title="Recently Added"
                        shows={shows.slice(0, 12)}
                        orientation="landscape"
                    />
                )}
            </div>
        </div>
    );
}
