import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Play, Clock, Tv, Film, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SEO } from "@/components/seo";
import type { Show, Episode, Movie, Anime, AnimeEpisode } from "@shared/schema";

interface ProgressEntry {
  showId?: string;
  movieId?: string;
  animeId?: string;
  episodeId?: string;
  season?: number;
  episodeNumber?: number;
  progress: number;
  duration: number;
  lastWatched: string;
}

export default function ContinueWatchingPage() {
  const { data: progress = [] } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress"],
  });

  const { data: shows = [] } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies = [] } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const { data: animeList = [] } = useQuery<Anime[]>({
    queryKey: ["/api/anime"],
  });

  // Sort by last watched
  const sortedProgress = [...progress].sort(
    (a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime()
  );

  // Filter out completed items (>95% watched)
  const inProgressItems = sortedProgress.filter(item => {
    const percentage = (item.progress / item.duration) * 100;
    return percentage < 95;
  });


  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatLastWatched = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Continue Watching"
        description="Resume watching your movies and TV shows where you left off on StreamVault."
        canonical="https://streamvault.live/continue-watching"
      />
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Continue Watching</h1>
          </div>
          <p className="text-muted-foreground">Pick up where you left off</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {inProgressItems.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No items in progress</h2>
            <p className="text-muted-foreground mb-6">
              Start watching shows and movies to see them here
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/browse/shows">
                <a className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  <Tv className="w-5 h-5" />
                  Browse Shows
                </a>
              </Link>
              <Link href="/browse/movies">
                <a className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors">
                  <Film className="w-5 h-5" />
                  Browse Movies
                </a>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {inProgressItems.map((item, index) => (
              <ProgressItem
                key={index}
                item={item}
                shows={shows}
                movies={movies}
                animeList={animeList}
                formatTime={formatTime}
                formatLastWatched={formatLastWatched}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Progress Item Component
function ProgressItem({
  item,
  shows,
  movies,
  animeList,
  formatTime,
  formatLastWatched,
}: {
  item: ProgressEntry;
  shows: Show[];
  movies: Movie[];
  animeList: Anime[];
  formatTime: (seconds: number) => string;
  formatLastWatched: (dateString: string) => string;
}) {
  // Fetch episodes for this show if needed
  const { data: episodes = [] } = useQuery<Episode[]>({
    queryKey: [`/api/episodes/${item.showId}`],
    enabled: !!item.showId && !!item.episodeId,
  });

  if (item.movieId) {
    const movie = movies.find(m => m.id === item.movieId);
    if (!movie) return null;

    const percentage = (item.progress / item.duration) * 100;
    const remaining = item.duration - item.progress;

    return (
      <Link href={`/watch-movie/${movie.slug}`}>
        <Card className="group cursor-pointer hover:border-primary transition-all duration-300 overflow-hidden">
          <div className="relative aspect-[2/3] overflow-hidden">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </div>

            {/* Type Badge */}
            <div className="absolute top-2 right-2">
              <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
                <Film className="w-3 h-3" />
                <span className="text-xs font-medium">Movie</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
              <Progress value={percentage} className="h-1.5 mb-2" />
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium">{Math.round(percentage)}%</span>
                <span className="text-muted-foreground">
                  {formatTime(remaining)} left
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {movie.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              {movie.year}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatLastWatched(item.lastWatched)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  } else if (item.showId && item.episodeId) {
    const show = shows.find(s => s.id === item.showId);
    const episode = episodes.find((e: Episode) => e.id === item.episodeId);
    if (!show || !episode) return null;

    const percentage = (item.progress / item.duration) * 100;
    const remaining = item.duration - item.progress;

    return (
      <Link href={`/watch/${show.slug}?season=${episode.season}&episode=${episode.episodeNumber}`}>
        <Card className="group cursor-pointer hover:border-primary transition-all duration-300 overflow-hidden">
          <div className="relative aspect-[2/3] overflow-hidden">
            <img
              src={show.posterUrl}
              alt={show.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </div>

            {/* Type Badge */}
            <div className="absolute top-2 right-2">
              <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
                <Tv className="w-3 h-3" />
                <span className="text-xs font-medium">Episode</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
              <Progress value={percentage} className="h-1.5 mb-2" />
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium">{Math.round(percentage)}%</span>
                <span className="text-muted-foreground">
                  {formatTime(remaining)} left
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {show.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              S{episode.season}E{episode.episodeNumber}: {episode.title}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatLastWatched(item.lastWatched)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  } else if (item.animeId && item.episodeId) {
    const animeItem = animeList.find(a => a.id === item.animeId);
    if (!animeItem) return null;

    const percentage = (item.progress / item.duration) * 100;
    const remaining = item.duration - item.progress;

    return (
      <Link href={`/watch-anime/${animeItem.slug}?s=${item.season || 1}&e=${item.episodeNumber || 1}`}>
        <Card className="group cursor-pointer hover:border-primary transition-all duration-300 overflow-hidden">
          <div className="relative aspect-[2/3] overflow-hidden">
            <img
              src={animeItem.posterUrl}
              alt={animeItem.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </div>

            {/* Type Badge */}
            <div className="absolute top-2 right-2">
              <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span className="text-xs font-medium">Anime</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
              <Progress value={percentage} className="h-1.5 mb-2" />
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium">{Math.round(percentage)}%</span>
                <span className="text-muted-foreground">
                  {formatTime(remaining)} left
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
              {animeItem.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              S{item.season || 1}E{item.episodeNumber || 1}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatLastWatched(item.lastWatched)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return null;
}
