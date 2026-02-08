import { storage } from "../server/storage.js";

const TMDB_API_KEY = "920654cb695ee99175e53d6da8dc2edf";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";
const PLACEHOLDER_URL = "https://drive.google.com/file/d/PLACEHOLDER/preview";

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
  spoken_languages: { english_name: string }[];
}

interface TMDBCredits {
  cast: { name: string }[];
  crew: { name: string; job: string }[];
}

// Top Hollywood movies
const hollywoodMovies = [
  "The Shawshank Redemption", "The Godfather", "The Dark Knight", "Pulp Fiction",
  "Forrest Gump", "Inception", "Fight Club", "The Matrix", "Goodfellas",
  "The Lord of the Rings: The Return of the King", "Star Wars", "Interstellar",
  "The Silence of the Lambs", "Saving Private Ryan", "The Green Mile", "Se7en",
  "The Prestige", "The Departed", "Gladiator", "The Lion King", "Back to the Future",
  "The Usual Suspects", "The Pianist", "Terminator 2", "American History X",
  "The Avengers", "Joker", "Spider-Man: No Way Home", "Avatar", "Titanic",
  "Jurassic Park", "The Truman Show", "Braveheart", "The Sixth Sense", "Memento",
  "Django Unchained", "WALL-E", "The Shining", "Alien", "Blade Runner",
  "Mad Max: Fury Road", "The Grand Budapest Hotel", "Whiplash", "La La Land",
  "Parasite", "Get Out", "A Quiet Place", "Dunkirk", "1917", "Oppenheimer",
  "Everything Everywhere All at Once", "Top Gun: Maverick", "Dune", "No Country for Old Men",
  "There Will Be Blood", "The Social Network", "Gone Girl", "Zodiac",
  "Prisoners", "Arrival", "Blade Runner 2049", "The Revenant", "Birdman",
  "12 Years a Slave", "Moonlight", "The Shape of Water", "Roma", "Nomadland",
  "The Father", "CODA", "The Whale", "Tár", "The Fabelmans",
  "Black Panther", "Captain America: Civil War", "Thor: Ragnarok", "Guardians of the Galaxy",
  "Iron Man", "Doctor Strange", "Shang-Chi", "Black Widow", "Eternals",
  "The Batman", "The Suicide Squad", "Wonder Woman", "Aquaman", "Shazam",
  "Man of Steel", "Justice League", "Birds of Prey", "The Flash", "Blue Beetle",
  "Mission: Impossible - Fallout", "Top Gun", "Edge of Tomorrow", "Oblivion",
  "The Bourne Identity", "Casino Royale", "Skyfall", "Spectre", "No Time to Die",
  "John Wick: Chapter 4", "John Wick: Chapter 2", "John Wick: Chapter 3", "Atomic Blonde",
  "Baby Driver", "Drive", "Heat", "Collateral", "The Town", "The Departed"
];

// Top Bollywood movies
const bollywoodMovies = [
  "3 Idiots", "Dangal", "PK", "Bajrangi Bhaijaan", "Lagaan", "Taare Zameen Par",
  "Dil Chahta Hai", "Zindagi Na Milegi Dobara", "Rang De Basanti", "Swades",
  "Chak De India", "Queen", "Barfi", "Andhadhun", "Drishyam", "Kahaani",
  "Gangs of Wasseypur", "Tumbbad", "Haider", "Omkara", "Maqbool",
  "Rockstar", "Tamasha", "Highway", "Udta Punjab", "Masaan",
  "Newton", "Article 15", "Thappad", "Pink", "Mulk",
  "Raazi", "Uri: The Surgical Strike", "Shershaah", "83", "Chhapaak",
  "Gully Boy", "Zindagi Na Milegi Dobara", "Dil Dhadakne Do", "Kapoor & Sons",
  "Dear Zindagi", "English Vinglish", "Piku", "October", "Badhaai Ho",
  "Stree", "Bala", "Luka Chuppi", "Bareilly Ki Barfi", "Shubh Mangal Saavdhan",
  "Toilet: Ek Prem Katha", "Pad Man", "Mission Mangal", "Kesari", "Tanhaji",
  "Bajirao Mastani", "Padmaavat", "Goliyon Ki Raasleela Ram-Leela", "Sanju", "Ranbir Kapoor",
  "War", "Pathaan", "Tiger Zinda Hai", "Ek Tha Tiger", "Jawan",
  "Dunki", "Animal", "Rocky Aur Rani Kii Prem Kahaani", "Brahmastra", "RRR",
  "KGF Chapter 2", "KGF Chapter 1", "Pushpa", "Baahubali 2", "Baahubali",
  "Singham", "Simmba", "Sooryavanshi", "Singham Returns", "Golmaal",
  "Housefull", "Welcome", "Hera Pheri", "Phir Hera Pheri", "Bhool Bhulaiyaa",
  "Bhool Bhulaiyaa 2", "Dhamaal", "Total Dhamaal", "Fukrey", "Fukrey Returns",
  "Stree 2", "Bhediya", "Munjya", "Roohi", "Go Goa Gone"
];

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function searchMovie(query: string) {
  const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const data = await fetchWithRetry(url);
  return data.results;
}

