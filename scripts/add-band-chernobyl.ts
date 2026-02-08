import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

interface DriveEpisode {
  episode: number;
  episode_url: string;
  google_drive_link: string;
}

interface ShowData {
  [season: string]: DriveEpisode[];
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

function extractDriveId(url: string): string {
  const match = url.match(/\/d\/([^\/]+)/);
  return match ? match[1] : '';
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function addShow(
  showName: string,
  tmdbId: number,
  episodeData: ShowData,
  data: any
) {
  console.log(`\n📺 Adding ${showName}...`);
  
  // Fetch TMDB data
  console.log('   🔍 Fetching TMDB data...');
  const tmdbShow = await fetchTMDBShow(tmdbId);
  
  const slug = generateSlug(showName);
  const showId = uuidv4();
  
  // Get US content rating
  const usRating = tmdbShow.content_ratings?.results?.find(
    (r: any) => r.iso_3166_1 === 'US'
  )?.rating || 'TV-MA';
  
  const show = {
    id: showId,
    title: tmdbShow.name || showName,
    slug,
    description: tmdbShow.overview || '',
    posterUrl: tmdbShow.poster_path ? `${TMDB_IMAGE_BASE}${tmdbShow.poster_path}` : '',
    backdropUrl: tmdbShow.backdrop_path ? `${TMDB_IMAGE_BASE}${tmdbShow.backdrop_path}` : '',
    releaseYear: tmdbShow.first_air_date ? parseInt(tmdbShow.first_air_date.split('-')[0]) : 0,
    rating: usRating,
    imdbRating: tmdbShow.vote_average ? tmdbShow.vote_average.toFixed(1) : '0.0',
    genres: tmdbShow.genres?.map((g: any) => g.name).join(', ') || '',
    language: tmdbShow.original_language === 'en' ? 'English' : tmdbShow.original_language,
    totalSeasons: tmdbShow.number_of_seasons || 1,
    cast: tmdbShow.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(', ') || '',
    creators: tmdbShow.created_by?.map((c: any) => c.name).join(', ') || '',
    isTrending: false,
    category: 'drama'
  };
  
  data.shows.push(show);
  console.log(`   ✅ Added show: ${show.title}`);
  
  // Add episodes
  let episodeCount = 0;
  const seasons = Object.keys(episodeData).sort();
  
  for (const seasonKey of seasons) {
    const seasonNumber = parseInt(seasonKey.replace('Season ', ''));
    const episodes = episodeData[seasonKey];
    
    console.log(`   📝 Processing Season ${seasonNumber} (${episodes.length} episodes)...`);
    
    // Fetch season data from TMDB
    const tmdbSeason = await fetchTMDBSeason(tmdbId, seasonNumber);
    
    for (const ep of episodes) {
      const tmdbEpisode = tmdbSeason.episodes?.find((e: any) => e.episode_number === ep.episode);
      
      const episode = {
        id: uuidv4(),
        showId,
        season: seasonNumber,
        episodeNumber: ep.episode,
        title: tmdbEpisode?.name || `Episode ${ep.episode}`,
        description: tmdbEpisode?.overview || '',
        duration: tmdbEpisode?.runtime || 60,
        thumbnailUrl: tmdbEpisode?.still_path 
          ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` 
          : show.posterUrl,
        videoUrl: `https://drive.google.com/file/d/${extractDriveId(ep.google_drive_link)}/preview`,
        airDate: tmdbEpisode?.air_date || ''
      };
      
      data.episodes.push(episode);
      episodeCount++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`   ✅ Added ${episodeCount} episodes`);
}

async function main() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🎬 Adding Band of Brothers and Chernobyl...\n');
  
  // Load episode data
  const bandOfBrothersData: ShowData = JSON.parse(
    fs.readFileSync('C:\\Users\\yawar\\Desktop\\band-of-brothers.json', 'utf-8')
  );
  
  const chernobylData: ShowData = JSON.parse(
    fs.readFileSync('C:\\Users\\yawar\\Desktop\\chernobyl.json', 'utf-8')
  );
  
  // Band of Brothers - TMDB ID: 4613
  await addShow('Band of Brothers', 4613, bandOfBrothersData, data);
  
  // Chernobyl - TMDB ID: 87108
  await addShow('Chernobyl', 87108, chernobylData, data);
  
  // Save data
  console.log('\n💾 Saving data...');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n📊 Summary:');
  console.log(`   Total shows: ${data.shows.length}`);
  console.log(`   Total episodes: ${data.episodes.length}`);
  console.log('\n✅ Done!');
}

main().catch(console.error);
