import { storage } from "../server/storage.js";
import { config } from "dotenv";

// Load environment variables
config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TMDBEpisode {
  episode_number: number;
  still_path: string | null;
}

interface TMDBSeason {
  episodes: TMDBEpisode[];
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

// Fetch season details with episode thumbnails
async function fetchSeasonDetails(tmdbId: number, seasonNumber: number): Promise<TMDBSeason | null> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Update episode thumbnails for a show
async function updateShowEpisodeThumbnails(show: any, tmdbId: number) {
  try {
    const episodes = await storage.getEpisodesByShowId(show.id);
    
    if (episodes.length === 0) {
      console.log(`   No episodes found for ${show.title}`);
      return { updated: 0, skipped: 0 };
    }
    
    // Group episodes by season
    const episodesBySeason = new Map<number, any[]>();
    for (const episode of episodes) {
      if (!episodesBySeason.has(episode.season)) {
        episodesBySeason.set(episode.season, []);
      }
      episodesBySeason.get(episode.season)!.push(episode);
    }
    
    let updated = 0;
    let skipped = 0;
    
    // Process each season
    for (const [seasonNumber, seasonEpisodes] of episodesBySeason) {
      console.log(`   Fetching Season ${seasonNumber}...`);
      
      const seasonData = await fetchSeasonDetails(tmdbId, seasonNumber);
      
      if (!seasonData) {
        console.log(`   ⚠️  Could not fetch Season ${seasonNumber} data`);
        skipped += seasonEpisodes.length;
        continue;
      }
      
      // Update each episode
      for (const episode of seasonEpisodes) {
        // Skip if episode already has a thumbnail
        if (episode.thumbnail && episode.thumbnail.trim() !== '') {
          skipped++;
          continue;
        }
        
        const tmdbEpisode = seasonData.episodes.find(
          (e: TMDBEpisode) => e.episode_number === episode.episode
        );
        
        if (tmdbEpisode && tmdbEpisode.still_path) {
          const thumbnailUrl = `${TMDB_IMAGE_BASE}/w500${tmdbEpisode.still_path}`;
          
          await storage.updateEpisode(episode.id, {
            ...episode,
            thumbnail: thumbnailUrl,
          });
          
          updated++;
        } else {
          skipped++;
        }
      }
      
      // Rate limit between seasons
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    return { updated, skipped };
  } catch (error) {
    console.error(`   ❌ Error updating episodes:`, error);
    return { updated: 0, skipped: 0 };
  }
}

// Main function
async function main() {
  console.log('🎬 Starting episode thumbnail update...\n');
  
  if (TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
    console.error('❌ Please set TMDB_API_KEY environment variable');
    process.exit(1);
  }
  
  try {
    // Get all shows from storage
    const allShows = await storage.getAllShows();
    console.log(`📊 Found ${allShows.length} shows in database\n`);
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    let showsProcessed = 0;
    let showsFailed = 0;
    
    for (const show of allShows) {
      console.log(`🔍 Processing: ${show.title}`);
      
      // Search for show on TMDB
      const tmdbId = await searchTMDBShow(show.title);
      
      if (!tmdbId) {
        console.log(`   ⚠️  Could not find on TMDB\n`);
        showsFailed++;
        continue;
      }
      
      // Update episode thumbnails
      const { updated, skipped } = await updateShowEpisodeThumbnails(show, tmdbId);
      
      if (updated > 0) {
        console.log(`   ✅ Updated ${updated} episode(s), skipped ${skipped}`);
        console.log('   💾 Data saved to file\n');
      } else {
        console.log(`   ⚠️  No thumbnails updated (skipped ${skipped})\n`);
      }
      
      totalUpdated += updated;
      totalSkipped += skipped;
      showsProcessed++;
      
      // Rate limit between shows
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    console.log('\n✅ Episode thumbnail update complete!');
    console.log(`   Shows processed: ${showsProcessed}`);
    console.log(`   Shows failed: ${showsFailed}`);
    console.log(`   Episodes updated: ${totalUpdated}`);
    console.log(`   Episodes skipped: ${totalSkipped}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
