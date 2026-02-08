import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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

function addCaptainMarvel() {
  console.log('🦸‍♀️ Adding Captain Marvel...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  const movieData = {
    title: 'Captain Marvel',
    slug: 'captain-marvel',
    year: 2019,
    category: 'action',
    description: 'The story follows Carol Danvers as she becomes one of the universe\'s most powerful heroes when Earth is caught in the middle of a galactic war between two alien races. Set in the 1990s, Captain Marvel is an all-new adventure from a previously unseen period in the history of the Marvel Cinematic Universe.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/w2PMyoyLU22YvrGK3smVM9fW1jj.jpg',
    rating: 'TV-14',
    imdbRating: 6.8,
    duration: 124,
    genres: 'Action, Adventure, Science Fiction',
    language: 'EN',
    cast: 'Brie Larson, Samuel L. Jackson, Ben Mendelsohn, Jude Law, Annette Bening',
    director: 'Anna Boden, Ryan Fleck',
    driveUrl: 'https://drive.google.com/file/d/1hIj-7OQ6ebt8Z3wtZNPYpEl9Md6Sqduc/preview'
  };

  console.log(`📽️  Processing: ${movieData.title} (${movieData.year})`);

  // Check if movie already exists
  const existingMovie = data.movies.find(
    m => m.title.toLowerCase() === movieData.title.toLowerCase() && m.year === movieData.year
  );

  if (existingMovie) {
    console.log(`   ⚠️  Movie already exists, skipping...`);
    return;
  }

  const movie: Movie = {
    id: generateId(),
    title: movieData.title,
    slug: movieData.slug,
    year: movieData.year,
    category: movieData.category,
    description: movieData.description,
    posterUrl: movieData.posterUrl,
    backdropUrl: movieData.backdropUrl,
    rating: movieData.rating,
    imdbRating: movieData.imdbRating,
    duration: movieData.duration,
    genres: movieData.genres,
    language: movieData.language,
    cast: movieData.cast,
    director: movieData.director,
    featured: true,
    trending: false,
    googleDriveUrl: movieData.driveUrl,
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
  console.log(`      Featured: ${movie.featured}`);
  console.log(`      Drive URL: ${movie.googleDriveUrl}`);

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ Captain Marvel added successfully!');
  console.log(`\n📊 Total movies in database: ${data.movies.length}`);
}

addCaptainMarvel();
