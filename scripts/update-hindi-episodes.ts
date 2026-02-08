import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

// TMDB IDs for the Hindi shows
const showTmdbIds: Record<string, number> = {
  'asur': 100911,
  'dayaa': 230930,
  'lakkadbaggey': 303851,
  'khoj-parchaiyon-ke-uss-paar': 280566,
};

async function fetchEpisodeData(tmdbId: number, season: number, episode: number) {
  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

async function updateHindiEpisodes() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  let updatedCount = 0;
  
  for (const [slug, tmdbId] of Object.entries(showTmdbIds)) {
    const show = data.shows.find((s: any) => s.slug === slug);
    if (!show) {
      console.log(`Show not found: ${slug}`);
      continue;
    }
    
    console.log(`\nUpdating episodes for: ${show.title}`);
    
    // Get all episodes for this show
    const episodes = data.episodes.filter((e: any) => e.showId === show.id);
    
    for (const episode of episodes) {
      const epData = await fetchEpisodeData(tmdbId, episode.season, episode.episodeNumber);
      
      if (epData && !epData.success === false) {
        episode.title = epData.name || episode.title;
        episode.description = epData.overview || episode.description;
        episode.thumbnailUrl = epData.still_path 
          ? `https://image.tmdb.org/t/p/w500${epData.still_path}` 
          : episode.thumbnailUrl;
        episode.duration = epData.runtime || episode.duration;
        episode.airDate = epData.air_date || episode.airDate;
        
        console.log(`  S${episode.season}E${episode.episodeNumber}: ${episode.title}`);
        updatedCount++;
      } else {
        console.log(`  S${episode.season}E${episode.episodeNumber}: No data found`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('\n========================================');
  console.log(`Updated ${updatedCount} episodes`);
  console.log('Data saved successfully!');
}

updateHindiEpisodes().catch(console.error);
