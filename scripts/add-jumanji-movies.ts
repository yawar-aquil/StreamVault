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

const jumanjiMovies = [
  {
    title: 'Jumanji',
    slug: 'jumanji',
    year: 1995,
    category: 'action',
    description: 'When siblings Judy and Peter discover an enchanted board game that opens the door to a magical world, they unwittingly invite Alan -- an adult who\'s been trapped inside the game for 26 years -- into their living room. Alan\'s only hope for freedom is to finish the game, which proves risky as all three find themselves running from giant rhinoceroses, evil monkeys and other terrifying creatures.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/vzmL6fP7aPKNKPRTFnZmiUfciyV.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/8wBKXZNod4frLZjAKvZUpVRJyBJ.jpg',
    rating: 'TV-PG',
    imdbRating: 7.1,
    duration: 104,
    genres: 'Adventure, Fantasy, Family',
    language: 'EN',
    cast: 'Robin Williams, Kirsten Dunst, Bonnie Hunt, Bradley Pierce, Jonathan Hyde',
    director: 'Joe Johnston',
    driveUrl: 'https://drive.google.com/file/d/17RWzq3W3K04DBQDuIUVl1e2r8O5kZl3x/preview'
  },
  {
    title: 'Jumanji: Welcome to the Jungle',
    slug: 'jumanji-welcome-to-the-jungle',
    year: 2017,
    category: 'action',
    description: 'Four teenagers in detention discover an old video game console with a game they\'ve never heard of. When they decide to play, they are immediately sucked into the jungle world of Jumanji in the bodies of their avatars. They\'ll have to complete the adventure of their lives filled with fun, thrills and danger or be stuck in the game forever!',
    posterUrl: 'https://image.tmdb.org/t/p/w780/bXrZ5iHBEjH7WMidbUDQ0U2xbmR.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/wrqUiMXttHE4UBFMhLHlN601MZh.jpg',
    rating: 'TV-14',
    imdbRating: 7.0,
    duration: 119,
    genres: 'Adventure, Action, Comedy, Fantasy',
    language: 'EN',
    cast: 'Dwayne Johnson, Kevin Hart, Jack Black, Karen Gillan, Nick Jonas',
    director: 'Jake Kasdan',
    driveUrl: 'https://drive.google.com/file/d/17kB7lnXrjJbKppeYPZETvHZZVumyB2OL/preview'
  }
];

function addJumanjiMovies() {
  console.log('🎲 Adding Jumanji movies...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  for (const movieData of jumanjiMovies) {
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
  console.log('✅ All Jumanji movies added successfully!');
  console.log(`\n📊 Total movies in database: ${data.movies.length}`);
}

addJumanjiMovies();
