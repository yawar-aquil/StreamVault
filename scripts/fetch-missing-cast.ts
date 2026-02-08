import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

async function searchTMDB(title: string, type: 'tv' | 'movie') {
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0];
}

async function fetchCastDetails(tmdbId: number, type: 'tv' | 'movie') {
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  
  const cast = data.cast?.slice(0, 10).map((c: any) => ({
    name: c.name,
    character: c.character || '',
    profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
  })) || [];
  
  return cast;
}

async function main() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  // Find shows missing castDetails
  const showsMissing = data.shows.filter((s: any) => !s.castDetails);
  const moviesMissing = data.movies.filter((m: any) => !m.castDetails);
  
  console.log(`\nShows missing castDetails: ${showsMissing.length}`);
  console.log(`Movies missing castDetails: ${moviesMissing.length}\n`);
  
  let updatedShows = 0;
  let updatedMovies = 0;
  
  // Update shows
  for (const show of showsMissing) {
    console.log(`Searching for show: ${show.title}`);
    const result = await searchTMDB(show.title, 'tv');
    
    if (result) {
      const castDetails = await fetchCastDetails(result.id, 'tv');
      if (castDetails.length > 0) {
        // Find and update the show in data
        const idx = data.shows.findIndex((s: any) => s.id === show.id);
        if (idx !== -1) {
          data.shows[idx].castDetails = JSON.stringify(castDetails);
          console.log(`  ✅ Updated ${show.title} with ${castDetails.length} cast members`);
          updatedShows++;
        }
      } else {
        console.log(`  ⚠️ No cast found for ${show.title}`);
      }
    } else {
      console.log(`  ❌ Not found on TMDB: ${show.title}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Update movies
  for (const movie of moviesMissing) {
    console.log(`Searching for movie: ${movie.title}`);
    const result = await searchTMDB(movie.title, 'movie');
    
    if (result) {
      const castDetails = await fetchCastDetails(result.id, 'movie');
      if (castDetails.length > 0) {
        // Find and update the movie in data
        const idx = data.movies.findIndex((m: any) => m.id === movie.id);
        if (idx !== -1) {
          data.movies[idx].castDetails = JSON.stringify(castDetails);
          console.log(`  ✅ Updated ${movie.title} with ${castDetails.length} cast members`);
          updatedMovies++;
        }
      } else {
        console.log(`  ⚠️ No cast found for ${movie.title}`);
      }
    } else {
      console.log(`  ❌ Not found on TMDB: ${movie.title}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n========================================');
  console.log(`Updated ${updatedShows} shows`);
  console.log(`Updated ${updatedMovies} movies`);
  console.log('Data saved successfully!');
}

main().catch(console.error);
