import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Play, Plus, Check, Star, Share2, ChevronLeft, Globe, ExternalLink, Building2, Users, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Show, Episode, BlogPost } from "@shared/schema";
import { useState, useEffect } from "react";
import { ContentRow } from "@/components/content-row";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ReviewsSection } from "@/components/reviews-section";
import { AdContainer } from "@/components/ad-manager";

// Extract Google Drive ID from URL and generate thumbnail
const getEpisodeThumbnail = (episode: Episode, showBackdrop?: string) => {
  // Priority 1: Use custom thumbnail if it's NOT the show backdrop
  if (episode.thumbnailUrl && episode.thumbnailUrl !== showBackdrop) {
    return episode.thumbnailUrl;
  }

  // Priority 2: Auto-generate from Google Drive video
  const driveIdMatch = episode.googleDriveUrl?.match(/\/d\/([^/]+)/);
  if (driveIdMatch && driveIdMatch[1] !== 'PLACEHOLDER_VIDEO_ID') {
    return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
  }

  // Priority 3: Fallback to episode's thumbnail or show backdrop
  return episode.thumbnailUrl;
};

export default function ShowDetail() {
  const [, params] = useRoute("/show/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug;

  const { data: show, isLoading: showLoading } = useQuery<Show>({
    queryKey: ["/api/shows", slug],
    enabled: !!slug,
  });

  const { data: episodes, isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["/api/episodes", show?.id],
    enabled: !!show?.id,
  });

  const { data: allShows } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const [selectedSeason, setSelectedSeason] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
  });

  // Fetch blog posts to get production companies and external links
  const { data: blogPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  // Find matching blog post for this show
  const blogPost = show ? blogPosts.find(
    (post) => post.contentId === show.id || post.slug === show.slug
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

  const isInWatchlist = show ? watchlist.some((item) => item.showId === show.id) : false;

  const addToWatchlistMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/watchlist", {
        showId: show!.id,
        addedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/watchlist/${show!.id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });


  const createReminderMutation = useMutation({
    mutationFn: (remindAt: string) => apiRequest("POST", "/api/reminders", {
      contentId: show!.id,
      contentType: "show",
      title: show!.title,
      remindAt
    }),
    onSuccess: () => {
      toast({
        title: "Reminder Set!",
        description: "We'll notify you when it's time to watch.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set reminder",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleReminder = () => {
    // Default to 1 day from now if no specific next episode logic yet
    // In a real app, we'd find the next air date.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    createReminderMutation.mutate(tomorrow.toISOString());
  };

  const toggleWatchlist = () => {
    if (!show) return;

    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (!show) return;

    const shareData = {
      title: `${show.title} - StreamVault`,
      text: `Watch ${show.title} online free in HD! ${show.description.slice(0, 100)}...`,
      url: `https://streamvault.live/show/${show.slug}`,
    };

    // Try native share API first (mobile devices)
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
      // Fallback: Copy to clipboard
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


  if (showLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-96" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Show not found</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const seasonEpisodes = episodes?.filter((ep) => ep.season === selectedSeason) || [];
  const seasons = Array.from(
    new Set(episodes?.map((ep) => ep.season) || [])
  ).sort((a, b) => a - b);

  const similarShows =
    allShows?.filter(
      (s) => {
        if (s.id === show.id) return false;
        const sGenres = s.genres?.split(',').map(g => g.trim().toLowerCase()) || [];
        const showGenres = show.genres?.split(',').map(g => g.trim().toLowerCase()) || [];
        return sGenres.some((genre) => showGenres.includes(genre));
      }
    ).slice(0, 12) || [];

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": show.title,
    "description": show.description,
    "image": show.backdropUrl,
    "datePublished": show.year?.toString(),
    "genre": show.genres?.split(',').map(g => g.trim()),
    "inLanguage": show.language || "English",
    "numberOfSeasons": show.totalSeasons,
    "aggregateRating": show.imdbRating ? {
      "@type": "AggregateRating",
      "ratingValue": show.imdbRating,
      "bestRating": "10",
      "worstRating": "1"
    } : undefined,
    "actor": show.castDetails ? JSON.parse(show.castDetails).map((c: any) => ({
      "@type": "Person",
      "name": c.name
    })) : undefined,
    "url": `https://streamvault.live/show/${show.slug}`
  };

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>{`${show.title} - Watch Online Free | StreamVault`}</title>
        <meta name="description" content={show.description} />
        <link rel="canonical" href={`https://streamvault.live/show/${show.slug}`} />

        {/* Open Graph */}
        <meta property="og:type" content="video.tv_show" />
        <meta property="og:title" content={`${show.title} - Watch Online Free | StreamVault`} />
        <meta property="og:description" content={show.description} />
        <meta property="og:image" content={show.backdropUrl} />
        <meta property="og:url" content={`https://streamvault.live/show/${show.slug}`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${show.title} - Watch Online Free`} />
        <meta name="twitter:description" content={show.description} />
        <meta name="twitter:image" content={show.backdropUrl} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Hero Section - Poster on mobile, Backdrop on desktop */}
      <div className="relative w-full h-96 md:h-[500px] overflow-hidden" >
        {/* Poster for mobile */}
        < div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{
            backgroundImage: `url(${show.posterUrl
              })`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>
        {/* Backdrop for desktop */}
        <div
          className="absolute inset-0 bg-cover bg-center hidden md:block"
          style={{ backgroundImage: `url(${show.backdropUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        </div>

        {/* Back Button - Overlaid on image */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/series">
            <Button variant="ghost" className="gap-2 bg-background/20 backdrop-blur-sm hover:bg-background/40">
              <ChevronLeft className="w-4 h-4" />
              Back to Series
            </Button>
          </Link>
        </div>

        <div className="relative h-full container mx-auto px-4 flex items-end pb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full">
            {/* Poster - Hidden on mobile */}
            <div className="flex-shrink-0 hidden md:block">
              <img
                src={show.posterUrl}
                alt={show.title}
                className="w-48 md:w-64 rounded-md shadow-xl"
                data-testid="img-show-poster"
              />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2 md:space-y-4">
              <h1
                className="text-2xl md:text-5xl font-bold"
                data-testid="text-show-title"
              >
                {show.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm">
                {show.imdbRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{show.imdbRating}</span>
                  </div>
                )}
                <span>{show.year}</span>
                <span>{show.rating}</span>
                <span>
                  {show.totalSeasons} Season{show.totalSeasons > 1 ? "s" : ""}
                </span>
                <span>{show.language}</span>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {show.genres?.split(',').map((genre) => (
                  <Badge key={genre.trim()} variant="secondary" className="text-xs md:text-sm">
                    {genre.trim()}
                  </Badge>
                ))}
              </div>

              {/* Description - Hidden on mobile */}
              <p className="text-base max-w-3xl hidden md:block">{show.description}</p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-2 md:gap-3 pt-1 md:pt-2">
                <Link href={`/watch/${show.slug}`}>
                  <Button size="default" className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11" data-testid="button-play-episode-1">
                    <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                    Play Episode 1
                  </Button>
                </Link>
                <Button
                  size="default"
                  variant="outline"
                  className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11"
                  onClick={toggleWatchlist}
                  data-testid="button-add-to-watchlist"
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">In Watchlist</span>
                      <span className="sm:hidden">Watchlist</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Add to Watchlist</span>
                      <span className="sm:hidden">Watchlist</span>
                    </>
                  )}
                </Button>
                <Button
                  size="default"
                  variant="outline"
                  className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11"
                  onClick={handleShare}
                  data-testid="button-share-show"
                >
                  <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                  Share
                </Button>
                <Button
                  size="default"
                  variant="outline"
                  className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11"
                  onClick={handleReminder}
                  data-testid="button-notify-me"
                >
                  <Bell className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Notify Me</span>
                  <span className="sm:hidden">Notify</span>
                </Button>
                <Link href={`/create-room?type=show&id=${show?.id}`}>
                  <Button
                    size="default"
                    variant="outline"
                    className="gap-1.5 md:gap-2 text-sm md:text-base h-9 md:h-11 bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white hover:from-purple-700 hover:to-pink-700"
                    data-testid="button-watch-together"
                  >
                    <Users className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="hidden sm:inline">Watch Together</span>
                    <span className="sm:hidden">Party</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="episodes" className="w-full">
          <TabsList className="mb-4 md:mb-6">
            <TabsTrigger value="episodes" data-testid="tab-episodes" className="text-xs md:text-sm">
              Episodes
            </TabsTrigger>
            <TabsTrigger value="about" data-testid="tab-about" className="text-xs md:text-sm">
              About
            </TabsTrigger>
            <TabsTrigger value="similar" data-testid="tab-similar" className="text-xs md:text-sm">
              Similar Shows
            </TabsTrigger>
          </TabsList>

          {/* Episodes Tab */}
          <TabsContent value="episodes" className="space-y-6">
            {/* Season Selector */}
            {seasons.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {seasons.map((season) => (
                  <Button
                    key={season}
                    variant={selectedSeason === season ? "default" : "outline"}
                    onClick={() => setSelectedSeason(season)}
                    data-testid={`button - season - ${season} `}
                    className="text-xs md:text-sm h-8 md:h-10"
                  >
                    Season {season}
                  </Button>
                ))}
              </div>
            )}

            {/* Episodes List */}
            {episodesLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-64 aspect-video flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {seasonEpisodes.map((episode) => (
                  <div
                    key={episode.id}
                    onClick={() => {
                      const url = `/watch/${show.slug}?season=${episode.season}&episode=${episode.episodeNumber}`;
                      console.log("Clicking episode - navigating to:", url);
                      window.location.replace(url);
                    }}
                  >
                    <Card className="overflow-hidden cursor-pointer group hover-elevate active-elevate-2 transition-all">
                      <div className="flex gap-3 md:gap-4 p-0">
                        {/* Thumbnail */}
                        <div className="relative w-32 md:w-64 flex-shrink-0 aspect-video">
                          <img
                            src={getEpisodeThumbnail(episode, show.backdropUrl)}
                            alt={episode.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 md:w-12 h-8 md:h-12 text-primary fill-current" />
                          </div>
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1 py-3 md:py-4 pr-3 md:pr-4">
                          <h3
                            className="text-base md:text-xl font-semibold mb-1 md:mb-2 line-clamp-1"
                            data-testid={`text - episode - title - ${episode.id} `}
                          >
                            {episode.title}
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
                            S{episode.season} E{episode.episodeNumber} • {episode.airDate} • {episode.duration}m
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                            {episode.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{show.description}</p>
              </div>

              {/* Cast Grid with Photos */}
              {show.castDetails && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Cast</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {JSON.parse(show.castDetails).map((member: { name: string; character: string; profileUrl: string | null }, index: number) => (
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
              {!show.castDetails && show.cast && show.cast.trim() && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cast</h3>
                  <p className="text-muted-foreground">{show.cast}</p>
                </div>
              )}

              {show.creators && show.creators.trim() && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Creators</h3>
                  <p className="text-muted-foreground">
                    {show.creators}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Year:</span>{" "}
                    <span className="font-medium">{show.year}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rating:</span>{" "}
                    <span className="font-medium">{show.rating}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Language:</span>{" "}
                    <span className="font-medium">{show.language}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seasons:</span>{" "}
                    <span className="font-medium">{show.totalSeasons}</span>
                  </div>
                </div>
              </div>

              {/* Production Companies */}
              {productionCompanies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Production Companies
                  </h3>
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
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Official Links
                  </h3>
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

              <AdContainer type="banner" className="my-8" />
              <ReviewsSection contentType="show" contentId={show.id} />
            </div>
          </TabsContent>

          {/* Similar Shows Tab */}
          <TabsContent value="similar">
            {similarShows.length > 0 ? (
              <ContentRow title="" shows={similarShows} orientation="landscape" />
            ) : (
              <p className="text-muted-foreground">No similar shows found.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
