import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// Peaky Blinders TMDB ID
const PEAKY_BLINDERS_ID = 60574;

async function fetchSeasonData(seasonNumber: number) {
  const url = `${TMDB_BASE_URL}/tv/${PEAKY_BLINDERS_ID}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch season ${seasonNumber}: ${response.statusText}`);
  }
  return response.json();
}

async function updatePeakyBlinders() {
  console.log('Fetching Peaky Blinders data from TMDB...\n');
  
  // Read existing data
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Find Peaky Blinders show
  const peakyBlinders = data.shows.find((s: any) => s.slug === 'peaky-blinders');
  if (!peakyBlinders) {
    console.error('Peaky Blinders not found in data');
    return;
  }
  
  console.log(`Found Peaky Blinders: ${peakyBlinders.title}`);
  console.log(`Show ID: ${peakyBlinders.id}\n`);
  
  // Fetch Season 1, 2, and 3 data
  const season1Data = await fetchSeasonData(1);
  const season2Data = await fetchSeasonData(2);
  const season3Data = await fetchSeasonData(3);
  
  console.log(`Season 1: ${season1Data.episodes.length} episodes`);
  console.log(`Season 2: ${season2Data.episodes.length} episodes`);
  console.log(`Season 3: ${season3Data.episodes.length} episodes\n`);
  
  // Update episodes
  let updatedCount = 0;
  
  for (const episode of data.episodes) {
    if (episode.showId === peakyBlinders.id && episode.season >= 1 && episode.season <= 3) {
      let tmdbEpisode = null;
      
      if (episode.season === 1) {
        tmdbEpisode = season1Data.episodes.find((e: any) => e.episode_number === episode.episodeNumber);
      } else if (episode.season === 2) {
        tmdbEpisode = season2Data.episodes.find((e: any) => e.episode_number === episode.episodeNumber);
      } else if (episode.season === 3) {
        tmdbEpisode = season3Data.episodes.find((e: any) => e.episode_number === episode.episodeNumber);
      }
      
      if (tmdbEpisode) {
        console.log(`Updating S${episode.season}E${episode.episodeNumber}: ${tmdbEpisode.name}`);
        episode.title = tmdbEpisode.name;
        episode.description = tmdbEpisode.overview || episode.description;
        episode.airDate = tmdbEpisode.air_date || episode.airDate;
        episode.duration = tmdbEpisode.runtime || episode.duration;
        
        // Update thumbnail if available
        if (tmdbEpisode.still_path) {
          episode.thumbnailUrl = `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}`;
        }
        
        updatedCount++;
      }
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} episodes`);
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log('✅ Peaky Blinders data updated successfully!');
}

updatePeakyBlinders().catch(console.error);