async function getMovieDetails(movieId: number): Promise<TMDBMovie> {
  const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
  return await fetchWithRetry(url);
}

async function getMovieCredits(movieId: number): Promise<TMDBCredits> {
  const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
  return await fetchWithRetry(url);
}

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRating(voteAverage: number): string {
  if (voteAverage >= 8) return "R";
  if (voteAverage >= 6) return "PG-13";
  return "PG";
}

async function addMovie(movieTitle: string, index: number, total: number) {
  try {
    console.log(`\n[${index}/${total}] 🎬 Searching: ${movieTitle}`);

    const searchResults = await searchMovie(movieTitle);
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`   ⚠️  Not found, skipping...`);
      return false;
    }

    const selectedMovie = searchResults[0];
    const slug = createSlug(selectedMovie.title);

    // Check if already exists
    const existingMovie = await storage.getMovieBySlug(slug);
    if (existingMovie) {
      console.log(`   ⏭️  Already exists, skipping...`);
      return false;
    }

    // Get details
    const movieDetails = await getMovieDetails(selectedMovie.id);
    const credits = await getMovieCredits(selectedMovie.id);

    const movie = await storage.createMovie({
      title: movieDetails.title,
      slug,
      description: movieDetails.overview || "No description available.",
      posterUrl: movieDetails.poster_path
        ? `${TMDB_IMAGE_BASE}${movieDetails.poster_path}`
        : "",
      backdropUrl: movieDetails.backdrop_path
        ? `${TMDB_IMAGE_BASE}${movieDetails.backdrop_path}`
        : "",
      year: parseInt(movieDetails.release_date?.split("-")[0] || "2024"),
      rating: getRating(movieDetails.vote_average),
      imdbRating: movieDetails.vote_average.toFixed(1),
      genres: movieDetails.genres.map((g) => g.name).join(", "),
      language: movieDetails.spoken_languages[0]?.english_name || "English",
      duration: movieDetails.runtime || 120,
      cast: credits.cast
        .slice(0, 10)
        .map((c) => c.name)
        .join(", "),
      directors: credits.crew
        .filter((c) => c.job === "Director")
        .map((c) => c.name)
        .join(", "),
      googleDriveUrl: PLACEHOLDER_URL,
      featured: index <= 10, // First 10 are featured
      trending: index <= 20, // First 20 are trending
      category: movieDetails.genres[0]?.name.toLowerCase() || null,
    });

    console.log(`   ✅ Added: ${movie.title} (${movie.year})`);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 250));
    
    return true;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function addTop200Movies() {
  console.log("\n🎬 Adding Top 200 Movies (Hollywood + Bollywood)\n");
  console.log("=" .repeat(60));

  // Combine and shuffle
  const allMovies = [...hollywoodMovies, ...bollywoodMovies];
  
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < allMovies.length && added < 200; i++) {
    const result = await addMovie(allMovies[i], i + 1, allMovies.length);
    
    if (result === true) {
      added++;
    } else if (result === false) {
      skipped++;
    } else {
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Summary:");
  console.log(`   ✅ Added: ${added} movies`);
  console.log(`   ⏭️  Skipped: ${skipped} movies (already exist)`);
  console.log(`   ❌ Failed: ${failed} movies`);
  console.log("\n🎉 Done! Visit http://localhost:5000/movies\n");
  console.log("💡 Note: All movies have placeholder URLs.");
  console.log("   Update them in the admin panel: http://localhost:5000/admin\n");
}

addTop200Movies();
