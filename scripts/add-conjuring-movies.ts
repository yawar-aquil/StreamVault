import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// The Conjuring movies TMDB IDs
const CONJURING_MOVIES = [
  { tmdbId: 138843, title: 'The Conjuring' },
  { tmdbId: 252194, title: 'The Conjuring 2' },
  { tmdbId: 423108, title: 'The Conjuring: The Devil Made Me Do It' },
  { tmdbId: 1023313, title: 'The Conjuring: Last Rites' }
];

interface MovieData {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  genres: Array<{ id: number; name: string }>;
  runtime: number;
  original_language: string;
  credits: {
    cast: Array<{ name: string }>;
  };
}

async function fetchMovieData(tmdbId: number): Promise<MovieData> {
  const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch movie ${tmdbId}: ${response.statusText}`);
  }
  return response.json();
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function addConjuringMovies() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🎬 Adding The Conjuring movies from TMDB...\n');
  
  let addedCount = 0;
  let skippedCount = 0;
  
  for (const conjuringMovie of CONJURING_MOVIES) {
    try {
      console.log(`📽️  Processing: ${conjuringMovie.title}`);
      
      // Check if movie already exists
      const slug = generateSlug(conjuringMovie.title);
      const existingMovie = data.movies.find((m: any) => m.slug === slug);
      
      if (existingMovie) {
        console.log(`   ⚠️  Already exists, skipping...`);
        skippedCount++;
        continue;
      }
      
      // Fetch movie data from TMDB
      const movieData = await fetchMovieData(conjuringMovie.tmdbId);
      
      // Get cast (top 10 actors)
      const cast = movieData.credits?.cast
        ?.slice(0, 10)
        .map((actor) => actor.name)
        .join(', ') || '';
      
      // Determine rating based on genre (Horror movies are typically R/TV-MA)
      const rating = 'R';
      
      // Get language
      const language = movieData.original_language === 'en' ? 'English' : 
                       movieData.original_language === 'es' ? 'Spanish' :
                       movieData.original_language === 'fr' ? 'French' :
                       movieData.original_language === 'de' ? 'German' :
                       movieData.original_language === 'ja' ? 'Japanese' :
                       movieData.original_language === 'ko' ? 'Korean' : 'English';
      
      // Create movie object
      const movie = {
        id: generateId(),
        title: movieData.title,
        slug: slug,
        description: movieData.overview || '',
        posterUrl: movieData.poster_path ? `${TMDB_IMAGE_BASE}${movieData.poster_path}` : '',
        backdropUrl: movieData.backdrop_path ? `${TMDB_IMAGE_BASE}${movieData.backdrop_path}` : '',
        year: movieData.release_date ? new Date(movieData.release_date).getFullYear() : 2023,
        rating: rating,
        imdbRating: movieData.vote_average ? movieData.vote_average.toFixed(1) : '0.0',
        genres: movieData.genres?.map((g) => g.name).join(', ') || 'Horror',
        category: 'Horror',
        duration: movieData.runtime || 112,
        language: language,
        cast: cast,
        googleDriveUrl: 'https://drive.google.com/file/d/PLACEHOLDER/preview',
        isTrending: false,
        isFeatured: false
      };
      
      // Add to movies array
      data.movies.push(movie);
      
      console.log(`   ✅ Added: ${movie.title} (${movie.year})`);
      console.log(`      Rating: ${movie.imdbRating}/10`);
      console.log(`      Duration: ${movie.duration} min`);
      console.log(`      Genres: ${movie.genres}`);
      
      addedCount++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      console.error(`   ❌ Error processing ${conjuringMovie.title}:`, error);
    }
  }
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n\n📊 Summary:');
  console.log(`   Movies added: ${addedCount}`);
  console.log(`   Movies skipped (already exist): ${skippedCount}`);
  console.log(`   Total movies in database: ${data.movies.length}`);
  console.log('\n✅ The Conjuring movies added successfully!');
  console.log('   Note: Google Drive URLs are set to PLACEHOLDER - update them later');
}

addConjuringMovies().catch(console.error);
