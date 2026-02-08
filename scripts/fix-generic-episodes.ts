import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

async function searchTMDB(title: string) {
  // Clean title for search
  const cleanTitle = title
    .replace(/\s*\(Hindi Dubbed\)/i, '')
    .replace(/\s*-\s*Online\s*HINDI/i, '')
    .trim();
  
  const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0];
}

async function fetchEpisodeDetails(tmdbId: number, season: number, episode: number) {
  const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

async function main() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  // Find episodes with generic titles (Episode 1, Episode 2, etc.)
  const genericEpisodes = data.episodes.filter((e: any) => 
    /^Episode \d+$/.test(e.title) || 
    e.description?.includes('Online HINDI') ||
    e.thumbnailUrl?.includes('unsplash.com')
  );
  
  console.log(`Found ${genericEpisodes.length} episodes with generic data\n`);
  
  // Group by show
  const showMap = new Map<string, any[]>();
  for (const ep of genericEpisodes) {
    const show = data.shows.find((s: any) => s.id === ep.showId);
    if (!show) continue;
    
    if (!showMap.has(show.id)) {
      showMap.set(show.id, []);
    }
    showMap.get(show.id)!.push(ep);
  }
  
  console.log(`Across ${showMap.size} shows\n`);
  
  let updatedCount = 0;
  let processedShows = 0;
  
  for (const [showId, episodes] of showMap) {
    const show = data.shows.find((s: any) => s.id === showId);
    if (!show) continue;
    
    processedShows++;
    console.log(`[${processedShows}/${showMap.size}] ${show.title}`);
    
    // Search TMDB for this show
    const tmdbShow = await searchTMDB(show.title);
    if (!tmdbShow) {
      console.log(`  ❌ Not found on TMDB`);
      // Use show backdrop for thumbnails at least
      for (const ep of episodes) {
        const epIdx = data.episodes.findIndex((e: any) => e.id === ep.id);
        if (epIdx !== -1 && data.episodes[epIdx].thumbnailUrl?.includes('unsplash.com')) {
          data.episodes[epIdx].thumbnailUrl = show.backdropUrl;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      continue;
    }
    
    // Update each episode
    for (const ep of episodes) {
      const epDetails = await fetchEpisodeDetails(tmdbShow.id, ep.season, ep.episodeNumber);
      const epIdx = data.episodes.findIndex((e: any) => e.id === ep.id);
      
      if (epIdx === -1) continue;
      
      if (epDetails) {
        if (/^Episode \d+$/.test(ep.title) && epDetails.name) {
          data.episodes[epIdx].title = epDetails.name;
        }
        if (epDetails.overview && (ep.description?.includes('Online HINDI') || !ep.description)) {
          data.episodes[epIdx].description = epDetails.overview;
        }
        if (epDetails.still_path) {
          data.episodes[epIdx].thumbnailUrl = `https://image.tmdb.org/t/p/w500${epDetails.still_path}`;
        } else if (ep.thumbnailUrl?.includes('unsplash.com')) {
          data.episodes[epIdx].thumbnailUrl = show.backdropUrl;
        }
        updatedCount++;
      } else {
        // No TMDB data, at least fix thumbnail
        if (ep.thumbnailUrl?.includes('unsplash.com')) {
          data.episodes[epIdx].thumbnailUrl = show.backdropUrl;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`  ✅ Updated ${episodes.length} episodes`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n========================================');
  console.log(`Updated ${updatedCount} episodes`);
  console.log('Data saved successfully!');
}

main().catch(console.error);
