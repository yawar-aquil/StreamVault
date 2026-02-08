import { useQuery } from "@tanstack/react-query";
import { ShowCard } from "@/components/show-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import type { Anime } from "@shared/schema";

export default function BrowseAnime() {
    const { data: anime, isLoading } = useQuery<Anime[]>({
        queryKey: ["/api/anime"],
    });

    return (
        <div className="min-h-screen">
            <SEO
                title="Browse All Anime | Watch Free Anime Online"
                description="Browse our complete anime collection. Watch subbed and dubbed anime series free in HD. Shonen, Romance, Action, Fantasy and more."
                canonical="https://streamvault.live/browse-anime"
            />
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">All Anime</h1>
                    <p className="text-muted-foreground">
                        Browse all {anime?.length || 0} anime series in our collection
                    </p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                        {[...Array(20)].map((_, i) => (
                            <Skeleton key={i} className="aspect-[2/3]" />
                        ))}
                    </div>
                ) : anime && anime.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                        {anime.map((item) => (
                            <ShowCard key={item.id} show={item} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No anime available</p>
                    </div>
                )}
            </div>
        </div>
    );
}
