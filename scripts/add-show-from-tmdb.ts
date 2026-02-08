import { storage } from "../server/storage.js";
import { config } from "dotenv";

// Load environment variables
config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Array<{ id: number; name: string }>;
  number_of_seasons: number;
  content_ratings: {
    results: Array<{ iso_3166_1: string; rating: string }>;
  };
  aggregate_credits: {
    cast: Array<{ name: string; total_episode_count: number }>;
  };
  original_language: string;
  vote_average: number;
}

// Genre mapping from TMDB to local categories
const genreMapping: { [key: string]: string } = {
  "Action & Adventure": "action",
  "Sci-Fi & Fantasy": "sci-fi",
  "Drama": "drama",
  "Comedy": "comedy",
  "Crime": "crime",
  "Mystery": "mystery",
  "Thriller": "thriller",
  "Horror": "horror",
  "Romance": "romance",
  "Animation": "animation",
  "Documentary": "documentary",
  "Family": "family",
};

// Rating mapping
const ratingMapping: { [key: string]: string } = {
  "TV-Y": "TV-Y",
  "TV-Y7": "TV-Y7",
  "TV-G": "TV-G",
  "TV-PG": "TV-PG",
  "TV-14": "TV-14",
  "TV-MA": "TV-MA",
  "NR": "NR",
};

// Search TMDB by show title
async function searchTMDBShow(title: string): Promise<number | null> {
  try {
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      console.log(`\n🔍 Found ${data.results.length} results:`);
      data.results.slice(0, 5).forEach((show: any, index: number) => {
        console.log(`   ${index + 1}. ${show.name} (${show.first_air_date?.split('-')[0] || 'N/A'})`);
      });
      return data.results[0].id;
    }
    
    return null;
  } catch (error) {
    console.error("Error searching TMDB:", error);
    return null;
  }
}

// Fetch detailed show data from TMDB
async function fetchTMDBShow(tmdbId: number): Promise<TMDBShow | null> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=content_ratings,aggregate_credits`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Map TMDB genres to category
function mapGenresToCategory(genres: Array<{ name: string }>): string {
  for (const genre of genres) {
    const mapped = genreMapping[genre.name];
    if (mapped) return mapped;
  }
  return "drama"; // default
}

// Get TV rating
function getTVRating(contentRatings: any): string {
  if (!contentRatings?.results) return "NR";
  
  // Prefer US rating
  const usRating = contentRatings.results.find((r: any) => r.iso_3166_1 === "US");
  if (usRating && ratingMapping[usRating.rating]) {
    return usRating.rating;
  }
  
  return "NR";
}

// Get language name
function getLanguageName(code: string): string {
  const languages: { [key: string]: string } = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "hi": "Hindi",
    "pt": "Portuguese",
    "ru": "Russian",
    "ar": "Arabic",
  };
  return languages[code] || "English";
}

// Add show to storage
async function addShow(showTitle: string) {
  console.log(`\n🎬 Adding show: ${showTitle}\n`);
  
  // Search for show on TMDB
  const tmdbId = await searchTMDBShow(showTitle);
  
  if (!tmdbId) {
    console.error(`❌ Could not find "${showTitle}" on TMDB`);
    return;
  }
  
  console.log(`\n✅ Using TMDB ID: ${tmdbId}`);
  
  // Fetch show details
  const tmdbData = await fetchTMDBShow(tmdbId);
  
  if (!tmdbData) {
    console.error(`❌ Could not fetch data for "${showTitle}"`);
    return;
  }
  
  // Extract data
  const title = tmdbData.name;
  const slug = generateSlug(title);
  const year = tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.split("-")[0]) : new Date().getFullYear();
  const category = mapGenresToCategory(tmdbData.genres);
  const description = tmdbData.overview || "";
  const rating = getTVRating(tmdbData.content_ratings);
  const imdbRating = tmdbData.vote_average ? parseFloat(tmdbData.vote_average.toFixed(1)) : 0;
  const totalSeasons = tmdbData.number_of_seasons || 1;
  const genres = tmdbData.genres.map(g => g.name).join(", ");
  const language = getLanguageName(tmdbData.original_language);
  
  // Get top cast (up to 5)
  const cast = tmdbData.aggregate_credits?.cast
    ?.sort((a, b) => b.total_episode_count - a.total_episode_count)
    .slice(0, 5)
    .map(c => c.name)
    .join(", ") || "";
  
  // Build image URLs
  const posterUrl = tmdbData.poster_path 
    ? `${TMDB_IMAGE_BASE}/w500${tmdbData.poster_path}`
    : "";
  
  const backdropUrl = tmdbData.backdrop_path
    ? `${TMDB_IMAGE_BASE}/original${tmdbData.backdrop_path}`
    : "";
  
  // Create show object
  const newShow = {
    title,
    slug,
    year,
    category,
    description,
    rating,
    imdbRating,
    totalSeasons,
    genres,
    language,
    cast,
    posterUrl,
    backdropUrl,
    featured: false,
    trending: false,
    creators: "",
  };
  
  // Add to storage
  await storage.createShow(newShow);
  
  console.log(`\n✅ Successfully added show!`);
  console.log(`\n📋 Show Details:`);
  console.log(`   Title: ${title}`);
  console.log(`   Slug: ${slug}`);
  console.log(`   Year: ${year}`);
  console.log(`   Category: ${category}`);
  console.log(`   Rating: ${rating}`);
  console.log(`   IMDb: ${imdbRating}`);
  console.log(`   Seasons: ${totalSeasons}`);
  console.log(`   Genres: ${genres}`);
  console.log(`   Language: ${language}`);
  console.log(`   Cast: ${cast}`);
  console.log(`   Poster: ${posterUrl}`);
  console.log(`   Backdrop: ${backdropUrl}`);
  console.log(`\n💾 Data saved to file`);
}

// Main function
async function main() {
  console.log('🎬 TMDB Show Adder\n');
  
  if (TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
    console.error('❌ Please set TMDB_API_KEY environment variable');
    process.exit(1);
  }
  
  // Get show title from command line or use default
  const showTitle = process.argv[2] || "Welcome to Derry";
  
  try {
    await addShow(showTitle);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
