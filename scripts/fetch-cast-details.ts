import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

interface CastMember {
  name: string;
  character: string;
  profileUrl: string | null;
}

async function searchTMDB(title: string, year: number, type: 'tv' | 'movie'): Promise<number | null> {
  try {
    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchCastDetails(tmdbId: number, type: 'tv' | 'movie'): Promise<CastMember[]> {
  try {
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.cast) return [];
    
    // Get top 10 cast members
    return data.cast.slice(0, 10).map((member: any) => ({
      name: member.name,
      character: member.character || '',
      profileUrl: member.profile_path 
        ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
        : null,
    }));
  } catch (error) {
    return [];
  }
}

async function main() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  let showsUpdated = 0;
  let moviesUpdated = 0;
  let showsSkipped = 0;
  let moviesSkipped = 0;
  
  // Process shows
  console.log('\n=== Processing Shows ===');
  for (let i = 0; i < data.shows.length; i++) {
    const show = data.shows[i];
    
    // Skip if already has castDetails
    if (show.castDetails) {
      showsSkipped++;
      continue;
    }
    
    process.stdout.write(`\r[${i + 1}/${data.shows.length}] ${show.title.padEnd(40)}`);
    
    // Search for show on TMDB
    const tmdbId = await searchTMDB(show.title, show.year, 'tv');
    
    if (tmdbId) {
      const castDetails = await fetchCastDetails(tmdbId, 'tv');
      
      if (castDetails.length > 0) {
        show.castDetails = JSON.stringify(castDetails);
        showsUpdated++;
      }
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n\n=== Processing Movies ===');
  for (let i = 0; i < data.movies.length; i++) {
    const movie = data.movies[i];
    
    // Skip if already has castDetails
    if (movie.castDetails) {
      moviesSkipped++;
      continue;
    }
    
    process.stdout.write(`\r[${i + 1}/${data.movies.length}] ${movie.title.padEnd(40)}`);
    
    // Search for movie on TMDB
    const tmdbId = await searchTMDB(movie.title, movie.year, 'movie');
    
    if (tmdbId) {
      const castDetails = await fetchCastDetails(tmdbId, 'movie');
      
      if (castDetails.length > 0) {
        movie.castDetails = JSON.stringify(castDetails);
        moviesUpdated++;
      }
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Save data
  console.log('\n\nSaving data...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n========================================');
  console.log(`Shows: ${showsUpdated} updated, ${showsSkipped} skipped (already had data)`);
  console.log(`Movies: ${moviesUpdated} updated, ${moviesSkipped} skipped (already had data)`);
  console.log('Done!');
}

main().catch(console.error);
