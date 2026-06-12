import { useQuery } from "@tanstack/react-query";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContentRow } from "@/components/content-row";
import { Top10Row } from "@/components/top10-row";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { AdContainer } from "@/components/ad-manager";
import type { Anime } from "@shared/schema";
import { useMemo } from "react";

export default function AnimePage() {
    const { data: anime, isLoading } = useQuery<Anime[]>({
        queryKey: ["/api/anime"],
    });

    // Sort by rating for "Top 10" (Prioritize MAL rating, fallback to IMDb)
    const topRated = useMemo(() => {
        if (!anime) return [];
        return [...anime].sort((a, b) => {
            const ratingA = Number(a.malRating) || Number(a.imdbRating) || 0;
            const ratingB = Number(b.malRating) || Number(b.imdbRating) || 0;
            return ratingB - ratingA;
        });
    }, [anime]);

    const featured = useMemo(() => anime?.filter((a) => a.featured) || [], [anime]);
    const trending = useMemo(() => anime?.filter((a) => a.trending) || [], [anime]);
    const action = useMemo(() => anime?.filter((a) => a.genres?.toLowerCase().includes("action")).slice(0, 15) || [], [anime]);
    const romance = useMemo(() => anime?.filter((a) => a.genres?.toLowerCase().includes("romance")).slice(0, 15) || [], [anime]);
    const shonen = useMemo(() => anime?.filter((a) => a.genres?.toLowerCase().includes("shonen") || a.genres?.toLowerCase().includes("shounen")).slice(0, 15) || [], [anime]);
    const fantasy = useMemo(() => anime?.filter((a) => a.genres?.toLowerCase().includes("fantasy")).slice(0, 15) || [], [anime]);
    const comedy = useMemo(() => anime?.filter((a) => a.genres?.toLowerCase().includes("comedy")).slice(0, 15) || [], [anime]);
    const horror = useMemo(() => anime?.filter((a) => a.genres?.toLowerCase().includes("horror")).slice(0, 15) || [], [anime]);

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
                title="Watch Anime Free Online | Subbed & Dubbed Anime Streaming"
                description="Stream 100+ anime series free in HD. Watch popular anime subbed and dubbed. Shonen, Romance, Action, Fantasy and more. No registration required."
                canonical="https://streamvault.live/anime"
            />

            {/* Hero Carousel */}
            {featured.length > 0 && <HeroCarousel shows={featured} />}

            {/* Content Rows */}
            <div className="container mx-auto py-8 space-y-12">
                {/* Top 10 Anime */}
                {topRated.length > 0 && (
                    <Top10Row
                        title="Top 10 Anime"
                        items={topRated}
                    />
                )}

                {trending.length > 0 && (
                    <ContentRow
                        title="Trending Anime"
                        shows={trending}
                        orientation="landscape"
                    />
                )}

                <AdContainer type="native" />

                {action.length > 0 && (
                    <ContentRow title="Action & Adventure" shows={action} />
                )}

                {shonen.length > 0 && (
                    <ContentRow title="Shonen" shows={shonen} />
                )}

                {romance.length > 0 && <ContentRow title="Romance" shows={romance} />}

                <AdContainer type="banner" />

                {fantasy.length > 0 && <ContentRow title="Fantasy" shows={fantasy} />}

                {comedy.length > 0 && <ContentRow title="Comedy" shows={comedy} />}

                {horror.length > 0 && (
                    <ContentRow title="Horror & Dark" shows={horror} />
                )}

                {anime && anime.length > 0 && (
                    <ContentRow
                        title="Recently Added"
                        shows={anime.slice(0, 12)}
                        orientation="landscape"
                    />
                )}
            </div>
        </div>
    );
}
