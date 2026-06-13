import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Filter, Film, Tv, Grid, List, X, Sparkles } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { SEO } from "@/components/seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Show, Movie, Anime } from "@shared/schema";

const ALL_GENRES = [
  "Action", "Action & Adventure", "Adventure", "Animation", "Comedy", 
  "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", 
  "Horror", "Music", "Mystery", "Romance", "Sci-Fi & Fantasy", 
  "Science Fiction", "Soap", "TV Movie", "Thriller", "War", 
  "War & Politics", "Western"
];

type ContentType = "all" | "shows" | "movies" | "anime";
type SortOption = "title" | "year" | "rating";

export default function Browse() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("year"); // Changed default to year since that's "newest first"
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { ref, inView } = useInView();

  // Reset page when filters change
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
      { q: searchQuery, type: contentType, genres: selectedGenre !== "all" ? selectedGenre : "", sort: sortBy, limit: 60 }
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        q: searchQuery,
        type: contentType,
        genres: selectedGenre !== "all" ? selectedGenre : "",
        sort: sortBy,
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

  const filteredContent = data?.pages.flatMap(page => page.items) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  // Helper to check if item is a movie
  const isMovie = (item: Show | Movie | Anime): item is Movie => {
    return "googleDriveUrl" in item && !("studio" in item);
  };

  // Helper to check if item is anime
  const isAnime = (item: Show | Movie | Anime): item is Anime => {
    return "studio" in item || "malRating" in item;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setContentType("all");
    setSelectedGenre("all");
    setSortBy("year");
  };

  const hasActiveFilters =
    searchQuery || contentType !== "all" || selectedGenre !== "all";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Browse All Movies & TV Shows | StreamVault"
        description="Browse our complete collection of movies and TV shows. Filter by genre, sort by rating, and find your next favorite content."
        canonical="https://streamvault.live/browse"
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Browse</h1>
          <p className="text-muted-foreground">
            Explore our collection of {totalCount} items
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, genre, cast..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              className="pl-10 bg-card"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Content Type */}
            <div className="flex gap-1 bg-card rounded-lg p-1">
              <Button
                size="sm"
                variant={contentType === "all" ? "default" : "ghost"}
                onClick={() => handleFilterChange(setContentType, "all")}
                className="gap-1"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={contentType === "shows" ? "default" : "ghost"}
                onClick={() => handleFilterChange(setContentType, "shows")}
                className="gap-1"
              >
                <Tv className="w-4 h-4" />
                Shows
              </Button>
              <Button
                size="sm"
                variant={contentType === "movies" ? "default" : "ghost"}
                onClick={() => handleFilterChange(setContentType, "movies")}
                className="gap-1"
              >
                <Film className="w-4 h-4" />
                Movies
              </Button>
              <Button
                size="sm"
                variant={contentType === "anime" ? "default" : "ghost"}
                onClick={() => handleFilterChange(setContentType, "anime")}
                className="gap-1"
              >
                <Sparkles className="w-4 h-4" />
                Anime
              </Button>
            </div>

            {/* Genre Filter */}
            <Select value={selectedGenre} onValueChange={(v) => handleFilterChange(setSelectedGenre, v)}>
              <SelectTrigger className="w-[150px] bg-card">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {ALL_GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v as SortOption)}>
              <SelectTrigger className="w-[140px] bg-card">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="year">Newest First</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex gap-1 bg-card rounded-lg p-1 ml-auto">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="gap-1 text-muted-foreground"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredContent.length} results on this page (Total: {totalCount})
        </div>

        {/* Content Grid/List */}
        {filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              No results found
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {filteredContent.map((item) => (
              <Link
                key={item.id}
                href={isAnime(item) ? `/anime/${item.slug}` : isMovie(item) ? `/movie/${item.slug}` : `/show/${item.slug}`}
              >
                <div className="group cursor-pointer">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-card mb-2">
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    <Badge
                      className="absolute top-2 right-2 text-xs"
                      variant="secondary"
                    >
                      {isAnime(item) ? "Anime" : isMovie(item) ? "Movie" : "TV"}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {item.year}
                    {!isMovie(item) && ` • ${item.totalSeasons} Season${item.totalSeasons > 1 ? "s" : ""}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContent.map((item) => (
              <Link
                key={item.id}
                href={isAnime(item) ? `/anime/${item.slug}` : isMovie(item) ? `/movie/${item.slug}` : `/show/${item.slug}`}
              >
                <div className="flex gap-4 p-3 rounded-lg bg-card hover:bg-card/80 transition-colors cursor-pointer">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-16 h-24 object-cover rounded"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {isAnime(item) ? "Anime" : isMovie(item) ? "Movie" : "TV"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.year}
                      {!isMovie(item) && !isAnime(item) && ` • ${(item as Show).totalSeasons} Season${(item as Show).totalSeasons > 1 ? "s" : ""}`}
                      {isAnime(item) && (item as Anime).studio && ` • ${(item as Anime).studio}`}
                      {item.imdbRating && ` • ⭐ ${item.imdbRating}`}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom Pagination / Loading Indicator */}
        <div ref={ref} className="mt-8 flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading more items...
            </div>
          ) : hasNextPage ? (
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Load More
            </Button>
          ) : filteredContent.length > 0 ? (
            <p className="text-muted-foreground">You've reached the end of the list</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
