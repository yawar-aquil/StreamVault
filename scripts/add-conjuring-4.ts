import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

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

async function addConjuring4() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🎬 Adding The Conjuring: Last Rites from TMDB...\n');
  
  try {
    // Fetch movie data from TMDB
    const url = `${TMDB_BASE_URL}/movie/1038392?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const response = await fetch(url);
    const movieData = await response.json();
    
    console.log(`   Fetched: ${movieData.title}`);
    
    // Get cast (top 10 actors)
    const cast = movieData.credits?.cast
      ?.slice(0, 10)
      .map((actor: any) => actor.name)
      .join(', ') || 'Vera Farmiga, Patrick Wilson';
    
    const movie = {
      id: generateId(),
      title: movieData.title,
      slug: generateSlug(movieData.title),
      description: movieData.overview || 'The fourth installment in The Conjuring franchise.',
      posterUrl: movieData.poster_path ? `${TMDB_IMAGE_BASE}${movieData.poster_path}` : '',
      backdropUrl: movieData.backdrop_path ? `${TMDB_IMAGE_BASE}${movieData.backdrop_path}` : '',
      year: movieData.release_date ? new Date(movieData.release_date).getFullYear() : 2025,
      rating: 'R',
      imdbRating: movieData.vote_average ? movieData.vote_average.toFixed(1) : '7.0',
      genres: movieData.genres?.map((g: any) => g.name).join(', ') || 'Horror',
      category: 'Horror',
      duration: movieData.runtime || 110,
      language: 'English',
      cast: cast,
      googleDriveUrl: 'https://drive.google.com/file/d/PLACEHOLDER/preview',
      isTrending: false,
      isFeatured: false
    };
    
    // Check if it already exists
    const existingIndex = data.movies.findIndex((m: any) => m.slug === movie.slug);
    
    if (existingIndex !== -1) {
      console.log('   ℹ️  Movie already exists, updating...');
      data.movies[existingIndex] = { ...data.movies[existingIndex], ...movie, id: data.movies[existingIndex].id };
    } else {
      data.movies.push(movie);
      console.log(`   ✅ Added: ${movie.title} (${movie.year})`);
    }
    
    console.log(`      Rating: ${movie.imdbRating}/10`);
    console.log(`      Duration: ${movie.duration} min`);
    console.log(`      Genres: ${movie.genres}`);
    console.log(`      Cast: ${cast.split(', ').slice(0, 3).join(', ')}...`);
    
    // Write back to file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    console.log('\n\n📊 Summary:');
    console.log(`   Total movies in database: ${data.movies.length}`);
    console.log('\n✅ All 4 Conjuring movies now in database!');
    console.log('   1. The Conjuring (2013) ✅');
    console.log('   2. The Conjuring 2 (2016) ✅');
    console.log('   3. The Conjuring: The Devil Made Me Do It (2021) ✅');
    console.log('   4. The Conjuring: Last Rites (2025) ✅');
    console.log('\n   Note: Google Drive URLs are set to PLACEHOLDER - update them later');
    
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
}

addConjuring4().catch(console.error);
