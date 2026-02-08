import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function addDerryEpisode6() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🎬 Adding It: Welcome to Derry Episode 6...\n');
  
  // Find the show
  const show = data.shows.find((s: any) => 
    s.title.toLowerCase().includes('welcome to derry') || 
    s.slug.includes('welcome-to-derry')
  );
  
  if (!show) {
    console.error('❌ Show "It: Welcome to Derry" not found in database');
    return;
  }
  
  console.log(`   Found show: ${show.title}`);
  console.log(`   Show ID: ${show.id}`);
  
  // Get TMDB ID from show (assuming it's stored or we know it)
  // It: Welcome to Derry TMDB ID: 94605
  const tmdbId = 94605;
  
  try {
    // Fetch season 1 data from TMDB
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/1?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    const seasonData = await response.json();
    
    // Get episode 6
    const tmdbEpisode = seasonData.episodes.find((e: any) => e.episode_number === 6);
    
    if (!tmdbEpisode) {
      console.error('❌ Episode 6 not found in TMDB data');
      return;
    }
    
    console.log(`   Fetched: ${tmdbEpisode.name}`);
    
    // Check if episode already exists
    const existingEpisode = data.episodes.find((e: any) => 
      e.showId === show.id && e.season === 1 && e.episodeNumber === 6
    );
    
    const episode = {
      id: existingEpisode?.id || generateId(),
      showId: show.id,
      season: 1,
      episodeNumber: 6,
      title: tmdbEpisode.name || 'Episode 6',
      description: tmdbEpisode.overview || '',
      thumbnailUrl: tmdbEpisode.still_path ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` : show.posterUrl,
      duration: tmdbEpisode.runtime || 45,
      googleDriveUrl: 'https://drive.google.com/file/d/1q1kb_X012Qz0iR9gdCys4YX3XtxK5v3v/preview',
      airDate: tmdbEpisode.air_date || '2025'
    };
    
    if (existingEpisode) {
      // Update existing episode
      const index = data.episodes.findIndex((e: any) => e.id === existingEpisode.id);
      data.episodes[index] = episode;
      console.log(`   ✅ Updated: S01E06 - ${episode.title}`);
    } else {
      // Add new episode
      data.episodes.push(episode);
      console.log(`   ✅ Added: S01E06 - ${episode.title}`);
    }
    
    console.log(`      Air Date: ${episode.airDate}`);
    console.log(`      Duration: ${episode.duration} min`);
    console.log(`      Description: ${episode.description.substring(0, 100)}...`);
    
    // Write back to file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    console.log('\n📊 Summary:');
    console.log(`   Total episodes in database: ${data.episodes.length}`);
    console.log('\n✅ Episode 6 added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addDerryEpisode6().catch(console.error);
