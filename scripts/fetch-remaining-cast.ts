import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

async function fetchShowWithCredits(title: string) {
  // Search for the show
  const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.results?.[0]) return null;
  
  const showId = searchData.results[0].id;
  
  // Get show details with aggregate credits (for anthology shows)
  const detailUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}&append_to_response=aggregate_credits`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();
  
  const cast = detailData.aggregate_credits?.cast?.slice(0, 10).map((c: any) => ({
    name: c.name,
    character: c.roles?.[0]?.character || '',
    profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
  })) || [];
  
  return cast;
}

async function fetchMovieWithCredits(title: string) {
  // Search for the movie
  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.results?.[0]) return null;
  
  const movieId = searchData.results[0].id;
  
  // Get movie details with credits
  const detailUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();
  
  const cast = detailData.credits?.cast?.slice(0, 10).map((c: any) => ({
    name: c.name,
    character: c.character || '',
    profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
  })) || [];
  
  return cast;
}

async function main() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  // Find shows still missing castDetails
  const showsMissing = data.shows.filter((s: any) => !s.castDetails);
  const moviesMissing = data.movies.filter((m: any) => !m.castDetails);
  
  console.log(`\nShows still missing castDetails: ${showsMissing.length}`);
  console.log(`Movies still missing castDetails: ${moviesMissing.length}\n`);
  
  let updatedShows = 0;
  let updatedMovies = 0;
  
  // Update shows using aggregate_credits
  for (const show of showsMissing) {
    console.log(`Fetching aggregate credits for: ${show.title}`);
    const castDetails = await fetchShowWithCredits(show.title);
    
    if (castDetails && castDetails.length > 0) {
      const idx = data.shows.findIndex((s: any) => s.id === show.id);
      if (idx !== -1) {
        data.shows[idx].castDetails = JSON.stringify(castDetails);
        console.log(`  ✅ Updated ${show.title} with ${castDetails.length} cast members`);
        updatedShows++;
      }
    } else {
      console.log(`  ❌ No cast found for ${show.title}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Update movies
  for (const movie of moviesMissing) {
    console.log(`Fetching credits for: ${movie.title}`);
    const castDetails = await fetchMovieWithCredits(movie.title);
    
    if (castDetails && castDetails.length > 0) {
      const idx = data.movies.findIndex((m: any) => m.id === movie.id);
      if (idx !== -1) {
        data.movies[idx].castDetails = JSON.stringify(castDetails);
        console.log(`  ✅ Updated ${movie.title} with ${castDetails.length} cast members`);
        updatedMovies++;
      }
    } else {
      console.log(`  ❌ No cast found for ${movie.title}`);
    }
    
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
