import { useInfiniteQuery } from "@tanstack/react-query";
import { ShowCard } from "@/components/show-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import type { Show } from "@shared/schema";

interface PaginatedResponse {
  items: Show[];
  totalCount: number;
  totalPages: number;
  page: number;
}

export default function BrowseShows() {
  const { ref, inView } = useInView();

  const { 
    data, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<PaginatedResponse>({
    queryKey: ["/api/shows", { paginate: true, limit: 60 }],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/shows?paginate=true&page=${pageParam}&limit=60`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const shows = data?.pages.flatMap(page => page.items) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  return (
    <div className="min-h-screen">
      <SEO 
        title="Browse All TV Shows"
        description="Browse our complete collection of TV shows. Watch popular series, new releases, and classic shows free in HD."
        canonical="https://streamvault.live/browse/shows"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">All TV Shows</h1>
            <p className="text-muted-foreground">
              Browse all {totalCount} TV shows in our collection
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        ) : shows && shows.length > 0 ? (
          <>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
              {shows.slice(0, 12).map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
              {shows.slice(12).map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No shows available</p>
          </div>
        )}

        {/* Bottom Pagination / Loading Indicator */}
        <div ref={ref} className="mt-8 flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading more shows...
            </div>
          ) : hasNextPage ? (
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Load More
            </Button>
          ) : shows.length > 0 ? (
            <p className="text-muted-foreground">You've reached the end of the list</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
