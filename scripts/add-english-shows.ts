import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const INPUT_FILE = 'C:/Users/yawar/Downloads/english.json';
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

// Map show names to TMDB search queries (some need adjustment)
const showNameMap: Record<string, string> = {
  'dark matter': 'Dark Matter',
  'fatal attraction': 'Fatal Attraction',
  'kin': 'Kin',
  'locked up vis a vis online english subtitles': 'Vis a Vis',
  'now apocalypse': 'Now Apocalypse',
  'obsession': 'Obsession',
  'rome': 'Rome',
  'sherlock homes jeremy brett': 'Sherlock Holmes',
  'sisyphus the myth   online english dubbed': 'Sisyphus: The Myth',
  'slutever': 'Slutever',
  'the asset': 'The Asset',
  'the hunting wives': 'The Hunting Wives',
  'vienna blood': 'Vienna Blood',
  'wayward': 'Wayward Pines',
  'wynonna earp': 'Wynonna Earp',
};

// Extract file ID from Google Drive URL
function extractFileId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

// Extract video URL from embed code or direct link
function extractVideoUrl(videoSource: any): string {
  if (videoSource.type === 'google_drive') {
    return extractFileId(videoSource.direct_link);
  } else if (videoSource.type === 'html5') {
    // Extract URL from video tag
    const match = videoSource.embed_code.match(/src="([^"]+)"/);
    return match ? match[1] : videoSource.direct_link;
  } else if (videoSource.type === 'mega') {
    // For mega, use the embed URL
    const match = videoSource.embed_code.match(/src="([^"]+)"/);
    return match ? match[1] : videoSource.direct_link;
  }
  return videoSource.direct_link || '';
}

async function fetchTMDBShow(searchQuery: string): Promise<any> {
  try {
    // Search for the show
    const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      console.log(`  No TMDB results for: ${searchQuery}`);
      return null;
    }
    
    const showId = searchData.results[0].id;
    
    // Get detailed show info
    const detailUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const detailRes = await fetch(detailUrl);
    const showData = await detailRes.json();
    
    return showData;
  } catch (error) {
    console.error(`  Error fetching TMDB data for ${searchQuery}:`, error);
    return null;
  }
}

async function fetchTMDBEpisode(showId: number, season: number, episode: number): Promise<any> {
  try {
    const url = `https://api.themoviedb.org/3/tv/${showId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapCategory(genres: any[]): string {
  const genreNames = genres.map(g => g.name.toLowerCase());
  if (genreNames.includes('action') || genreNames.includes('action & adventure')) return 'action';
  if (genreNames.includes('comedy')) return 'comedy';
  if (genreNames.includes('drama')) return 'drama';
  if (genreNames.includes('horror')) return 'horror';
  if (genreNames.includes('romance')) return 'romance';
  if (genreNames.includes('thriller') || genreNames.includes('mystery')) return 'thriller';
  if (genreNames.includes('sci-fi & fantasy') || genreNames.includes('science fiction')) return 'sci-fi';
  if (genreNames.includes('fantasy')) return 'fantasy';
  if (genreNames.includes('documentary')) return 'documentary';
  if (genreNames.includes('animation')) return 'animation';
  return 'drama';
}

async function addEnglishShows() {
  console.log('Reading data files...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  
  const englishShows = inputData['English Seasons'];
  const existingTitles = data.shows.map((s: any) => s.title.toLowerCase());
  
  let addedShows = 0;
  let addedEpisodes = 0;
  let skippedShows = 0;
  
  for (const [showKey, seasons] of Object.entries(englishShows)) {
    const searchQuery = showNameMap[showKey] || showKey;
    console.log(`\nProcessing: ${showKey} -> ${searchQuery}`);
    
    // Check if show already exists
    if (existingTitles.includes(searchQuery.toLowerCase())) {
      console.log(`  Skipping - already exists`);
      skippedShows++;
      continue;
    }
    
    // Fetch TMDB data
    const tmdbData = await fetchTMDBShow(searchQuery);
    
    if (!tmdbData) {
      console.log(`  Skipping - no TMDB data found`);
      continue;
    }
    
    const showId = randomUUID();
    const slug = createSlug(tmdbData.name || searchQuery);
    
    // Check slug doesn't exist
    if (data.shows.some((s: any) => s.slug === slug)) {
      console.log(`  Skipping - slug already exists: ${slug}`);
      skippedShows++;
      continue;
    }
    
    // Get cast
    const cast = tmdbData.credits?.cast
      ?.slice(0, 10)
      .map((c: any) => c.name)
      .join(', ') || '';
    
    // Create show entry
    const show = {
      id: showId,
      title: tmdbData.name,
      slug: slug,
      description: tmdbData.overview || '',
      posterUrl: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : '',
      backdropUrl: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}` : '',
      year: tmdbData.first_air_date ? parseInt(tmdbData.first_air_date.split('-')[0]) : 2020,
      rating: tmdbData.adult ? 'TV-MA' : 'TV-14',
      imdbRating: tmdbData.vote_average?.toFixed(1) || '7.0',
      genres: tmdbData.genres?.map((g: any) => g.name).join(', ') || '',
      category: mapCategory(tmdbData.genres || []),
      totalSeasons: Object.keys(seasons as object).length,
      language: 'English',
      cast: cast,
      featured: false,
      trending: false,
    };
    
    data.shows.push(show);
    addedShows++;
    console.log(`  Added show: ${show.title} (${show.year})`);
    
    // Add episodes
    for (const [seasonKey, episodes] of Object.entries(seasons as object)) {
      const seasonNum = parseInt(seasonKey.replace('Season ', ''));
      
      for (const ep of episodes as any[]) {
        const epNum = ep.episode;
        const videoUrl = extractVideoUrl(ep.video_source);
        
        // Fetch episode data from TMDB
        const epData = await fetchTMDBEpisode(tmdbData.id, seasonNum, epNum);
        
        const episode = {
          id: randomUUID(),
          showId: showId,
          season: seasonNum,
          episodeNumber: epNum,
          title: epData?.name || `Episode ${epNum}`,
          description: epData?.overview || '',
          thumbnailUrl: epData?.still_path ? `https://image.tmdb.org/t/p/w500${epData.still_path}` : '',
          duration: epData?.runtime || 45,
          googleDriveUrl: videoUrl,
          airDate: epData?.air_date || null,
        };
        
        data.episodes.push(episode);
        addedEpisodes++;
      }
      
      console.log(`    Season ${seasonNum}: ${(episodes as any[]).length} episodes`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n========================================');
  console.log(`Added ${addedShows} shows`);
  console.log(`Added ${addedEpisodes} episodes`);
  console.log(`Skipped ${skippedShows} shows (already exist)`);
  console.log('Data saved successfully!');
}

addEnglishShows().catch(console.error);
