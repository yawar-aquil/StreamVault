import { useState, useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, User, ArrowRight, Film, Tv, Search, X, Sparkles } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import type { Show, Movie, Anime } from "@shared/schema";

interface ContentPost {
  type: "movie" | "show" | "anime";
  slug: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  genres: string;
  rating: string;
  imdbRating: string | null;
  cast: string | null;
}

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const { ref, inView } = useInView();

  const { data: showsData } = useQuery({
    queryKey: ["/api/search/advanced", { type: "shows", limit: 1 }],
    queryFn: async () => {
      const res = await fetch("/api/search/advanced?type=shows&limit=1");
      return res.json();
    }
  });

  const { data: moviesData } = useQuery({
    queryKey: ["/api/search/advanced", { type: "movies", limit: 1 }],
    queryFn: async () => {
      const res = await fetch("/api/search/advanced?type=movies&limit=1");
      return res.json();
    }
  });

  const { data: animeData } = useQuery({
    queryKey: ["/api/search/advanced", { type: "anime", limit: 1 }],
    queryFn: async () => {
      const res = await fetch("/api/search/advanced?type=anime&limit=1");
      return res.json();
    }
  });

  const { 
    data, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["/api/search/advanced", { q: searchQuery, type: "all", sort: "year", limit: 60 }],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        q: searchQuery,
        type: "all",
        sort: "year",
        page: pageParam.toString(),
        limit: "60"
      });
      const res = await fetch(`/api/search/advanced?${params}`);
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

  const allItems = data?.pages.flatMap(page => page.items) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  const allPosts: ContentPost[] = allItems.map(item => ({
    type: item.mediaType,
    slug: item.slug,
    title: item.title,
    description: item.description || '',
    posterUrl: item.posterUrl || '',
    backdropUrl: item.backdropUrl || '',
    year: item.year,
    genres: item.genres || '',
    rating: item.rating || '',
    imdbRating: item.imdbRating,
    cast: item.cast,
  }));

  // Sort by year (newest first), but put Dhurandhar at the top as featured
  const filteredPosts = allPosts.sort((a, b) => {
    if (a.slug === "dhurandhar") return -1;
    if (b.slug === "dhurandhar") return 1;
    return 0; // Maintain existing order from the API which is by year
  });

  const blogStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "StreamVault Blog",
    "description": "Read detailed reviews, cast information, box office reports, and behind-the-scenes content for movies, anime, and TV shows.",
    "url": "https://streamvault.live/blog",
    "mainEntity": filteredPosts.slice(0, 12).map((post) => ({
      "@type": "Article",
      "headline": post.title,
      "url": `https://streamvault.live/blog/${post.type}/${post.slug}`,
      "image": post.backdropUrl || post.posterUrl,
      "about": {
        "@type": post.type === "movie" ? "Movie" : "TVSeries",
        "name": post.title
      }
    }))
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Blog - Movie & TV Show Reviews, News & Updates"
        description="Read detailed reviews, cast information, box office reports, and behind-the-scenes content for all movies and TV shows on StreamVault."
        canonical="https://streamvault.live/blog"
        keywords={["movie reviews", "tv show reviews", "anime guides", "streaming blog", "cast information"]}
        structuredData={blogStructuredData}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">StreamVault Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-6">
            Discover in-depth reviews, cast details, box office numbers, and everything you need to know about your favorite movies and TV shows.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search articles by title, genre, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {totalCount} result{totalCount !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <Film className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{moviesData?.totalCount || 0}</p>
            <p className="text-sm text-muted-foreground">Movies</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <Tv className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{showsData?.totalCount || 0}</p>
            <p className="text-sm text-muted-foreground">TV Shows</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{animeData?.totalCount || 0}</p>
            <p className="text-sm text-muted-foreground">Anime</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <User className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Articles</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">Daily</p>
            <p className="text-sm text-muted-foreground">Updates</p>
          </div>
        </div>

        {/* Featured Post */}
        {filteredPosts.length > 0 && !searchQuery && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Featured Article</h2>
            <Link href={`/blog/${filteredPosts[0].type}/${filteredPosts[0].slug}`}>
              <div className="relative rounded-xl overflow-hidden group cursor-pointer">
                <div className="aspect-[21/9] relative">
                  <img
                    src={filteredPosts[0].backdropUrl}
                    alt={filteredPosts[0].title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <Badge className="mb-3">
                    {filteredPosts[0].type === "movie" ? "Movie" : filteredPosts[0].type === "anime" ? "Anime" : "TV Show"}
                  </Badge>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {filteredPosts[0].title} ({filteredPosts[0].year})
                  </h3>
                  <p className="text-gray-300 line-clamp-2 mb-3 max-w-3xl">
                    {filteredPosts[0].description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {filteredPosts[0].year}
                    </span>
                    <span>{filteredPosts[0].genres}</span>
                    {filteredPosts[0].imdbRating && (
                      <span className="text-yellow-500">★ {filteredPosts[0].imdbRating}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* All Posts Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{searchQuery ? "Search Results" : "All Articles"}</h2>
          <p className="text-muted-foreground mb-6">
            Browse {totalCount} articles about movies and TV shows
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-4">Try a different search term</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>Clear Search</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(searchQuery ? filteredPosts : filteredPosts.slice(1)).map((post) => (
              <Link key={`${post.type}-${post.slug}-${post.title}`} href={`/blog/${post.type}/${post.slug}`}>
                <article className="bg-card border border-border rounded-lg overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={post.backdropUrl || post.posterUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary">
                        {post.type === "movie" ? "Movie" : post.type === "anime" ? "Anime" : "TV Show"}
                      </Badge>
                    </div>
                    {post.imdbRating && (
                      <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-sm text-yellow-500 font-medium">
                        ★ {post.imdbRating}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{post.year}</span>
                      </div>
                      <span className="flex items-center gap-1 text-primary">
                        Read more <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom Pagination / Loading Indicator */}
        <div ref={ref} className="mt-8 flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Loading more articles...
            </div>
          ) : hasNextPage ? (
            <Button variant="outline" onClick={() => fetchNextPage()}>
              Load More
            </Button>
          ) : filteredPosts.length > 0 ? (
            <p className="text-muted-foreground">You've reached the end of the list</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
