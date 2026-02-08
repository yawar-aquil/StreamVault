import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

interface Movie {
  id: string;
  title: string;
  slug: string;
  year: number;
  category: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  rating: string;
  imdbRating: number;
  duration: number;
  genres: string;
  language: string;
  cast: string;
  director: string;
  featured: boolean;
  trending: boolean;
  googleDriveUrl: string;
  videoUrl: string | null;
}

interface Data {
  shows: any[];
  episodes: any[];
  movies: Movie[];
  comments: any[];
  watchlist: any[];
  progress: any[];
  contentRequests: any[];
  issueReports: any[];
}

const halloweenMovies = [
  {
    title: 'Halloween Ends',
    year: 2022,
    tmdbId: 616820,
    driveUrl: 'https://drive.google.com/file/d/1J_YFJ4lhXlJV2ewnfRiZ3NZ6bpuis5oN/view?usp=drive_link'
  },
  {
    title: 'Halloween Kills',
    year: 2021,
    tmdbId: 610253,
    driveUrl: 'https://drive.google.com/file/d/1jjsbJGQY0EtgaL2ntu1zsjxBBicJS4hJ/view?usp=drive_link'
  },
  {
    title: 'Halloween',
    year: 2018,
    tmdbId: 424139,
    driveUrl: 'https://drive.google.com/file/d/1o115l40tD-uFpFZ2LMkm98z61xzXN3tH/view?usp=drive_link'
  }
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extractDriveId(url: string): string {
  const match = url.match(/\/d\/([^\/]+)/);
  return match ? match[1] : '';
}

function mapGenres(genres: any[]): string {
  return genres.map(g => g.name).join(', ');
}

function mapRating(voteAverage: number): string {
  if (voteAverage >= 8) return 'TV-MA';
  if (voteAverage >= 7) return 'TV-14';
  if (voteAverage >= 6) return 'TV-PG';
  return 'TV-G';
}

function mapCategory(genres: any[]): string {
  const genreNames = genres.map(g => g.name.toLowerCase());
  if (genreNames.includes('horror')) return 'horror';
  if (genreNames.includes('thriller')) return 'thriller';
  if (genreNames.includes('action')) return 'action';
  if (genreNames.includes('drama')) return 'drama';
  if (genreNames.includes('comedy')) return 'comedy';
  return 'other';
}

async function fetchMovieDetails(tmdbId: number) {
  const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch movie ${tmdbId}: ${response.statusText}`);
  }
  return response.json();
}

async function addHalloweenMovies() {
  console.log('🎬 Adding Halloween movies...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  for (const movieInfo of halloweenMovies) {
    console.log(`\n📽️  Processing: ${movieInfo.title} (${movieInfo.year})`);

    // Check if movie already exists
    const existingMovie = data.movies.find(
      m => m.title.toLowerCase() === movieInfo.title.toLowerCase() && m.year === movieInfo.year
    );

    if (existingMovie) {
      console.log(`   ⚠️  Movie already exists, skipping...`);
      continue;
    }

    try {
      // Fetch TMDB data
      console.log(`   🔍 Fetching data from TMDB...`);
      const tmdbData = await fetchMovieDetails(movieInfo.tmdbId);

      // Extract cast (top 5 actors)
      const cast = tmdbData.credits.cast
        .slice(0, 5)
        .map((actor: any) => actor.name)
        .join(', ');

      // Extract director
      const director = tmdbData.credits.crew
        .find((person: any) => person.job === 'Director')?.name || 'Unknown';

      // Create movie object
      const movie: Movie = {
        id: generateId(),
        title: tmdbData.title,
        slug: generateSlug(tmdbData.title),
        year: new Date(tmdbData.release_date).getFullYear(),
        category: mapCategory(tmdbData.genres),
        description: tmdbData.overview,
        posterUrl: tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : '',
        backdropUrl: tmdbData.backdrop_path ? `${TMDB_IMAGE_BASE}${tmdbData.backdrop_path}` : '',
        rating: mapRating(tmdbData.vote_average),
        imdbRating: Math.round(tmdbData.vote_average * 10) / 10,
        duration: tmdbData.runtime,
        genres: mapGenres(tmdbData.genres),
        language: tmdbData.original_language.toUpperCase(),
        cast: cast,
        director: director,
        featured: false,
        trending: false,
        googleDriveUrl: extractDriveId(movieInfo.driveUrl),
        videoUrl: null
      };

      data.movies.push(movie);

      console.log(`   ✅ Added: ${movie.title}`);
      console.log(`      Slug: ${movie.slug}`);
      console.log(`      Year: ${movie.year}`);
      console.log(`      Category: ${movie.category}`);
      console.log(`      Rating: ${movie.rating}`);
      console.log(`      IMDb: ${movie.imdbRating}/10`);
      console.log(`      Duration: ${movie.duration} min`);
      console.log(`      Genres: ${movie.genres}`);
      console.log(`      Director: ${movie.director}`);
      console.log(`      Cast: ${movie.cast}`);

    } catch (error: any) {
      console.error(`   ❌ Error processing ${movieInfo.title}:`, error.message);
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ All Halloween movies added successfully!');
  console.log(`\n📊 Total movies in database: ${data.movies.length}`);
}

addHalloweenMovies().catch(console.error);
