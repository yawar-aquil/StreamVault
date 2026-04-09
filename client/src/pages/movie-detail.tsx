import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Play, Clock, Calendar, Star, Plus, Check, Share2, ChevronLeft, Globe, ExternalLink, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Movie, BlogPost } from "@shared/schema";
import { ReviewsSection } from "@/components/reviews-section";
import { AdContainer } from "@/components/ad-manager";
import { HeroTrailer, extractTrailerFromBlogPost } from "@/components/hero-trailer";

export default function MovieDetail() {
  const [, params] = useRoute("/movie/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: movie, isLoading } = useQuery<Movie>({
    queryKey: [`/api/movies/${slug}`],
    enabled: !!slug,
  });

  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
  });

  // Fetch blog posts to get production companies and external links
  const { data: blogPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  // Find matching blog post for this movie
  const blogPost = movie ? blogPosts.find(
    (post) => post.contentId === movie.id || post.slug === movie.slug
  ) : null;

  // Parse production companies and external links
  interface ProductionCompany {
    name: string;
    logoUrl: string | null;
    website: string | null;
    country: string | null;
  }
  let productionCompanies: ProductionCompany[] = [];
  if ((blogPost as any)?.productionCompanies) {
    try {
      productionCompanies = JSON.parse((blogPost as any).productionCompanies);
    } catch { }
  }

  interface ExternalLinks {
    homepage: string | null;
    imdb: string | null;
    facebook: string | null;
    twitter: string | null;
    instagram: string | null;
  }
  let externalLinks: ExternalLinks = { homepage: null, imdb: null, facebook: null, twitter: null, instagram: null };
  if ((blogPost as any)?.externalLinks) {
    try {
      externalLinks = JSON.parse((blogPost as any).externalLinks);
    } catch { }
  }

  const isInWatchlist = movie ? watchlist.some((item) => item.movieId === movie.id) : false;

  const addToWatchlistMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/watchlist", {
        movieId: movie!.id,
        addedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to Watchlist",
        description: `${movie!.title} has been added to your watchlist.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/watchlist/movie/${movie!.id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from Watchlist",
        description: `${movie!.title} has been removed from your watchlist.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove from watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleWatchlist = () => {
    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (!movie) return;

    const shareData = {
      title: movie.title,
      text: `Watch ${movie.title} on StreamVault`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully!",
          description: "Thanks for sharing StreamVault!",
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied!",
          description: "Share link copied to clipboard",
        });
      } catch (err) {
        console.error('Error copying to clipboard:', err);
        toast({
          title: "Share link",
          description: shareData.url,
          variant: "default",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[60vh]" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Movie Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The movie you're looking for doesn't exist.
          </p>
          <Link href="/movies">
            <Button>Browse Movies</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate display languages from audio tracks if available
  const availableLanguages = new Set([movie.language || "English"]);
  if (movie.audioTracks) {
    try {
      const tracks = JSON.parse(movie.audioTracks);
      tracks.forEach((t: { language: string }) => availableLanguages.add(t.language));
    } catch (e) {}
  }
  const displayLanguage = Array.from(availableLanguages).join(", ");

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": movie.title,
    "description": movie.description,
    "image": movie.backdropUrl,
    "datePublished": movie.year?.toString(),
    "genre": movie.genres?.split(',').map(g => g.trim()),
    "inLanguage": displayLanguage,
    "duration": `PT${movie.duration}M`,
    "aggregateRating": movie.imdbRating ? {
      "@type": "AggregateRating",
      "ratingValue": movie.imdbRating,
      "bestRating": "10",
      "worstRating": "1"
    } : undefined,
    "director": movie.directors ? {
      "@type": "Person",
      "name": movie.directors
    } : undefined,
    "actor": movie.castDetails ? JSON.parse(movie.castDetails).map((c: any) => ({
      "@type": "Person",
      "name": c.name
    })) : undefined,
    "url": `https://streamvault.live/movie/${movie.slug}`
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${movie.title} (${movie.year}) - Watch Free | StreamVault`}</title>
        <meta name="description" content={movie.description} />
        <link rel="canonical" href={`https://streamvault.live/movie/${movie.slug}`} />

        {/* Open Graph */}
        <meta property="og:type" content="video.movie" />
        <meta property="og:title" content={`${movie.title} - Watch Free | StreamVault`} />
        <meta property="og:description" content={movie.description} />
        <meta property="og:image" content={movie.backdropUrl} />
        <meta property="og:url" content={`https://streamvault.live/movie/${movie.slug}`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${movie.title} - Watch Free`} />
        <meta name="twitter:description" content={movie.description} />
        <meta name="twitter:image" content={movie.backdropUrl} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Hero Section - Poster on mobile, Trailer/Backdrop on desktop */}
      <div className="relative h-[60vh] overflow-hidden">
        <HeroTrailer
          youtubeId={extractTrailerFromBlogPost(blogPost)}
          backdropUrl={movie.backdropUrl}
          posterUrl={movie.posterUrl}
        />

        {/* Back Button - Overlaid on image */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/movies">
            <Button variant="ghost" className="gap-2 bg-background/20 backdrop-blur-sm hover:bg-background/40">
              <ChevronLeft className="w-4 h-4" />
              Back to Movies
            </Button>
          </Link>
        </div>

        <div className="relative container mx-auto px-4 h-full flex items-end pb-12">
          <div className="flex gap-6 items-end max-w-6xl">
            {/* Poster */}
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-48 h-72 object-cover rounded-lg shadow-2xl hidden md:block"
            />

            {/* Movie Info */}
            <div className="flex-1 pb-4">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {movie.title}
              </h1>

              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{movie.year}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{movie.duration} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{movie.rating}</Badge>
                </div>
                {movie.imdbRating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{movie.imdbRating}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                {movie.genres?.split(',').map((genre) => (
                  <Badge key={genre.trim()} variant="secondary">
                    {genre.trim()}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
                <Link href={`/watch-movie/${movie.slug}`}>
                  <Button size="lg" className="gap-2">
                    <Play className="w-5 h-5" />
                    Watch Now
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={toggleWatchlist}
                  disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-5 h-5" />
                      In Watchlist
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add to Watchlist
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </Button>
                <Link href={`/create-room?type=movie&id=${movie?.id}`}>
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white hover:from-purple-700 hover:to-pink-700"
                  >
                    <Users className="w-5 h-5" />
                    Watch Together
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl">
          {/* Description */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              {movie.description}
            </p>
          </div>

          {/* Cast Grid with Photos */}
          {movie.castDetails && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Cast</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {JSON.parse(movie.castDetails).map((member: { name: string; character: string; profileUrl: string | null }, index: number) => (
                  <Link key={index} href={`/person/${encodeURIComponent(member.name)}`}>
                    <div className="text-center cursor-pointer group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-card mb-2 group-hover:ring-2 group-hover:ring-primary transition-all">
                        {member.profileUrl ? (
                          <img
                            src={member.profileUrl}
                            alt={member.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <img
                              src="https://static.vecteezy.com/system/resources/thumbnails/005/544/718/small/profile-icon-design-free-vector.jpg"
                              alt={member.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{member.name}</p>
                      {member.character && (
                        <p className="text-xs text-muted-foreground line-clamp-1">as {member.character}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Fallback to text cast if no castDetails */}
          {!movie.castDetails && movie.cast && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Cast</h2>
              <p className="text-muted-foreground">{movie.cast}</p>
            </div>
          )}

          {/* Directors */}
          {movie.directors && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Directors</h2>
              <p className="text-muted-foreground">{movie.directors}</p>
            </div>
          )}

          {/* Details */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Language:</span>{" "}
                <span className="font-medium">{displayLanguage}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Year:</span>{" "}
                <span className="font-medium">{movie.year}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>{" "}
                <span className="font-medium">{movie.duration} minutes</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rating:</span>{" "}
                <span className="font-medium">{movie.rating}</span>
              </div>
            </div>
          </div>

          {/* Production Companies */}
          {productionCompanies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                Production Companies
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productionCompanies.map((company, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center text-center p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="h-12 w-auto object-contain mb-3 filter brightness-110"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-3">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-medium text-sm">{company.name}</p>
                    {company.country && (
                      <p className="text-xs text-muted-foreground">{company.country}</p>
                    )}
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Official Website
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links */}
          {(externalLinks.imdb || externalLinks.homepage || externalLinks.facebook || externalLinks.twitter || externalLinks.instagram) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <ExternalLink className="w-6 h-6" />
                Official Links
              </h2>
              <div className="flex flex-wrap gap-3">
                {externalLinks.homepage && (
                  <a
                    href={externalLinks.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Official Website
                  </a>
                )}
                {externalLinks.imdb && (
                  <a
                    href={externalLinks.imdb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-medium"
                  >
                    <Star className="w-4 h-4" />
                    IMDb
                  </a>
                )}
                {externalLinks.facebook && (
                  <a
                    href={externalLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {externalLinks.twitter && (
                  <a
                    href={externalLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    X (Twitter)
                  </a>
                )}
                {externalLinks.instagram && (
                  <a
                    href={externalLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </div>
          )}

          {/* User Reviews Section */}
          <div className="mb-8">
            <AdContainer type="banner" className="mb-8" />
            <ReviewsSection contentType="movie" contentId={movie.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
