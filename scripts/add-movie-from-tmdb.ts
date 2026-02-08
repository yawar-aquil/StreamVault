import { storage } from "../server/storage.js";

const TMDB_API_KEY = "920654cb695ee99175e53d6da8dc2edf";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
  spoken_languages: { english_name: string }[];
}

interface TMDBCredits {
  cast: { name: string }[];
  crew: { name: string; job: string }[];
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      console.log(`⚠️  Retry ${i + 1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function searchMovie(query: string) {
  const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const data = await fetchWithRetry(url);
  return data.results;
}

async function getMovieDetails(movieId: number): Promise<TMDBMovie> {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
  return await fetchWithRetry(url);
}

async function getMovieCredits(movieId: number): Promise<TMDBCredits> {
  const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
  return await fetchWithRetry(url);
}

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRating(voteAverage: number): string {
  if (voteAverage >= 8) return "R";
  if (voteAverage >= 6) return "PG-13";
  return "PG";
}

async function addMovieFromTMDB(movieTitle: string, googleDriveUrl: string) {
  console.log(`\n🎬 Searching for "${movieTitle}" on TMDB...\n`);

  try {
    // Search for the movie
    const searchResults = await searchMovie(movieTitle);
    
    if (!searchResults || searchResults.length === 0) {
      console.error("❌ No movies found with that title");
      process.exit(1);
    }

  // Show search results
  console.log("📋 Found movies:");
  searchResults.slice(0, 5).forEach((movie: any, index: number) => {
    console.log(`${index + 1}. ${movie.title} (${movie.release_date?.split('-')[0] || 'N/A'})`);
  });

  // Use the first result (most relevant)
  const selectedMovie = searchResults[0];
  console.log(`\n✅ Selected: ${selectedMovie.title}\n`);

  // Get detailed information
  const movieDetails = await getMovieDetails(selectedMovie.id);
  const credits = await getMovieCredits(selectedMovie.id);

  // Extract data
  const title = movieDetails.title;
  const slug = createSlug(title);
  const description = movieDetails.overview || "No description available.";
  const posterUrl = movieDetails.poster_path
    ? `${TMDB_IMAGE_BASE}${movieDetails.poster_path}`
    : "";
  const backdropUrl = movieDetails.backdrop_path
    ? `${TMDB_IMAGE_BASE}${movieDetails.backdrop_path}`
    : "";
  const year = parseInt(movieDetails.release_date?.split("-")[0] || "2024");
  const rating = getRating(movieDetails.vote_average);
  const imdbRating = movieDetails.vote_average.toFixed(1);
  const genres = movieDetails.genres.map((g) => g.name).join(", ");
  const language = movieDetails.spoken_languages[0]?.english_name || "English";
  const duration = movieDetails.runtime || 120;
  const cast = credits.cast
    .slice(0, 10)
    .map((c) => c.name)
    .join(", ");
  const directors = credits.crew
    .filter((c) => c.job === "Director")
    .map((c) => c.name)
    .join(", ");

  // Check if movie already exists
  const existingMovie = await storage.getMovieBySlug(slug);
  if (existingMovie) {
    console.log(`⚠️  Movie "${title}" already exists!`);
    console.log(`   Slug: ${slug}`);
    process.exit(1);
  }

  // Create the movie
  console.log("📝 Movie Details:");
  console.log(`   Title: ${title}`);
  console.log(`   Year: ${year}`);
  console.log(`   Duration: ${duration} min`);
  console.log(`   Rating: ${rating}`);
  console.log(`   IMDb: ${imdbRating}`);
  console.log(`   Genres: ${genres}`);
  console.log(`   Language: ${language}`);
  console.log(`   Cast: ${cast.substring(0, 50)}...`);
  console.log(`   Directors: ${directors}`);
  console.log(`   Google Drive URL: ${googleDriveUrl}\n`);

  const movie = await storage.createMovie({
    title,
    slug,
    description,
    posterUrl,
    backdropUrl,
    year,
    rating,
    imdbRating,
    genres,
    language,
    duration,
    cast,
    directors,
    googleDriveUrl,
    featured: false,
    trending: false,
    category: genres.toLowerCase().includes("action") ? "action" : null,
  });

  console.log("✅ Movie added successfully!");
  console.log(`   ID: ${movie.id}`);
  console.log(`   Slug: ${movie.slug}`);
  console.log(`   URL: http://localhost:5000/movie/${movie.slug}\n`);
  } catch (error: any) {
    console.error("\n❌ Error adding movie:");
    console.error(`   ${error.message}\n`);
    if (error.cause) {
      console.error(`   Cause: ${error.cause}\n`);
    }
    process.exit(1);
  }
}

// Get command line arguments
const movieTitle = process.argv[2];
const googleDriveUrl = process.argv[3];

if (!movieTitle || !googleDriveUrl) {
  console.log("\n❌ Usage: npm run add-movie \"Movie Title\" \"Google Drive URL\"\n");
  console.log("Example:");
  console.log('  npm run add-movie "Inception" "https://drive.google.com/file/d/xxx/preview"\n');
  process.exit(1);
}

addMovieFromTMDB(movieTitle, googleDriveUrl);
