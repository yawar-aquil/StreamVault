import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
const englishShowsFile = 'C:\\Users\\yawar\\Desktop\\extracted shows\\english\\extraction_checkpoint.json';

async function searchTMDB(query: string): Promise<any> {
  const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  return response.json();
}

async function fetchTMDBShow(tmdbId: number): Promise<any> {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,content_ratings`;
  const response = await fetch(url);
  return response.json();
}

async function fetchTMDBSeason(tmdbId: number, seasonNumber: number): Promise<any> {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

function extractDriveId(driveUrl: string): string {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}

function generateSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function cleanShowName(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/online/gi, '')
    .replace(/english dubbed/gi, '')
    .replace(/tv series/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

async function addShow(showName: string, seasonsData: any, data: any) {
  console.log(`\n📺 Adding: ${showName}`);
  
  // Clean the show name for TMDB search
  const searchName = showName
    .replace(/online/gi, '')
    .replace(/english dubbed/gi, '')
    .replace(/tv series/gi, '')
    .trim();
  
  // Search TMDB
  const searchResults = await searchTMDB(searchName);
  if (!searchResults.results || searchResults.results.length === 0) {
    console.log(`   ❌ Not found on TMDB`);
    return 0;
  }

  const tmdbId = searchResults.results[0].id;
  console.log(`   ✓ TMDB ID: ${tmdbId}`);

  // Fetch full show details
  const tmdbShow = await fetchTMDBShow(tmdbId);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Get US content rating or default
  const usRating = tmdbShow.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
  const rating = usRating?.rating || 'TV-14';
  
  // Create show
  const show = {
    id: uuidv4(),
    title: tmdbShow.name,
    slug: generateSlug(tmdbShow.name),
    description: tmdbShow.overview || '',
    posterUrl: tmdbShow.poster_path ? `${TMDB_IMAGE_BASE}${tmdbShow.poster_path}` : '',
    backdropUrl: tmdbShow.backdrop_path ? `${TMDB_IMAGE_BASE}${tmdbShow.backdrop_path}` : '',
    year: tmdbShow.first_air_date ? parseInt(tmdbShow.first_air_date.split('-')[0]) : 2024,
    rating: rating,
    imdbRating: tmdbShow.vote_average ? tmdbShow.vote_average.toFixed(1) : null,
    genres: tmdbShow.genres?.map((g: any) => g.name).join(', ') || '',
    language: 'English',
    totalSeasons: tmdbShow.number_of_seasons || Object.keys(seasonsData).length,
    cast: tmdbShow.credits?.cast?.slice(0, 5).map((c: any) => c.name).join(', ') || '',
    creators: tmdbShow.created_by?.map((c: any) => c.name).join(', ') || '',
    featured: false,
    trending: false,
    category: tmdbShow.genres?.[0]?.name?.toLowerCase() || 'drama',
  };

  data.shows.push(show);
  console.log(`   ✅ Show added: ${show.title}`);

  // Add episodes
  let episodesAdded = 0;
  
  for (const [seasonKey, episodes] of Object.entries(seasonsData)) {
    const seasonMatch = seasonKey.match(/Season (\d+)/i);
    if (!seasonMatch) continue;

    const seasonNumber = parseInt(seasonMatch[1]);

    // Fetch TMDB season data
    let tmdbSeason: any = null;
    try {
      tmdbSeason = await fetchTMDBSeason(tmdbId, seasonNumber);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`      ⚠️  Could not fetch TMDB season ${seasonNumber} data`);
    }

    for (const ep of episodes as any[]) {
      const episodeNumber = ep.episode;
      const driveId = extractDriveId(ep.video_source.direct_link || ep.video_source.embed_code);
      
      if (!driveId) {
        console.log(`      ❌ S${seasonNumber}E${episodeNumber} - No valid Drive ID`);
        continue;
      }

      const tmdbEpisode = tmdbSeason?.episodes?.find((e: any) => e.episode_number === episodeNumber);

      const episode = {
        id: uuidv4(),
        showId: show.id,
        season: seasonNumber,
        episodeNumber: episodeNumber,
        title: tmdbEpisode?.name || `Episode ${episodeNumber}`,
        description: tmdbEpisode?.overview || '',
        thumbnailUrl: tmdbEpisode?.still_path 
          ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` 
          : show.posterUrl,
        duration: tmdbEpisode?.runtime || 45,
        googleDriveUrl: `https://drive.google.com/file/d/${driveId}/view`,
        videoUrl: null,
        airDate: tmdbEpisode?.air_date || '',
      };

      data.episodes.push(episode);
      episodesAdded++;
    }
  }

  console.log(`   ✅ Added ${episodesAdded} episodes`);
  return episodesAdded;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const englishData = JSON.parse(fs.readFileSync(englishShowsFile, 'utf-8'));
  
  const englishShows = englishData.all_results['English Seasons'];
  
  console.log('🎬 Checking English shows...\n');
  console.log(`📊 Found ${Object.keys(englishShows).length} shows in extraction file\n`);

  const missingShows: any[] = [];
  const existingShows: string[] = [];

  // First, check which shows are missing
  for (const showName of Object.keys(englishShows)) {
    const cleanName = cleanShowName(showName);
    
    const show = data.shows.find((s: any) => {
      const dbTitle = cleanShowName(s.title);
      return dbTitle.includes(cleanName) || cleanName.includes(dbTitle);
    });

    if (!show) {
      missingShows.push(showName);
    } else {
      existingShows.push(showName);
    }
  }

  console.log(`✅ Already in database: ${existingShows.length}`);
  console.log(`❌ Missing from database: ${missingShows.length}\n`);

  if (missingShows.length === 0) {
    console.log('✅ All shows already exist in the database!');
    return;
  }

  console.log('📝 Missing shows:');
  missingShows.forEach((name, i) => console.log(`   ${i + 1}. ${name}`));
  console.log('\n🚀 Adding missing shows...\n');

  let totalEpisodes = 0;
  let showsAdded = 0;

  for (const showName of missingShows) {
    try {
      const episodesAdded = await addShow(showName, englishShows[showName], data);
      if (episodesAdded > 0) {
        totalEpisodes += episodesAdded;
        showsAdded++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error processing ${showName}:`, error);
    }
  }

  // Save data
  console.log('\n💾 Saving data...');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

  console.log('\n\n📊 SUMMARY:');
  console.log('='.repeat(80));
  console.log(`Shows added: ${showsAdded}`);
  console.log(`Episodes added: ${totalEpisodes}`);
  console.log('\n✅ Complete!');
}

main().catch(console.error);
