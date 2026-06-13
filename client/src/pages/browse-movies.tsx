import { useInfiniteQuery } from "@tanstack/react-query";
import { MovieCard } from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import type { Movie } from "@shared/schema";

interface PaginatedResponse {
  items: Movie[];
  totalCount: number;
  totalPages: number;
  page: number;
}

export default function BrowseMovies() {
  const { ref, inView } = useInView();

  const { 
    data, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<PaginatedResponse>({
    queryKey: ["/api/movies", { paginate: true, limit: 60 }],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/movies?paginate=true&page=${pageParam}&limit=60`);
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

  const movies = data?.pages.flatMap(page => page.items) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  return (
    <div className="min-h-screen">
      <SEO 
        title="Browse All Movies"
        description="Browse our complete collection of movies. Watch Hollywood blockbusters, indie films, and international cinema free in HD."
        canonical="https://streamvault.live/browse/movies"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">All Movies</h1>
            <p className="text-muted-foreground">
              Browse all {totalCount} movies in our collection
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {[...Array(20)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        ) : movies && movies.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No movies available</p>
          </div>
        )}

        {/* Bottom Pagination / Loading Indicator */}
        <div ref={ref} className="mt-8 flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading more movies...
            </div>
          ) : hasNextPage ? (
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Load More
            </Button>
          ) : movies.length > 0 ? (
            <p className="text-muted-foreground">You've reached the end of the list</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
