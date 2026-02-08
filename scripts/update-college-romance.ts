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

async function updateCollegeRomance() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('💕 Updating College Romance...\n');
  
  const show = data.shows.find((s: any) => s.title.toLowerCase().includes('college romance'));
  
  if (!show) {
    console.log('❌ College Romance not found');
    return;
  }
  
  console.log(`Found: ${show.title} (ID: ${show.id})\n`);
  
  // Search TMDB
  console.log('🔍 Searching TMDB...');
  const searchResults = await searchTMDB('College Romance');
  
  if (!searchResults.results || searchResults.results.length === 0) {
    console.log('❌ Not found on TMDB');
    return;
  }
  
  console.log(`Found ${searchResults.results.length} results:`);
  searchResults.results.slice(0, 5).forEach((result: any, i: number) => {
    console.log(`${i + 1}. ${result.name} (${result.first_air_date?.split('-')[0]}) - ID: ${result.id}`);
  });
  
  // Use the first result (most likely match)
  const tmdbId = searchResults.results[0].id;
  console.log(`\nUsing: ${searchResults.results[0].name} (TMDB ID: ${tmdbId})\n`);
  
  // Fetch full show details
  console.log('📥 Fetching show details...');
  const tmdbShow = await fetchTMDBShow(tmdbId);
  
  // Update show metadata
  const oldTitle = show.title;
  show.title = 'College Romance';
  show.slug = 'college-romance';
  show.description = tmdbShow.overview || show.description;
  show.posterUrl = tmdbShow.poster_path ? `${TMDB_IMAGE_BASE}${tmdbShow.poster_path}` : show.posterUrl;
  show.backdropUrl = tmdbShow.backdrop_path ? `${TMDB_IMAGE_BASE}${tmdbShow.backdrop_path}` : show.backdropUrl;
  show.releaseYear = tmdbShow.first_air_date ? parseInt(tmdbShow.first_air_date.split('-')[0]) : show.releaseYear;
  show.imdbRating = tmdbShow.vote_average ? tmdbShow.vote_average.toFixed(1) : show.imdbRating;
  show.genres = tmdbShow.genres?.map((g: any) => g.name).join(', ') || show.genres;
  show.language = 'Hindi';
  show.totalSeasons = tmdbShow.number_of_seasons || show.totalSeasons;
  show.cast = tmdbShow.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(', ') || show.cast;
  
  console.log(`✅ Updated show: ${oldTitle} → ${show.title}`);
  console.log(`   Poster: ${show.posterUrl.substring(0, 60)}...`);
  console.log(`   Backdrop: ${show.backdropUrl.substring(0, 60)}...`);
  
  // Update episodes
  const episodes = data.episodes.filter((e: any) => e.showId === show.id);
  console.log(`\n📝 Updating ${episodes.length} episodes...`);
  
  const seasons = [...new Set(episodes.map((e: any) => e.season))].sort((a: number, b: number) => a - b);
  
  let updatedCount = 0;
  
  for (const seasonNum of seasons) {
    console.log(`\n   Season ${seasonNum}:`);
    
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
          episode.duration = tmdbEpisode.runtime || 25;
          episode.airDate = tmdbEpisode.air_date || '';
          
          console.log(`      ✅ S${seasonNum}E${episode.episodeNumber}: ${episode.title}`);
          updatedCount++;
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`   ❌ Error fetching Season ${seasonNum}:`, error);
    }
  }
  
  // Save data
  console.log('\n💾 Saving data...');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log(`\n📊 Summary:`);
  console.log(`   Show updated: ${show.title}`);
  console.log(`   Episodes updated: ${updatedCount}`);
  console.log(`\n✅ College Romance updated successfully!`);
}

updateCollegeRomance().catch(console.error);
