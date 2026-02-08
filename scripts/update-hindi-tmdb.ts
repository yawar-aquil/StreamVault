import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

// TMDB IDs for the Hindi shows
const showUpdates = [
  { slug: 'asur', tmdbId: 100911 },
  { slug: 'dayaa', tmdbId: 230930 },
  { slug: 'lakkadbaggey', tmdbId: 303851 },
  { slug: 'khoj-parchaiyon-ke-uss-paar', tmdbId: 280566 },
];

async function fetchTMDBData(tmdbId: number) {
  const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
  const res = await fetch(url);
  return await res.json();
}

function mapCategory(genres: any[]): string {
  const genreNames = genres.map(g => g.name.toLowerCase());
  if (genreNames.includes('action') || genreNames.includes('action & adventure')) return 'action';
  if (genreNames.includes('comedy')) return 'comedy';
  if (genreNames.includes('drama')) return 'drama';
  if (genreNames.includes('horror')) return 'horror';
  if (genreNames.includes('romance')) return 'romance';
  if (genreNames.includes('thriller') || genreNames.includes('mystery') || genreNames.includes('crime')) return 'thriller';
  if (genreNames.includes('sci-fi & fantasy') || genreNames.includes('science fiction')) return 'sci-fi';
  if (genreNames.includes('fantasy')) return 'fantasy';
  if (genreNames.includes('documentary')) return 'documentary';
  if (genreNames.includes('animation')) return 'animation';
  return 'drama';
}

async function updateHindiShows() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  for (const update of showUpdates) {
    console.log(`\nUpdating: ${update.slug} (TMDB ID: ${update.tmdbId})`);
    
    const showIndex = data.shows.findIndex((s: any) => s.slug === update.slug);
    if (showIndex === -1) {
      console.log(`  Show not found in database`);
      continue;
    }
    
    const tmdbData = await fetchTMDBData(update.tmdbId);
    
    if (!tmdbData || tmdbData.success === false) {
      console.log(`  Failed to fetch TMDB data`);
      continue;
    }
    
    // Get cast
    const cast = tmdbData.credits?.cast
      ?.slice(0, 10)
      .map((c: any) => c.name)
      .join(', ') || '';
    
    // Get cast details with photos
    const castDetails = tmdbData.credits?.cast
      ?.slice(0, 10)
      .map((c: any) => ({
        name: c.name,
        character: c.character || '',
        profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      })) || [];
    
    // Update show
    const show = data.shows[showIndex];
    show.title = tmdbData.name || show.title;
    show.description = tmdbData.overview || show.description;
    show.posterUrl = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : show.posterUrl;
    show.backdropUrl = tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : show.backdropUrl;
    show.year = tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.split('-')[0]) : show.year;
    show.imdbRating = tmdbData.vote_average?.toFixed(1) || show.imdbRating;
    show.genres = tmdbData.genres?.map((g: any) => g.name).join(', ') || show.genres;
    show.category = mapCategory(tmdbData.genres || []);
    show.totalSeasons = tmdbData.number_of_seasons || show.totalSeasons;
    show.cast = cast || show.cast;
    show.castDetails = JSON.stringify(castDetails);
    
    console.log(`  Updated: ${show.title}`);
    console.log(`    Poster: ${show.posterUrl ? 'Yes' : 'No'}`);
    console.log(`    Backdrop: ${show.backdropUrl ? 'Yes' : 'No'}`);
    console.log(`    Cast: ${castDetails.length} members`);
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('\n========================================');
  console.log('All shows updated successfully!');
}

updateHindiShows().catch(console.error);
