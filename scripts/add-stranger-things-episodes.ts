import { storage } from "../server/storage.js";
import { readFileSync } from "fs";
import { config } from "dotenv";

// Load environment variables
config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface EpisodeData {
  episode: number;
  episode_url: string;
  google_drive_link: string;
}

interface SeasonData {
  [key: string]: EpisodeData[];
}

interface TMDBEpisode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  air_date: string;
}

interface TMDBSeason {
  episodes: TMDBEpisode[];
}

// Fetch season details from TMDB
async function fetchSeasonDetails(tmdbId: number, seasonNumber: number): Promise<TMDBSeason | null> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🎬 Adding Stranger Things episodes with Google Drive links...\n');

  try {
    // Read the JSON file
    const jsonData = readFileSync('C:\\Users\\yawar\\Desktop\\stranger-things.json', 'utf-8');
    const episodesData: SeasonData = JSON.parse(jsonData);

    // Find Stranger Things show
    const shows = await storage.getAllShows();
    const strangerThings = shows.find(s => s.title.toLowerCase().includes('stranger things'));

    if (!strangerThings) {
      console.error('❌ Stranger Things show not found in database');
      process.exit(1);
    }

    console.log(`✅ Found show: ${strangerThings.title} (ID: ${strangerThings.id})\n`);

    // TMDB ID for Stranger Things
    const TMDB_ID = 66732;

    let totalUpdated = 0;
    let totalCreated = 0;
    let totalSkipped = 0;

    // Process each season
    for (const [seasonKey, episodes] of Object.entries(episodesData)) {
      const seasonNumber = parseInt(seasonKey.replace('Season ', ''));
      console.log(`\n📺 Processing Season ${seasonNumber}...`);

      // Fetch TMDB data for this season
      const tmdbSeason = await fetchSeasonDetails(TMDB_ID, seasonNumber);
      
      if (!tmdbSeason) {
        console.log(`   ⚠️  Could not fetch TMDB data for Season ${seasonNumber}`);
        continue;
      }

      // Get existing episodes for this season
      const existingEpisodes = await storage.getEpisodesByShowId(strangerThings.id);
      const seasonEpisodes = existingEpisodes.filter(e => e.season === seasonNumber);

      // Process each episode
      for (const episodeData of episodes) {
        const episodeNumber = episodeData.episode;
        
        // Find TMDB data for this episode
        const tmdbEpisode = tmdbSeason.episodes.find(e => e.episode_number === episodeNumber);
        
        if (!tmdbEpisode) {
          console.log(`   ⚠️  S${seasonNumber}E${episodeNumber}: No TMDB data found`);
          totalSkipped++;
          continue;
        }

        // Check if episode already exists
        const existingEpisode = seasonEpisodes.find(e => e.episodeNumber === episodeNumber);

        const episodePayload = {
          showId: strangerThings.id,
          season: seasonNumber,
          episodeNumber: episodeNumber,
          episode: episodeNumber, // Add this field for compatibility
          title: tmdbEpisode.name,
          description: tmdbEpisode.overview || `Season ${seasonNumber}, Episode ${episodeNumber}`,
          duration: tmdbEpisode.runtime || 50, // Default to 50 minutes if not available
          releaseDate: tmdbEpisode.air_date || '',
          videoUrl: episodeData.google_drive_link,
          thumbnailUrl: tmdbEpisode.still_path 
            ? `${TMDB_IMAGE_BASE}/w500${tmdbEpisode.still_path}`
            : strangerThings.thumbnail || '',
        };

        if (existingEpisode) {
          // Update existing episode
          await storage.updateEpisode(existingEpisode.id, episodePayload);
          console.log(`   ✅ Updated S${seasonNumber}E${episodeNumber}: ${tmdbEpisode.name}`);
          totalUpdated++;
        } else {
          // Create new episode
          await storage.createEpisode(episodePayload);
          console.log(`   ✨ Created S${seasonNumber}E${episodeNumber}: ${tmdbEpisode.name}`);
          totalCreated++;
        }
      }

      // Rate limit between seasons
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log('\n✅ Stranger Things episodes update complete!');
    console.log(`   Episodes created: ${totalCreated}`);
    console.log(`   Episodes updated: ${totalUpdated}`);
    console.log(`   Episodes skipped: ${totalSkipped}`);
    console.log(`   Total processed: ${totalCreated + totalUpdated + totalSkipped}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
