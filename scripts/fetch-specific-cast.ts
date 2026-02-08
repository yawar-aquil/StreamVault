import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

// Manual mappings for hard-to-find titles
const TMDB_IDS: Record<string, { id: number; type: 'tv' | 'movie' }> = {
  'Aurora Teagarden Mysteries': { id: 66604, type: 'tv' },
  'The Forest': { id: 66480, type: 'tv' }, // Polish series "W głębi lasu"
  'Birdman': { id: 194662, type: 'movie' }, // Birdman or (The Unexpected Virtue of Ignorance)
  'Drishyam': { id: 297222, type: 'movie' }, // Hindi movie
  'Masaan': { id: 336879, type: 'movie' },
  'NEWTON': { id: 429838, type: 'movie' },
};

async function fetchCast(tmdbId: number, type: 'tv' | 'movie') {
  let url: string;
  if (type === 'tv') {
    url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=aggregate_credits`;
  } else {
    url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
  }
  
  const res = await fetch(url);
  const data = await res.json();
  
  let cast;
  if (type === 'tv') {
    cast = data.aggregate_credits?.cast?.slice(0, 10).map((c: any) => ({
      name: c.name,
      character: c.roles?.[0]?.character || '',
      profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    })) || [];
  } else {
    cast = data.credits?.cast?.slice(0, 10).map((c: any) => ({
      name: c.name,
      character: c.character || '',
      profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    })) || [];
  }
  
  return cast;
}

async function main() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  let updated = 0;
  
  for (const [title, info] of Object.entries(TMDB_IDS)) {
    console.log(`Fetching cast for: ${title} (TMDB ID: ${info.id})`);
    
    const castDetails = await fetchCast(info.id, info.type);
    
    if (castDetails.length > 0) {
      // Find in shows or movies
      if (info.type === 'tv') {
        const idx = data.shows.findIndex((s: any) => s.title === title);
        if (idx !== -1) {
          data.shows[idx].castDetails = JSON.stringify(castDetails);
          console.log(`  ✅ Updated show ${title} with ${castDetails.length} cast members`);
          updated++;
        }
      } else {
        const idx = data.movies.findIndex((m: any) => m.title === title);
        if (idx !== -1) {
          data.movies[idx].castDetails = JSON.stringify(castDetails);
          console.log(`  ✅ Updated movie ${title} with ${castDetails.length} cast members`);
          updated++;
        }
      }
    } else {
      console.log(`  ❌ No cast found for ${title}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n========================================');
  console.log(`Updated ${updated} items`);
  console.log('Data saved successfully!');
}

main().catch(console.error);
