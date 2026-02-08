import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

async function searchTMDB(query: string) {
  const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  return response.json();
}

async function fetchTMDBShow(tmdbId: number) {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,content_ratings`;
  const response = await fetch(url);
  return response.json();
}

async function fetchTMDBSeason(tmdbId: number, seasonNumber: number) {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

async function updateShow(showSearchName: string, properTitle: string, data: any) {
  console.log(`\n📺 Updating ${properTitle}...`);
  
  const show = data.shows.find((s: any) => 
    s.title.toLowerCase().includes(showSearchName.toLowerCase())
  );
  
  if (!show) {
    console.log(`❌ ${properTitle} not found in database`);
    return;
  }
  
  console.log(`   Found: ${show.title} (ID: ${show.id})`);
  
  // Search TMDB
  console.log(`   🔍 Searching TMDB for "${properTitle}"...`);
  const searchResults = await searchTMDB(properTitle);
  
  if (!searchResults.results || searchResults.results.length === 0) {
    console.log(`   ❌ Not found on TMDB`);
    return;
  }
  
  const tmdbId = searchResults.results[0].id;
  console.log(`   ✅ Found: ${searchResults.results[0].name} (TMDB ID: ${tmdbId})`);
  
  // Fetch full show details
  const tmdbShow = await fetchTMDBShow(tmdbId);
  
  // Update show metadata
  const oldTitle = show.title;
  show.title = tmdbShow.name || properTitle;
  show.slug = show.title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  show.description = tmdbShow.overview || show.description;
  show.posterUrl = tmdbShow.poster_path ? `${TMDB_IMAGE_BASE}${tmdbShow.poster_path}` : show.posterUrl;
  show.backdropUrl = tmdbShow.backdrop_path ? `${TMDB_IMAGE_BASE}${tmdbShow.backdrop_path}` : show.backdropUrl;
  show.releaseYear = tmdbShow.first_air_date ? parseInt(tmdbShow.first_air_date.split('-')[0]) : show.releaseYear;
  show.imdbRating = tmdbShow.vote_average ? tmdbShow.vote_average.toFixed(1) : show.imdbRating;
  show.genres = tmdbShow.genres?.map((g: any) => g.name).join(', ') || show.genres;
  show.totalSeasons = tmdbShow.number_of_seasons || show.totalSeasons;
  show.cast = tmdbShow.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(', ') || show.cast;
  
  const usRating = tmdbShow.content_ratings?.results?.find(
    (r: any) => r.iso_3166_1 === 'US'
  )?.rating;
  if (usRating) show.rating = usRating;
  
  console.log(`   ✅ Updated show: ${oldTitle} → ${show.title}`);
  
  // Update episodes
  const episodes = data.episodes.filter((e: any) => e.showId === show.id);
  console.log(`   📝 Updating ${episodes.length} episodes...`);
  
  const seasons = [...new Set(episodes.map((e: any) => e.season))].sort();
  
  let updatedCount = 0;
  
  for (const seasonNum of seasons) {
    try {
      const tmdbSeason = await fetchTMDBSeason(tmdbId, seasonNum);
      const seasonEpisodes = episodes.filter((e: any) => e.season === seasonNum);
      
      for (const episode of seasonEpisodes) {
        const tmdbEpisode = tmdbSeason.episodes?.find((e: any) => e.episode_number === episode.episodeNumber);
        
        if (tmdbEpisode) {
          episode.title = tmdbEpisode.name || `Episode ${episode.episodeNumber}`;
          episode.description = tmdbEpisode.overview || '';
          episode.thumbnailUrl = tmdbEpisode.still_path 
            ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` 
            : show.posterUrl;
          episode.duration = tmdbEpisode.runtime || 45;
          episode.airDate = tmdbEpisode.air_date || '';
          updatedCount++;
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`   ❌ Error fetching Season ${seasonNum}`);
    }
  }
  
  console.log(`   ✅ Updated ${updatedCount} episodes`);
}

async function main() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🔄 Updating multiple shows with TMDB data...\n');
  
  // List of shows to update: [search name, proper title]
  const showsToUpdate = [
    ['Nympho', 'Nympho'],
    ['Aurora Teagarden', 'Aurora Teagarden Mysteries'],
    ['Sketch', 'Sketch'],
    ['Paurashpur', 'Paurashpur']
  ];
  
  for (const [searchName, properTitle] of showsToUpdate) {
    await updateShow(searchName, properTitle, data);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save data
  console.log('\n💾 Saving data...');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n✅ All shows updated successfully!');
}

main().catch(console.error);
