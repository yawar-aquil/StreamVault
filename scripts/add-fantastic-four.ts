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

function addFantasticFour() {
  console.log('🦸 Adding The Fantastic Four: First Steps...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  const movieData = {
    title: 'The Fantastic Four: First Steps',
    slug: 'the-fantastic-four-first-steps',
    year: 2025,
    category: 'action',
    description: 'Set in a retro-futuristic 1960s, a family of four gains superpowers after an encounter in space and must band together to fight threats while dealing with family dynamics.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/6fjKXC0SzxYUcrSJ5JECeHJZhEk.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg',
    rating: 'TV-14',
    imdbRating: 7.0,
    duration: 135,
    genres: 'Action, Adventure, Science Fiction',
    language: 'EN',
    cast: 'Pedro Pascal, Vanessa Kirby, Joseph Quinn, Ebon Moss-Bachrach, Julia Garner',
    director: 'Matt Shakman',
    driveUrl: 'https://drive.google.com/file/d/1psNVBbLnDgUxhRgg68-OQs7IIhQoDNh1/preview'
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
    trending: true,
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
  console.log(`      Trending: ${movie.trending}`);
  console.log(`      Drive URL: ${movie.googleDriveUrl}`);

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ The Fantastic Four: First Steps added successfully!');
  console.log(`\n📊 Total movies in database: ${data.movies.length}`);
}

addFantasticFour();
