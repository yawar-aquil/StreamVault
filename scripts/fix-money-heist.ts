import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// Money Heist TMDB ID: 71446

async function fetchSeasonDetails(seasonNumber: number): Promise<any> {
  const url = `${TMDB_BASE_URL}/tv/71446/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

async function fixMoneyHeist() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('💰 Fixing Money Heist episodes...\n');
  
  const show = data.shows.find((s: any) => s.title.toLowerCase().includes('money heist'));
  
  if (!show) {
    console.log('❌ Money Heist not found');
    return;
  }
  
  console.log(`Found: ${show.title} (ID: ${show.id})\n`);
  
  const episodes = data.episodes.filter((e: any) => e.showId === show.id);
  console.log(`Total episodes: ${episodes.length}\n`);
  
  // Get unique seasons
  const seasons = [...new Set(episodes.map((e: any) => e.season))].sort((a, b) => a - b);
  console.log(`Seasons: ${seasons.join(', ')}\n`);
  
  let updatedCount = 0;
  
  for (const seasonNum of seasons) {
    console.log(`\n📺 Processing Season ${seasonNum}...`);
    
    try {
      const seasonData = await fetchSeasonDetails(seasonNum);
      console.log(`   Fetched ${seasonData.episodes?.length || 0} episodes from TMDB`);
      
      const seasonEpisodes = episodes.filter((e: any) => e.season === seasonNum);
      
      for (const episode of seasonEpisodes) {
        const tmdbEpisode = seasonData.episodes?.find((e: any) => e.episode_number === episode.episodeNumber);
        
        if (tmdbEpisode) {
          const oldTitle = episode.title;
          const oldThumbnail = episode.thumbnailUrl;
          
          episode.title = tmdbEpisode.name || `Episode ${episode.episodeNumber}`;
          episode.description = tmdbEpisode.overview || '';
          episode.thumbnailUrl = tmdbEpisode.still_path 
            ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` 
            : show.posterUrl;
          episode.duration = tmdbEpisode.runtime || 45;
          episode.airDate = tmdbEpisode.air_date || '';
          
          if (oldTitle !== episode.title || oldThumbnail !== episode.thumbnailUrl) {
            console.log(`   ✅ S${seasonNum}E${episode.episodeNumber}: ${episode.title}`);
            updatedCount++;
          }
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`   ❌ Error fetching Season ${seasonNum}:`, error);
    }
  }
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   Episodes updated: ${updatedCount}`);
  console.log(`\n✅ Money Heist fixed!`);
}

fixMoneyHeist().catch(console.error);
