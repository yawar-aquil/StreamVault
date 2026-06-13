import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Search as SearchIcon, SlidersHorizontal, Loader2 } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShowCard } from "@/components/show-card";
import { MovieCard } from "@/components/movie-card";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_GENRES = [
  "Action", "Action & Adventure", "Adventure", "Animation", "Comedy", 
  "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", 
  "Horror", "Music", "Mystery", "Romance", "Sci-Fi & Fantasy", 
  "Science Fiction", "Soap", "TV Movie", "Thriller", "War", 
  "War & Politics", "Western"
];
import { SEO } from "@/components/seo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Show, Movie, Anime } from "@shared/schema";

export default function Search() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, 2030]);
  const [currentTab, setCurrentTab] = useState<string>("all");
  const { ref, inView } = useInView();

  // Reset page when search params change
  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
  };

  const { 
    data, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: [
      "/api/search/advanced",
      { q: searchQuery, type: currentTab, genres: selectedGenres.join(","), year: yearRange.join("-"), limit: 60 }
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        q: searchQuery,
        type: currentTab,
        genres: selectedGenres.join(","),
        year: `${yearRange[0]}-${yearRange[1]}`,
        page: pageParam.toString(),
        limit: "60"
      });
      const res = await fetch(`/api/search/advanced?${params}`);
      if (!res.ok) throw new Error("Failed to fetch search results");
      return res.json() as Promise<{
        items: (Movie | Show | Anime & { mediaType: 'movie' | 'show' | 'anime' })[];
        totalCount: number;
        totalPages: number;
        page: number;
      }>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredItems = data?.pages.flatMap(page => page.items) || [];
  const totalCount = data?.pages[0]?.totalCount;

  const toggleGenre = (genre: string) => {
    handleFilterChange(setSelectedGenres, (prev: string[]) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Genres */}
      <div>
        <h3 className="font-semibold mb-3">Genres</h3>
        <div className="space-y-2">
          {ALL_GENRES.map((genre) => (
            <div key={genre} className="flex items-center space-x-2">
              <Checkbox
                id={`genre-${genre}`}
                checked={selectedGenres.includes(genre)}
                onCheckedChange={() => toggleGenre(genre)}
                data-testid={`checkbox-genre-${genre.toLowerCase()}`}
              />
              <Label
                htmlFor={`genre-${genre}`}
                className="cursor-pointer text-sm"
              >
                {genre}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Year Range */}
      <div>
        <h3 className="font-semibold mb-3">Year Range</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1900"
              max="2030"
              value={yearRange[0]}
              onChange={(e) =>
                handleFilterChange(setYearRange, [parseInt(e.target.value) || 1900, yearRange[1]])
              }
              className="w-24"
              data-testid="input-year-from"
            />
            <span className="flex items-center">to</span>
            <Input
              type="number"
              min="1900"
              max="2030"
              value={yearRange[1]}
              onChange={(e) =>
                handleFilterChange(setYearRange, [yearRange[0], parseInt(e.target.value) || 2030])
              }
              className="w-24"
              data-testid="input-year-to"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setSelectedGenres([]);
          setYearRange([1900, 2030]);
        }}
        data-testid="button-clear-filters"
      >
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <SEO
        title="Search Movies & TV Shows"
        description="Search for your favorite movies and TV shows on StreamVault. Filter by genre, year, and more."
        canonical="https://streamvault.live/search"
        robots="noindex,follow"
      />
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 max-w-2xl">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for shows, movies, anime, genres, actors..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="pl-10"
                data-testid="input-search-query"
              />
            </div>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden gap-2"
                  data-testid="button-mobile-filters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </form>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              <h2 className="font-semibold mb-4">Filters</h2>
              <FilterContent />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <Tabs value={currentTab} onValueChange={(val) => handleFilterChange(setCurrentTab, val)} className="w-full">
              <TabsList className="mb-6 flex flex-wrap h-auto gap-2">
                <TabsTrigger value="all">
                  All {currentTab === 'all' && totalCount !== undefined ? `(${totalCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="shows">
                  Shows {currentTab === 'shows' && totalCount !== undefined ? `(${totalCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="movies">
                  Movies {currentTab === 'movies' && totalCount !== undefined ? `(${totalCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="anime">
                  Anime {currentTab === 'anime' && totalCount !== undefined ? `(${totalCount})` : ''}
                </TabsTrigger>
              </TabsList>

              {/* All Tabs use the same content area now, since the items are fetched based on currentTab */}
              <div className="min-h-[400px]">
                {isLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="aspect-[2/3]" />
                    ))}
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
                    {filteredItems.map((item) => {
                      if (item.mediaType === 'movie') {
                        return <MovieCard key={`movie-${item.id}`} movie={item as Movie} />;
                      } else {
                        return <ShowCard key={`${item.mediaType}-${item.id}`} show={item as any} />;
                      }
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </div>
              
              {/* Bottom Pagination / Loading Indicator */}
              <div ref={ref} className="mt-8 mb-4 flex justify-center py-4">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Loading more results...
                  </div>
                ) : hasNextPage ? (
                  <Button variant="outline" onClick={() => fetchNextPage()}>
                    Load More
                  </Button>
                ) : filteredItems.length > 0 ? (
                  <p className="text-muted-foreground">You've reached the end of the results</p>
                ) : null}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
