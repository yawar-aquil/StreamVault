import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_MOVIE_ID = 76600; // Avatar: The Way of Water

async function fetchMovieData() {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${TMDB_MOVIE_ID}?api_key=${TMDB_API_KEY}&append_to_response=credits`
  );
  return response.json();
}

async function addAvatarWayOfWater() {
  console.log('🎬 Fetching Avatar: The Way of Water data from TMDB...');
  
  const movieData = await fetchMovieData();
  
  // Load existing data
  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  // Get cast details
  const cast = movieData.credits?.cast?.slice(0, 10).map((person: any) => ({
    name: person.name,
    character: person.character,
    profileUrl: person.profile_path 
      ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
      : null
  })) || [];
  
  const newMovie = {
    id: crypto.randomUUID(),
    title: movieData.title,
    slug: 'avatar-the-way-of-water',
    description: movieData.overview,
    posterUrl: `https://image.tmdb.org/t/p/original${movieData.poster_path}`,
    backdropUrl: `https://image.tmdb.org/t/p/original${movieData.backdrop_path}`,
    year: new Date(movieData.release_date).getFullYear(),
    rating: movieData.adult ? 'R' : 'PG-13',
    imdbRating: movieData.vote_average.toFixed(1),
    genres: movieData.genres.map((g: any) => g.name).join(', '),
    language: 'English',
    duration: movieData.runtime,
    cast: cast.map((c: any) => c.name).join(', '),
    directors: movieData.credits?.crew?.find((c: any) => c.job === 'Director')?.name || '',
    googleDriveUrl: 'https://drive.google.com/file/d/12djnyI68zULcA6Ooz1VRbUPPpwTiitIA/preview',
    featured: true,
    trending: true,
    category: movieData.genres[0]?.name.toLowerCase() || 'action',
    castDetails: JSON.stringify(cast)
  };
  
  // Check if movie already exists
  const existingIndex = data.movies.findIndex((m: any) => m.slug === newMovie.slug);
  
  if (existingIndex >= 0) {
    console.log('⚠️  Movie already exists, updating...');
    data.movies[existingIndex] = newMovie;
  } else {
    console.log('✅ Adding new movie...');
    data.movies.push(newMovie);
  }
  
  // Save data
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('✅ Avatar: The Way of Water added successfully!');
  console.log(`   Title: ${newMovie.title}`);
  console.log(`   Year: ${newMovie.year}`);
  console.log(`   Rating: ${newMovie.imdbRating}`);
  console.log(`   Duration: ${newMovie.duration}`);
  console.log(`   Cast: ${cast.slice(0, 3).map((c: any) => c.name).join(', ')}...`);
}

addAvatarWayOfWater().catch(console.error);
