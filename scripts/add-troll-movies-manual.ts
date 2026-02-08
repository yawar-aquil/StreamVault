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

const trollMoviesData = [
  {
    title: 'Troll',
    slug: 'troll',
    year: 2022,
    category: 'action',
    description: 'Deep in the Dovre mountain, something gigantic wakes up after a thousand years in captivity. The creature destroys everything in its path and quickly approaches Oslo.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/9z4jRr43JdtU66P0iy8h18OyLql.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/53BC9F2tpZnsGno2cLhzvGprDYS.jpg',
    rating: 'TV-PG',
    imdbRating: 5.8,
    duration: 103,
    genres: 'Action, Adventure, Fantasy',
    language: 'NO',
    cast: 'Ine Marie Wilmann, Kim Falck, Mads Sjøgård Pettersen, Gard B. Eidsvold, Pål Richard Lunderby',
    director: 'Roar Uthaug',
    driveUrl: 'https://drive.google.com/file/d/1xrobEqF8NFcVZ38RzcJOvY13Egh0Apr1/preview'
  },
  {
    title: 'Troll 2',
    slug: 'troll-2',
    year: 2025,
    category: 'action',
    description: 'The sequel to the 2022 Norwegian monster film Troll. The ancient troll returns with even more destruction and chaos.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/rGBYMJdMXlEJLlLMRdEJXuZrjQN.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/aOphtwKmhjcohU1cdL6jbEZynvT.jpg',
    rating: 'TV-PG',
    imdbRating: 6.0,
    duration: 110,
    genres: 'Action, Adventure, Fantasy',
    language: 'NO',
    cast: 'Ine Marie Wilmann, Kim Falck, Mads Sjøgård Pettersen',
    director: 'Roar Uthaug',
    driveUrl: 'https://drive.google.com/file/d/1NqAr3Lnc7VoV61g7HFQbxuiGjbHj-zVr/preview'
  }
];

function addTrollMovies() {
  console.log('🧌 Adding Troll movies manually...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  for (const movieData of trollMoviesData) {
    console.log(`\n📽️  Processing: ${movieData.title} (${movieData.year})`);

    // Check if movie already exists
    const existingMovie = data.movies.find(
      m => m.title.toLowerCase() === movieData.title.toLowerCase() && m.year === movieData.year
    );

    if (existingMovie) {
      console.log(`   ⚠️  Movie already exists, skipping...`);
      continue;
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
      featured: false,
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
    console.log(`      Drive URL: ${movie.googleDriveUrl}`);
  }

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ All Troll movies added successfully!');
  console.log(`\n📊 Total movies in database: ${data.movies.length}`);
}

addTrollMovies();
