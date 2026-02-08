import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

async function fetchShowDetails(tmdbId: number) {
  const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  return await res.json();
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
  
  // Find Physics Wallah
  const showIdx = data.shows.findIndex((s: any) => s.slug === 'physics-wallah');
  if (showIdx === -1) {
    console.log('Show not found!');
    return;
  }
  
  const show = data.shows[showIdx];
  console.log('Found show:', show.title);
  
  // TMDB ID for Physics Wallah
  const TMDB_ID = 216268;
  
  // Fetch show details
  const showDetails = await fetchShowDetails(TMDB_ID);
  console.log('TMDB Title:', showDetails.name);
  console.log('TMDB Overview:', showDetails.overview?.substring(0, 100));
  
  // Update show description
  data.shows[showIdx].description = showDetails.overview || 'The inspiring journey of Alakh Pandey, who revolutionized education in India by making quality physics education accessible to all students through his online platform.';
  
  // Get episodes for this show
  const showEpisodes = data.episodes.filter((e: any) => e.showId === show.id);
  console.log('\nFound', showEpisodes.length, 'episodes');
  
  // Remove the S3E9 episode (it's incorrect)
  const s3e9Idx = data.episodes.findIndex((e: any) => e.showId === show.id && e.season === 3);
  if (s3e9Idx !== -1) {
    console.log('Removing incorrect S3E9 episode');
    data.episodes.splice(s3e9Idx, 1);
  }
  
  // Update remaining episodes with TMDB data
  for (const ep of showEpisodes.filter((e: any) => e.season === 1)) {
    const epDetails = await fetchEpisodeDetails(TMDB_ID, 1, ep.episodeNumber);
    
    if (epDetails) {
      const epIdx = data.episodes.findIndex((e: any) => e.id === ep.id);
      if (epIdx !== -1) {
        data.episodes[epIdx].title = epDetails.name || `Episode ${ep.episodeNumber}`;
        data.episodes[epIdx].description = epDetails.overview || '';
        if (epDetails.still_path) {
          data.episodes[epIdx].thumbnailUrl = `https://image.tmdb.org/t/p/w500${epDetails.still_path}`;
        } else {
          // Use show backdrop as fallback
          data.episodes[epIdx].thumbnailUrl = show.backdropUrl;
        }
        console.log(`  Updated S1E${ep.episodeNumber}: ${epDetails.name}`);
      }
    } else {
      // Use show backdrop as thumbnail
      const epIdx = data.episodes.findIndex((e: any) => e.id === ep.id);
      if (epIdx !== -1) {
        data.episodes[epIdx].thumbnailUrl = show.backdropUrl;
      }
      console.log(`  No TMDB data for S1E${ep.episodeNumber}, using backdrop`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('\nData saved successfully!');
}

main().catch(console.error);
