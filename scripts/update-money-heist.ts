import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// Money Heist TMDB ID
const MONEY_HEIST_ID = 71446;

interface Episode {
  id: string;
  showId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  googleDriveUrl: string;
  thumbnailUrl: string;
  airDate: string;
  duration: number;
}

async function fetchSeasonData(seasonNumber: number) {
  const url = `${TMDB_BASE_URL}/tv/${MONEY_HEIST_ID}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch season ${seasonNumber}: ${response.statusText}`);
  }
  return response.json();
}

async function updateMoneyHeist() {
  console.log('Fetching Money Heist data from TMDB...');
  
  // Read existing data
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Find Money Heist show
  const moneyHeist = data.shows.find((s: any) => s.slug === 'money-heist');
  if (!moneyHeist) {
    console.error('Money Heist not found in data');
    return;
  }
  
  console.log(`Found Money Heist: ${moneyHeist.title}`);
  
  // Netflix Season 4 = TMDB Season 2 (episodes 9-16)
  // Netflix Season 5 = TMDB Season 3 (episodes 1-10)
  const season2Data = await fetchSeasonData(2);
  const season3Data = await fetchSeasonData(3);
  
  console.log(`TMDB Season 2: ${season2Data.episodes.length} episodes`);
  console.log(`TMDB Season 3: ${season3Data.episodes.length} episodes`);
  
  // Update episodes
  let updatedCount = 0;
  
  for (const episode of data.episodes) {
    if (episode.showId === moneyHeist.id && (episode.season === 4 || episode.season === 5)) {
      let tmdbEpisode = null;
      
      if (episode.season === 4) {
        // Netflix S4 = TMDB S2 episodes 9-16
        const tmdbEpisodeNum = episode.episodeNumber + 8;
        tmdbEpisode = season2Data.episodes.find((e: any) => e.episode_number === tmdbEpisodeNum);
      } else if (episode.season === 5) {
        // Netflix S5 = TMDB S3 episodes 1-10
        tmdbEpisode = season3Data.episodes.find((e: any) => e.episode_number === episode.episodeNumber);
      }
      
      if (tmdbEpisode && tmdbEpisode.still_path) {
        const newThumbnail = `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}`;
        console.log(`Updating S${episode.season}E${episode.episodeNumber}: ${tmdbEpisode.name}`);
        episode.thumbnailUrl = newThumbnail;
        episode.title = tmdbEpisode.name;
        episode.description = tmdbEpisode.overview || episode.description;
        episode.airDate = tmdbEpisode.air_date || episode.airDate;
        episode.duration = tmdbEpisode.runtime || 50;
        updatedCount++;
      }
    }
  }
  
  console.log(`\nUpdated ${updatedCount} episodes`);
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log('✅ Money Heist data updated successfully!');
}

updateMoneyHeist().catch(console.error);
