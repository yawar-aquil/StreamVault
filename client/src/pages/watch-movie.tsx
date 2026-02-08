import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGoogleDriveDownloadUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentsSection } from "@/components/comments-section";
import { VideoPlayer, VideoPlayerRef } from "@/components/video-player";
import { Helmet } from "react-helmet-async";
import type { Movie } from "@shared/schema";
import { trackWatch } from "@/components/analytics-tracker";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/notifications-context";

export default function WatchMovie() {
  const [, params] = useRoute("/watch-movie/:slug");
  const slug = params?.slug;
  const watchTracked = useRef(false);
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const lastSaveTimeRef = useRef(0);
  const hasResumedRef = useRef(false);

  const { data: movie } = useQuery<Movie>({
    queryKey: [`/api/movies/${slug}`],
    enabled: !!slug,
  });

  const { data: allMovies } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  // Fetch blog posts to get IMDB links for subtitles
  const { data: blogPosts = [] } = useQuery<any[]>({
    queryKey: ["/api/blog"],
    enabled: !!movie?.id,
  });

  // Find matching blog post for this movie to get external links
  const blogPost = movie ? blogPosts.find(
    (post) => post.contentId === movie.id || post.slug === movie.slug
  ) : null;

  // State for subtitle tracks
  const [subtitleTracks, setSubtitleTracks] = useState<Array<{
    file: string;
    label: string;
    kind: 'captions' | 'subtitles';
    default?: boolean;
  }>>([]);

  // Fetch subtitles when movie loads
  useEffect(() => {
    const fetchSubtitles = async () => {
      if (!movie || !blogPost) return;

      try {
        // Parse IMDB ID from blog post external links
        const externalLinks = blogPost.externalLinks
          ? (typeof blogPost.externalLinks === 'string'
            ? JSON.parse(blogPost.externalLinks)
            : blogPost.externalLinks)
          : null;

        const imdbLink = externalLinks?.imdb;
        if (!imdbLink) {
          console.log('No IMDB link found for movie subtitle search');
          return;
        }

        // Extract just the IMDB ID (tt1234567) from the link
        const imdbMatch = imdbLink.match(/tt\d+/);
        if (!imdbMatch) {
          console.log('Invalid IMDB ID format');
          return;
        }

        console.log(`🔍 Fetching subtitles for movie ${imdbMatch[0]}`);

        const response = await fetch(
          `/api/subtitles/search?imdbId=${imdbMatch[0]}&language=en`
        );

        if (!response.ok) {
          console.error('Movie subtitle search failed');
          return;
        }

        const data = await response.json();

        if (data.subtitles && data.subtitles.length > 0) {
          console.log(`✅ Found ${data.subtitles.length} movie subtitles`);

          // Language code to full name mapping
          const langNames: Record<string, string> = {
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
            'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
            'tr': 'Turkish', 'pl': 'Polish', 'nl': 'Dutch', 'sv': 'Swedish'
          };

          // Convert to VideoPlayer format (use first 10 subtitles)
          const tracks = data.subtitles.slice(0, 10).map((sub: any, index: number) => ({
            file: sub.downloadUrl,
            label: langNames[sub.lang] || sub.language || sub.lang || 'Unknown',
            kind: 'subtitles' as const,
            default: index === 0
          }));

          setSubtitleTracks(tracks);
        } else {
          console.log('No movie subtitles found');
        }
      } catch (error) {
        console.error('Error fetching movie subtitles:', error);
      }
    };

    fetchSubtitles();
  }, [movie?.id, blogPost]);

  const queryClient = useQueryClient();

  const updateProgressMutation = useMutation({
    mutationFn: (progress: any) =>
      apiRequest("POST", "/api/progress", progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
  });

  const { toast } = useToast();
  const { user, refetchUser } = useAuth();
  const { fetchNotifications } = useNotifications();
  const xpAwardedRef = useRef(false);

  // Mutation to award XP
  const awardXPMutation = useMutation({
    mutationFn: async () => {
      if (xpAwardedRef.current) return; // Prevent double awarding locally
      xpAwardedRef.current = true;
      await apiRequest("POST", "/api/user/xp", { amount: 50 }); // 50 XP for a movie
    },
    onSuccess: async () => {
      // Refetch user to update XP/level in UI
      await refetchUser();
      // Refetch notifications to show XP earned notification in notification center
      await fetchNotifications();
    },
    onError: () => {
      xpAwardedRef.current = false; // Reset on failure to try again
    }
  });

  // Fetch saved progress for movies
  const { data: savedProgress } = useQuery<any[]>({
    queryKey: ["/api/progress"],
    enabled: !!movie?.id,
  });

  // Find saved progress for current movie
  const currentSavedProgress = savedProgress?.find(
    (p) => p.movieId === movie?.id
  );

  // Handle time update - saves progress every 10 seconds
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (!movie || duration <= 0) return;

    // Save progress every 10 seconds
    const now = Date.now();
    if (now - lastSaveTimeRef.current >= 10000 && currentTime > 5) {
      lastSaveTimeRef.current = now;
      updateProgressMutation.mutate({
        movieId: movie.id,
        progress: Math.floor(currentTime),
        duration: Math.floor(duration),
        lastWatched: new Date().toISOString(),
      });

      // Award XP if > 90% watched (only once per movie)
      if (currentTime / duration > 0.9 && !xpAwardedRef.current) {
        awardXPMutation.mutate();
      }
    }
  };

  // Helper to check if URL is a direct video (JWPlayer compatible) - duplicated from watch.tsx or imported
  const isDirectVideoUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mpd'];
    const isGoogleDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
    const isEmbed = url.includes('/embed') || url.includes('/e/') || url.includes('player.');
    return !isGoogleDrive && !isEmbed && videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Manual progress tracking for Drive/Embed movies
  useEffect(() => {
    if (!movie) return;

    const isDirect = isDirectVideoUrl(movie.googleDriveUrl);

    if (!isDirect) {
      // Log "watch_start" immediately after a short delay
      const timer = setTimeout(() => {
        console.log("⏱️ Logging manual watch_start for Drive/Embed movie");
        updateProgressMutation.mutate({
          movieId: movie.id,
          progress: 10, // Hardcode 10s
          duration: movie.duration * 60,
          lastWatched: new Date().toISOString(),
        });
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [movie?.id]);

  // Resume from saved position when video is ready
  useEffect(() => {
    if (
      currentSavedProgress &&
      currentSavedProgress.progress > 10 &&
      videoPlayerRef.current &&
      !hasResumedRef.current
    ) {
      // Only resume if less than 95% watched
      const percentage = (currentSavedProgress.progress / currentSavedProgress.duration) * 100;
      if (percentage < 95) {
        const seekTime = currentSavedProgress.progress;
        console.log(`▶️ Resuming movie from ${Math.floor(seekTime / 60)}:${Math.floor(seekTime % 60).toString().padStart(2, '0')}`);

        setTimeout(() => {
          videoPlayerRef.current?.seek(seekTime);
          hasResumedRef.current = true;
        }, 1000);
      }
    }
  }, [currentSavedProgress, movie?.id]);

  // Reset resume flag when movie changes
  useEffect(() => {
    hasResumedRef.current = false;
    lastSaveTimeRef.current = 0;
  }, [movie?.id]);

  // Track watch event for analytics
  useEffect(() => {
    if (movie && !watchTracked.current) {
      watchTracked.current = true;
      trackWatch('movie', movie.id, movie.title, undefined, movie.duration ? movie.duration * 60 : 0);
    }
    return () => {
      watchTracked.current = false;
    };
  }, [movie?.id]);

  // Set Media Session metadata for browser controls
  useEffect(() => {
    if ('mediaSession' in navigator && movie) {
      const metadata = {
        title: movie.title,
        artist: 'StreamVault',
        album: `${movie.year}`,
        artwork: [
          {
            src: movie.posterUrl || '',
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: movie.posterUrl || '',
            sizes: '256x256',
            type: 'image/jpeg',
          },
        ],
      };

      navigator.mediaSession.metadata = new MediaMetadata(metadata);

      // Update document title
      document.title = `${movie.title} (${movie.year}) | StreamVault`;
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
      document.title = 'StreamVault - Free Movies & TV Shows';
    };
  }, [movie]);

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-full max-w-5xl aspect-video" />
      </div>
    );
  }

  const extractDriveId = (url: string) => {
    const match = url.match(/\/d\/([^/]+)/);
    return match ? match[1] : null;
  };

  const PLACEHOLDER_IDS = ['1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd', 'PLACEHOLDER'];

  // Check if it's a placeholder URL or no URL at all
  const isPlaceholder = PLACEHOLDER_IDS.some(id => movie.googleDriveUrl?.includes(id));
  const driveId = (!movie.googleDriveUrl || isPlaceholder) ? null : extractDriveId(movie.googleDriveUrl);

  // Get recommended movies based on genre and category
  const recommendedMovies = allMovies
    ?.filter((m) => {
      if (m.id === movie.id) return false;

      // Match by genre or category
      const movieGenres = movie.genres?.toLowerCase().split(',').map(g => g.trim()) || [];
      const otherGenres = m.genres?.toLowerCase().split(',').map(g => g.trim()) || [];
      const hasMatchingGenre = movieGenres.some(genre => otherGenres.includes(genre));
      const hasMatchingCategory = m.category === movie.category;

      return hasMatchingGenre || hasMatchingCategory;
    })
    .slice(0, 8) || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Watch ${movie.title} (${movie.year}) Free | StreamVault`}</title>
        <meta name="description" content={movie.description} />
        {/* Canonical points to movie detail page to avoid duplicate content */}
        <link rel="canonical" href={`https://streamvault.live/movie/${movie.slug}`} />
        <meta property="og:type" content="video.movie" />
        <meta property="og:title" content={`Watch ${movie.title} Free`} />
        <meta property="og:description" content={movie.description} />
        <meta property="og:image" content={movie.backdropUrl} />
        <meta property="og:url" content={`https://streamvault.live/movie/${movie.slug}`} />
      </Helmet>
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Link href={`/movie/${slug}`}>
          <Button
            variant="ghost"
            className="mb-4 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {movie.title}
          </Button>
        </Link>

        <div className="grid grid-cols-1 gap-6">
          {/* Video Player */}
          <div className="bg-card rounded-lg overflow-hidden shadow-lg">
            <div className="aspect-video bg-black">
              <VideoPlayer
                ref={videoPlayerRef}
                videoUrl={movie.googleDriveUrl}
                subtitleTracks={subtitleTracks}
                onTimeUpdate={handleTimeUpdate}
                title={movie.title}
                description={movie.description}
              />
            </div>

            {/* Movie Info Below Player */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h1
                  className="text-2xl md:text-3xl font-bold"
                  data-testid="text-episode-title"
                >
                  {movie.title}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <a
                    href={getGoogleDriveDownloadUrl(movie.googleDriveUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </Button>
              </div>
              <p className="text-muted-foreground mb-4">
                {movie.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.duration} min</span>
                <span>•</span>
                <span>{movie.rating}</span>
                {movie.imdbRating && (
                  <>
                    <span>•</span>
                    <span>⭐ {movie.imdbRating}</span>
                  </>
                )}
              </div>
              <p className="text-muted-foreground">{movie.description}</p>
            </div>
          </div>

          {/* Recommended Movies Section */}
          {recommendedMovies.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Recommended Movies</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {recommendedMovies.map((recMovie) => (
                  <Link key={recMovie.id} href={`/movie/${recMovie.slug}`}>
                    <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer group">
                      <div className="relative aspect-[2/3]">
                        <img
                          src={recMovie.posterUrl}
                          alt={recMovie.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                        {recMovie.imdbRating && (
                          <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-semibold">
                            ⭐ {recMovie.imdbRating}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-1">{recMovie.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{recMovie.year}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Adsterra Native Banner - Above Comments */}
          <div className="mt-8 flex justify-center">
            <div id="container-326e4e570b95e9b55f432cac93890441"></div>
          </div>

          {/* Comments Section at Bottom */}
          <div className="mt-8">
            <CommentsSection movieId={movie.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
