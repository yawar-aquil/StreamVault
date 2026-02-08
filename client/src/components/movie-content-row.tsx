import { MovieCard } from "@/components/movie-card";
import type { Movie } from "@shared/schema";

interface MovieContentRowProps {
  title: string;
  movies: Movie[];
  orientation?: "portrait" | "landscape";
}

export function MovieContentRow({
  title,
  movies,
  orientation = "portrait",
}: MovieContentRowProps) {
  if (movies.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold px-4">{title}</h2>
      <div className="relative group">
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-hide scroll-smooth">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className={`flex-shrink-0 ${
                orientation === "landscape" ? "w-80" : "w-48"
              }`}
            >
              <MovieCard movie={movie} orientation={orientation} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
