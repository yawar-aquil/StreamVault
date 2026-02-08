import { storage } from "../server/storage.js";
import { config } from "dotenv";

// Load environment variables
config();

// TMDB API Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  genres: Array<{ id: number; name: string }>;
  original_language: string;
  content_ratings?: {
    results: Array<{ iso_3166_1: string; rating: string }>;
  };
  aggregate_credits?: {
    cast: Array<{ name: string; total_episode_count: number }>;
  };
}

// Map TMDB genres to your categories
function mapGenreToCategory(genres: string[]): string {
  const genreLower = genres.map(g => g.toLowerCase());
  
  if (genreLower.some(g => g.includes('action') || g.includes('adventure'))) return 'action';
  if (genreLower.some(g => g.includes('drama'))) return 'drama';
  if (genreLower.some(g => g.includes('comedy'))) return 'comedy';
  if (genreLower.some(g => g.includes('horror') || g.includes('thriller'))) return 'horror';
  if (genreLower.some(g => g.includes('romance'))) return 'romance';
  if (genreLower.some(g => g.includes('sci-fi') || g.includes('science fiction'))) return 'sci-fi';
  if (genreLower.some(g => g.includes('fantasy'))) return 'fantasy';
  if (genreLower.some(g => g.includes('documentary'))) return 'documentary';
  if (genreLower.some(g => g.includes('animation'))) return 'animation';
  
  return 'drama'; // Default
}

// Map TMDB rating to TV rating
function mapContentRating(tmdbRating: string): string {
  const ratingMap: Record<string, string> = {
    'TV-Y': 'TV-Y',
    'TV-Y7': 'TV-Y7',
    'TV-G': 'TV-G',
    'TV-PG': 'TV-PG',
    'TV-14': 'TV-14',
    'TV-MA': 'TV-MA',
    'G': 'TV-G',
    'PG': 'TV-PG',
    'PG-13': 'TV-14',
    'R': 'TV-MA',
    'NC-17': 'TV-MA',
  };
  
  return ratingMap[tmdbRating] || 'TV-14';
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Fetch show details from TMDB
async function fetchTMDBShow(tmdbId: number): Promise<TMDBShow | null> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=content_ratings,aggregate_credits`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch TMDB show ${tmdbId}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Error fetching TMDB show ${tmdbId}:`, error);
    return null;
  }
}

// Search TMDB by show title
async function searchTMDBShow(title: string): Promise<number | null> {
  try {
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`❌ Failed to search TMDB for "${title}": ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error searching TMDB for "${title}":`, error);
    return null;
  }
}

// Update a single show
async function updateShow(show: any, tmdbData: TMDBShow) {
  try {
    // Extract data from TMDB
    const title = tmdbData.name;
    const slug = generateSlug(title);
    const year = tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.split('-')[0]) : new Date().getFullYear();
    const description = tmdbData.overview || `${title} - Watch online free on StreamVault`;
    const imdbRating = tmdbData.vote_average ? tmdbData.vote_average.toFixed(1) : "7.5";
    const totalSeasons = tmdbData.number_of_seasons || 1;
    
    // Get genres
    const genreNames = tmdbData.genres.map(g => g.name);
    const category = mapGenreToCategory(genreNames);
    
    // Get rating (US rating preferred)
    let rating = 'TV-14'; // Default
    if (tmdbData.content_ratings?.results) {
      const usRating = tmdbData.content_ratings.results.find(r => r.iso_3166_1 === 'US');
      if (usRating) {
        rating = mapContentRating(usRating.rating);
      }
    }
    
    // Get cast (top 5)
    let cast: string[] = [];
    if (tmdbData.aggregate_credits?.cast) {
      cast = tmdbData.aggregate_credits.cast
        .sort((a, b) => b.total_episode_count - a.total_episode_count)
        .slice(0, 5)
        .map(c => c.name);
    }
    
    // Get language
    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'hi': 'Hindi',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
    };
    const language = languageMap[tmdbData.original_language] || 'English';
    
    // Update the show using storage
    await storage.updateShow(show.id, {
      title,
      slug,
      year,
      category: category as any,
      description,
      rating,
      imdbRating,
      totalSeasons,
      genres: genreNames,
      language,
      cast,
      // Keep existing values for fields we don't update
      posterUrl: show.posterUrl,
      backdropUrl: show.backdropUrl,
      featured: show.featured,
      trending: show.trending,
      creators: show.creators,
    });
    
    console.log(`✅ Updated: ${title}`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Year: ${year}`);
    console.log(`   Category: ${category}`);
    console.log(`   Rating: ${rating}`);
    console.log(`   IMDb: ${imdbRating}`);
    console.log(`   Seasons: ${totalSeasons}`);
    console.log(`   Genres: ${genreNames.join(', ')}`);
    console.log(`   Language: ${language}`);
    console.log(`   Cast: ${cast.join(', ')}`);
    console.log('');
    
  } catch (error) {
    console.error(`❌ Error updating show ${show.id}:`, error);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting TMDB show update...\n');
  
  if (TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
    console.error('❌ Please set TMDB_API_KEY environment variable');
    console.error('   Get your API key from: https://www.themoviedb.org/settings/api');
    process.exit(1);
  }
  
  try {
    // Get all shows from storage
    const allShows = await storage.getAllShows();
    console.log(`📊 Found ${allShows.length} shows in database\n`);
    console.log(`🚀 Starting full update of all ${allShows.length} shows...\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const show of allShows) {
      console.log(`🔍 Processing: ${show.title}`);
      
      // Search for show on TMDB
      const tmdbId = await searchTMDBShow(show.title);
      
      if (!tmdbId) {
        console.log(`⚠️  Could not find "${show.title}" on TMDB\n`);
        failed++;
        continue;
      }
      
      // Fetch show details
      const tmdbData = await fetchTMDBShow(tmdbId);
      
      if (!tmdbData) {
        console.log(`⚠️  Could not fetch data for "${show.title}"\n`);
        failed++;
        continue;
      }
      
      // Update show
      await updateShow(show, tmdbData);
      updated++;
      
      // Rate limit: Wait 250ms between requests (4 requests per second)
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    console.log('\n✅ Update complete!');
    console.log(`   Updated: ${updated} shows`);
    console.log(`   Failed: ${failed} shows`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
