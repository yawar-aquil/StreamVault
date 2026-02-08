import { storage } from "../server/storage.js";
import { config } from "dotenv";

// Load environment variables
config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

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
    console.log(`   Fetching: ${url.replace(TMDB_API_KEY, 'API_KEY')}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`   API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Response: ${errorText.substring(0, 200)}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`   Fetch error:`, error);
    return null;
  }
}

async function main() {
  console.log('🎬 Updating Berlin episodes with TMDB metadata...\n');

  try {
    // Find the existing Berlin show
    const shows = await storage.getAllShows();
    const berlinShow = shows.find(s => s.title.toLowerCase().includes('berlin'));

    if (!berlinShow) {
      console.error('❌ Berlin show not found in database');
      process.exit(1);
    }

    console.log(`✅ Found show: ${berlinShow.title} (ID: ${berlinShow.id})\n`);

    // Use the correct TMDB ID for Berlin (2023) - Money Heist spin-off
    const tmdbId = 146176;
    console.log(`📥 Fetching TMDB data for Berlin (ID: ${tmdbId})...\n`);

    // Fetch Season 1 details
    const tmdbSeason = await fetchSeasonDetails(tmdbId, 1);
    
    if (!tmdbSeason || !tmdbSeason.episodes) {
      console.error('❌ Could not fetch TMDB season data');
      console.log('\n💡 Episodes were created with basic info. They have video links and are watchable.');
      process.exit(0);
    }

    console.log(`✅ Fetched ${tmdbSeason.episodes.length} episodes from TMDB\n`);

    // Get existing episodes
    const existingEpisodes = await storage.getEpisodesByShowId(berlinShow.id);
    const season1Episodes = existingEpisodes.filter(e => e.season === 1);

    console.log(`📺 Found ${season1Episodes.length} existing episodes in database\n`);

    let updated = 0;

    // Update each episode with TMDB data
    for (const episode of season1Episodes) {
      const tmdbEpisode = tmdbSeason.episodes.find(e => e.episode_number === episode.episodeNumber);
      
      if (!tmdbEpisode) {
        console.log(`   ⚠️  No TMDB data for Episode ${episode.episodeNumber}`);
        continue;
      }

      const updatePayload = {
        ...episode,
        title: tmdbEpisode.name,
        description: tmdbEpisode.overview || episode.description,
        duration: tmdbEpisode.runtime || episode.duration,
        releaseDate: tmdbEpisode.air_date || episode.releaseDate,
        thumbnailUrl: tmdbEpisode.still_path 
          ? `${TMDB_IMAGE_BASE}/w500${tmdbEpisode.still_path}`
          : episode.thumbnailUrl,
      };

      await storage.updateEpisode(episode.id, updatePayload);
      console.log(`   ✅ Updated S1E${episode.episodeNumber}: ${tmdbEpisode.name}`);
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} episodes with TMDB metadata!`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
