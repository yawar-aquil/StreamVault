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
      console.error(`   API Error: ${response.status} ${response.statusText}`);
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
  console.log('🎬 Adding Berlin episodes...\n');

  try {
    // Read the JSON file
    const jsonData = readFileSync('C:\\Users\\yawar\\Desktop\\berlin.json', 'utf-8');
    const episodesData: SeasonData = JSON.parse(jsonData);

    // Find the existing Berlin show
    const shows = await storage.getAllShows();
    const berlinShow = shows.find(s => s.title.toLowerCase().includes('berlin'));

    if (!berlinShow) {
      console.error('❌ Berlin show not found in database');
      console.log('Available shows:', shows.map(s => s.title).join(', '));
      process.exit(1);
    }

    console.log(`✅ Found show: ${berlinShow.title} (ID: ${berlinShow.id})\n`);

    // Use TMDB ID for Berlin (assuming it's "Berlin" 2023)
    const tmdbId = 207757; // Berlin (2023)
    console.log(`✅ Using TMDB ID: ${tmdbId}\n`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    // Process each season
    for (const [seasonKey, episodes] of Object.entries(episodesData)) {
      const seasonNumber = parseInt(seasonKey.replace('Season ', ''));
      console.log(`📺 Processing Season ${seasonNumber}...`);

      // Fetch TMDB data for this season
      const tmdbSeason = await fetchSeasonDetails(tmdbId, seasonNumber);
      
      if (!tmdbSeason) {
        console.log(`   ⚠️  Could not fetch TMDB data for Season ${seasonNumber}`);
        console.log(`   Creating episodes with basic info...\n`);
        
        // Create episodes without TMDB data
        for (const episodeData of episodes) {
          const episodeNumber = episodeData.episode;
          
          const episodePayload = {
            showId: berlinShow.id,
            season: seasonNumber,
            episodeNumber: episodeNumber,
            episode: episodeNumber,
            title: `Episode ${episodeNumber}`,
            description: `Berlin Season ${seasonNumber}, Episode ${episodeNumber}`,
            duration: 45,
            releaseDate: '',
            videoUrl: episodeData.google_drive_link,
            thumbnailUrl: berlinShow.thumbnail || '',
          };

          await storage.createEpisode(episodePayload);
          console.log(`   ✨ Created S${seasonNumber}E${episodeNumber}: Episode ${episodeNumber}`);
          totalCreated++;
        }
        continue;
      }

      // Get existing episodes for this season
      const existingEpisodes = await storage.getEpisodesByShowId(berlinShow.id);
      const seasonEpisodes = existingEpisodes.filter(e => e.season === seasonNumber);

      // Process each episode
      for (const episodeData of episodes) {
        const episodeNumber = episodeData.episode;
        
        // Find TMDB data for this episode
        const tmdbEpisode = tmdbSeason.episodes.find(e => e.episode_number === episodeNumber);
        
        if (!tmdbEpisode) {
          console.log(`   ⚠️  S${seasonNumber}E${episodeNumber}: No TMDB data found, using basic info`);
          
          const episodePayload = {
            showId: berlinShow.id,
            season: seasonNumber,
            episodeNumber: episodeNumber,
            episode: episodeNumber,
            title: `Episode ${episodeNumber}`,
            description: `Berlin Season ${seasonNumber}, Episode ${episodeNumber}`,
            duration: 45,
            releaseDate: '',
            videoUrl: episodeData.google_drive_link,
            thumbnailUrl: berlinShow.thumbnail || '',
          };

          await storage.createEpisode(episodePayload);
          console.log(`   ✨ Created S${seasonNumber}E${episodeNumber}: Episode ${episodeNumber}`);
          totalCreated++;
          continue;
        }

        // Check if episode already exists
        const existingEpisode = seasonEpisodes.find(e => e.episodeNumber === episodeNumber);

        const episodePayload = {
          showId: berlinShow.id,
          season: seasonNumber,
          episodeNumber: episodeNumber,
          episode: episodeNumber,
          title: tmdbEpisode.name,
          description: tmdbEpisode.overview || `Season ${seasonNumber}, Episode ${episodeNumber}`,
          duration: tmdbEpisode.runtime || 45,
          releaseDate: tmdbEpisode.air_date || '',
          videoUrl: episodeData.google_drive_link,
          thumbnailUrl: tmdbEpisode.still_path 
            ? `${TMDB_IMAGE_BASE}/w500${tmdbEpisode.still_path}`
            : berlinShow.thumbnail || '',
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

    console.log('\n✅ Berlin episodes added successfully!');
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
