import { storage } from "../server/storage.js";
import { config } from "dotenv";

// Load environment variables
config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

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

async function main() {
  console.log('🔍 Checking which shows failed to find on TMDB...\n');
  
  const allShows = await storage.getAllShows();
  const failedShows: string[] = [];
  
  for (const show of allShows) {
    const tmdbId = await searchTMDBShow(show.title);
    
    if (!tmdbId) {
      failedShows.push(show.title);
      console.log(`❌ ${show.title}`);
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total shows: ${allShows.length}`);
  console.log(`   Failed: ${failedShows.length}`);
  console.log(`\n❌ Failed shows:`);
  failedShows.forEach(title => console.log(`   - ${title}`));
}

main();
