import { storage } from "../server/storage.js";
import { config } from "dotenv";

// Load environment variables
config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// Shows to EXCLUDE from image updates (keep their current images)
const EXCLUDED_SHOWS = [
  "Stranger Things",
  "Breaking Bad",
  "The Crown",
  "Money Heist",
  "The Office",
  "Dark",
  "Peaky Blinders",
  "Narcos",
  "The Witcher",
  "Friends",
  "Game of Thrones",
  "House of the Dragon",
  "Sherlock: The Russian Chronicles",
  "Love Puzzle",
  "Wedding Impossible",
  "The Deceived",
  "Big Mouth",
  "Exploration Method of Love",
  "I Can See You Shine",
  "Snowfall",
  "Lover or Stranger",
  "Lawless Lawyer",
  "Fake It Till You Make It",
  "Pride and Prejudice",
  "Victor Lessard",
  "Life",
  "Over Water",
  "Wenderella's Diary",
  "The Divorce Insurance",
  "The Ba***ds of Bollywood",
  "Olympo"
];

interface TMDBShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

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
      return data.results[0].id;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Fetch show details from TMDB
async function fetchTMDBShow(tmdbId: number): Promise<TMDBShow | null> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Update show images
async function updateShowImages(show: any, tmdbData: TMDBShow) {
  try {
    // Build image URLs
    const posterUrl = tmdbData.poster_path 
      ? `${TMDB_IMAGE_BASE}/w500${tmdbData.poster_path}`
      : show.posterUrl; // Keep existing if no new poster
    
    const backdropUrl = tmdbData.backdrop_path
      ? `${TMDB_IMAGE_BASE}/original${tmdbData.backdrop_path}`
      : show.backdropUrl; // Keep existing if no new backdrop
    
    // Update only the image URLs, keep everything else
    await storage.updateShow(show.id, {
      posterUrl,
      backdropUrl,
      // Keep all other fields unchanged
      title: show.title,
      slug: show.slug,
      year: show.year,
      category: show.category,
      description: show.description,
      rating: show.rating,
      imdbRating: show.imdbRating,
      totalSeasons: show.totalSeasons,
      genres: show.genres,
      language: show.language,
      cast: show.cast,
      featured: show.featured,
      trending: show.trending,
      creators: show.creators,
    });
    
    console.log(`✅ Updated images: ${show.title}`);
    console.log(`   Poster: ${posterUrl}`);
    console.log(`   Backdrop: ${backdropUrl}`);
    console.log('');
    
  } catch (error) {
    console.error(`❌ Error updating images for ${show.title}:`, error);
  }
}

// Main function
async function main() {
  console.log('🎨 Starting TMDB image update...\n');
  
  if (TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
    console.error('❌ Please set TMDB_API_KEY environment variable');
    process.exit(1);
  }
  
  try {
    // Get all shows from storage
    const allShows = await storage.getAllShows();
    console.log(`📊 Found ${allShows.length} shows in database`);
    console.log(`🚫 Excluding ${EXCLUDED_SHOWS.length} shows from updates\n`);
    
    // Filter out excluded shows
    const showsToUpdate = allShows.filter(show => !EXCLUDED_SHOWS.includes(show.title));
    console.log(`🎯 Will update ${showsToUpdate.length} shows\n`);
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const show of showsToUpdate) {
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
      
      // Check if show has images
      if (!tmdbData.poster_path && !tmdbData.backdrop_path) {
        console.log(`⚠️  No images available for "${show.title}"\n`);
        skipped++;
        continue;
      }
      
      // Update show images
      await updateShowImages(show, tmdbData);
      updated++;
      
      // Rate limit: Wait 250ms between requests (4 requests per second)
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    console.log('\n✅ Image update complete!');
    console.log(`   Updated: ${updated} shows`);
    console.log(`   Skipped: ${skipped} shows (no images)`);
    console.log(`   Failed: ${failed} shows`);
    console.log(`   Excluded: ${EXCLUDED_SHOWS.length} shows (kept original images)`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
