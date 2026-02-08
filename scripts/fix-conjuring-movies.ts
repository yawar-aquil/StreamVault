import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// Correct The Conjuring movies TMDB IDs
const CONJURING_MOVIES = [
  { tmdbId: 138843, expectedTitle: 'The Conjuring' },
  { tmdbId: 252194, expectedTitle: 'The Conjuring 2' },
  { tmdbId: 423108, expectedTitle: 'The Conjuring: The Devil Made Me Do It' }
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

async function fixConjuringMovies() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🧹 Removing incorrectly added movies...\n');
  
  // Remove wrong movies
  const wrongTitles = ['Prelude to Happiness', 'The Exorcist'];
  wrongTitles.forEach(title => {
    const index = data.movies.findIndex((m: any) => m.title === title);
    if (index !== -1) {
      data.movies.splice(index, 1);
      console.log(`   ✅ Removed: ${title}`);
    }
  });
  
  // Also remove if "The Conjuring: The Devil Made Me Do It" already exists
  const existingIndex = data.movies.findIndex((m: any) => 
    m.title === 'The Conjuring: The Devil Made Me Do It'
  );
  if (existingIndex !== -1) {
    console.log(`   ℹ️  "The Conjuring: The Devil Made Me Do It" already exists, will update it`);
  }
  
  console.log('\n🎬 Adding The Conjuring movies from TMDB...\n');
  
  let addedCount = 0;
  let updatedCount = 0;
  
  for (const conjuringMovie of CONJURING_MOVIES) {
    try {
      console.log(`📽️  Processing: ${conjuringMovie.expectedTitle}`);
      
      // Fetch movie data from TMDB
      const movieData = await fetchMovieData(conjuringMovie.tmdbId);
      
      console.log(`   Fetched: ${movieData.title}`);
      
      // Get cast (top 10 actors)
      const cast = movieData.credits?.cast
        ?.slice(0, 10)
        .map((actor) => actor.name)
        .join(', ') || '';
      
      // Determine rating based on genre (Horror movies are typically R)
      const rating = 'R';
      
      // Get language
      const language = movieData.original_language === 'en' ? 'English' : 
                       movieData.original_language === 'es' ? 'Spanish' :
                       movieData.original_language === 'fr' ? 'French' :
                       movieData.original_language === 'de' ? 'German' :
                       movieData.original_language === 'ja' ? 'Japanese' :
                       movieData.original_language === 'ko' ? 'Korean' : 'English';
      
      const slug = generateSlug(movieData.title);
      
      // Check if movie already exists
      const existingMovieIndex = data.movies.findIndex((m: any) => m.slug === slug);
      
      // Create movie object
      const movie = {
        id: existingMovieIndex !== -1 ? data.movies[existingMovieIndex].id : generateId(),
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
        googleDriveUrl: existingMovieIndex !== -1 ? 
          data.movies[existingMovieIndex].googleDriveUrl : 
          'https://drive.google.com/file/d/PLACEHOLDER/preview',
        isTrending: false,
        isFeatured: false
      };
      
      if (existingMovieIndex !== -1) {
        // Update existing movie
        data.movies[existingMovieIndex] = movie;
        console.log(`   ✅ Updated: ${movie.title} (${movie.year})`);
        updatedCount++;
      } else {
        // Add new movie
        data.movies.push(movie);
        console.log(`   ✅ Added: ${movie.title} (${movie.year})`);
        addedCount++;
      }
      
      console.log(`      Rating: ${movie.imdbRating}/10`);
      console.log(`      Duration: ${movie.duration} min`);
      console.log(`      Genres: ${movie.genres}`);
      console.log(`      Cast: ${cast.split(', ').slice(0, 3).join(', ')}...`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`   ❌ Error processing ${conjuringMovie.expectedTitle}:`, error);
    }
  }
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n\n📊 Summary:');
  console.log(`   Movies added: ${addedCount}`);
  console.log(`   Movies updated: ${updatedCount}`);
  console.log(`   Total movies in database: ${data.movies.length}`);
  console.log('\n✅ The Conjuring movies processed successfully!');
  console.log('   Note: Google Drive URLs are set to PLACEHOLDER - update them later');
}

fixConjuringMovies().catch(console.error);
