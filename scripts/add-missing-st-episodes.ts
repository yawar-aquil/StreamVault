import { config } from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const DATA_FILE = join(process.cwd(), "data", "streamvault-data.json");

// Stranger Things TMDB ID
const STRANGER_THINGS_TMDB_ID = 66732;

interface Episode {
  id: string;
  showId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  googleDriveUrl: string;
  videoUrl: string | null;
  airDate: string | null;
}

async function fetchEpisodeFromTMDB(season: number, episode: number) {
  const url = `${TMDB_BASE_URL}/tv/${STRANGER_THINGS_TMDB_ID}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
  
  console.log(`📥 Fetching S${season}E${episode} from TMDB...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch episode: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    title: data.name || `Episode ${episode}`,
    description: data.overview || "No description available.",
    thumbnailUrl: data.still_path 
      ? `${TMDB_IMAGE_BASE}/w500${data.still_path}`
      : "",
    duration: data.runtime || 50,
    airDate: data.air_date || null,
  };
}

async function addMissingEpisodes() {
  try {
    // Read current data
    const rawData = readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(rawData);
    
    // Find Stranger Things show
    const stShow = data.shows.find((s: any) => 
      s.title.toLowerCase().includes("stranger things")
    );
    
    if (!stShow) {
      console.error("❌ Stranger Things show not found!");
      return;
    }
    
    console.log(`✅ Found show: ${stShow.title} (ID: ${stShow.id})\n`);
    
    // Episodes to add
    const episodesToAdd = [
      {
        season: 3,
        episode: 2,
        driveUrl: "https://drive.google.com/file/d/1SOZKauiFcIJtmBQuvj2oRq6YRMiE7p5-/preview"
      },
      {
        season: 4,
        episode: 9,
        driveUrl: "https://drive.google.com/file/d/1AkMvbbSw8Z8I7Y3nonbXT80PWOyZosNs/preview"
      }
    ];
    
    for (const ep of episodesToAdd) {
      // Check if episode already exists
      const existingEpisode = data.episodes.find((e: Episode) => 
        e.showId === stShow.id && 
        e.season === ep.season && 
        e.episodeNumber === ep.episode
      );
      
      if (existingEpisode) {
        console.log(`⚠️  S${ep.season}E${ep.episode} already exists, updating...`);
        
        // Fetch TMDB data
        const tmdbData = await fetchEpisodeFromTMDB(ep.season, ep.episode);
        
        // Update existing episode
        existingEpisode.title = tmdbData.title;
        existingEpisode.description = tmdbData.description;
        existingEpisode.thumbnailUrl = tmdbData.thumbnailUrl;
        existingEpisode.duration = tmdbData.duration;
        existingEpisode.airDate = tmdbData.airDate;
        existingEpisode.googleDriveUrl = ep.driveUrl;
        
        console.log(`✅ Updated S${ep.season}E${ep.episode}: ${tmdbData.title}`);
      } else {
        console.log(`➕ Adding new episode S${ep.season}E${ep.episode}...`);
        
        // Fetch TMDB data
        const tmdbData = await fetchEpisodeFromTMDB(ep.season, ep.episode);
        
        // Create new episode
        const newEpisode: Episode = {
          id: `${crypto.randomUUID()}`,
          showId: stShow.id,
          season: ep.season,
          episodeNumber: ep.episode,
          title: tmdbData.title,
          description: tmdbData.description,
          thumbnailUrl: tmdbData.thumbnailUrl,
          duration: tmdbData.duration,
          googleDriveUrl: ep.driveUrl,
          videoUrl: null,
          airDate: tmdbData.airDate,
        };
        
        data.episodes.push(newEpisode);
        console.log(`✅ Added S${ep.season}E${ep.episode}: ${tmdbData.title}`);
      }
      
      console.log("");
    }
    
    // Sort episodes by season and episode number
    data.episodes.sort((a: Episode, b: Episode) => {
      if (a.showId !== b.showId) return a.showId.localeCompare(b.showId);
      if (a.season !== b.season) return a.season - b.season;
      return a.episodeNumber - b.episodeNumber;
    });
    
    // Save updated data
    data.lastUpdated = new Date().toISOString();
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    
    console.log("✅ Data saved successfully!");
    console.log("\n🎉 All missing episodes added!");
    
    // Show summary
    const stEpisodes = data.episodes.filter((e: Episode) => e.showId === stShow.id);
    console.log(`\n📊 Total Stranger Things episodes: ${stEpisodes.length}`);
    
    const s3Episodes = stEpisodes.filter((e: Episode) => e.season === 3);
    const s4Episodes = stEpisodes.filter((e: Episode) => e.season === 4);
    console.log(`   Season 3: ${s3Episodes.length} episodes`);
    console.log(`   Season 4: ${s4Episodes.length} episodes`);
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

addMissingEpisodes().catch(console.error);
