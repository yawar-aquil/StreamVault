import { Link, useLocation } from "wouter";
import { Play, Plus, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Movie } from "@shared/schema";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MovieCardProps {
  movie: Movie;
  orientation?: "portrait" | "landscape";
}

export function MovieCard({
  movie,
  orientation = "portrait",
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: watchlist = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
  });

  const isInWatchlist = watchlist.some((item) => item.movieId === movie.id);

  const addToWatchlistMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/watchlist", {
        movieId: movie.id,
        addedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/watchlist/movie/${movie.id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isInWatchlist) {
      removeFromWatchlistMutation.mutate();
    } else {
      addToWatchlistMutation.mutate();
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(`/watch-movie/${movie.slug}`);
  };

  const imageUrl = orientation === "portrait" ? movie.posterUrl : movie.backdropUrl;
  const aspectRatio = orientation === "portrait" ? "aspect-[2/3]" : "aspect-video";

  return (
    <Link href={`/movie/${movie.slug}`}>
      <div
        className="group relative overflow-visible cursor-pointer hover:z-50 transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`relative ${aspectRatio} rounded-md overflow-hidden bg-muted transition-all duration-300 ${isHovered ? "scale-105 shadow-xl" : ""
            }`}
        >
          {/* Poster Image */}
          <img
            src={imageUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Hover Overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"
              }`}
          >
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              {/* Title */}
              <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                {movie.title}
              </h3>

              {/* Meta Info */}
              <div className="flex items-center gap-2 text-xs text-white/80 mb-3">
                <span>{movie.year}</span>
                <span>•</span>
                <span>{movie.duration}m</span>
                {movie.imdbRating && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{movie.imdbRating}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={handlePlayClick}
                >
                  <Play className="w-4 h-4" />
                  Play
                </Button>
                <Button
                  size="sm"
                  variant={isInWatchlist ? "secondary" : "outline"}
                  className="px-2"
                  onClick={toggleWatchlist}
                >
                  {isInWatchlist ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Title below poster */}
        <div className="mt-2 text-center">
          <h3 className="font-medium text-sm line-clamp-1">{movie.title}</h3>
          <p className="text-xs text-muted-foreground">{movie.year}</p>
        </div>
      </div>
    </Link>
  );
}
