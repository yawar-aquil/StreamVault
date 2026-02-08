import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const INPUT_FILE = 'C:/Users/yawar/Downloads/dubbed.json';
const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';

// Extract file ID from Google Drive URL
function extractFileId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

async function fetchTMDBShow(query: string) {
  const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (!searchData.results || searchData.results.length === 0) return null;
  
  const showId = searchData.results[0].id;
  const detailUrl = `https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
  const detailRes = await fetch(detailUrl);
  return await detailRes.json();
}

async function fetchEpisodeData(tmdbId: number, season: number, episode: number) {
  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

function mapCategory(genres: any[]): string {
  const genreNames = genres.map(g => g.name.toLowerCase());
  if (genreNames.includes('action') || genreNames.includes('action & adventure')) return 'action';
  if (genreNames.includes('comedy')) return 'comedy';
  if (genreNames.includes('drama')) return 'drama';
  if (genreNames.includes('horror')) return 'horror';
  if (genreNames.includes('romance')) return 'romance';
  if (genreNames.includes('thriller') || genreNames.includes('mystery') || genreNames.includes('crime')) return 'thriller';
  return 'drama';
}

async function addDubbedShows() {
  console.log('Reading data files...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  
  const dubbedShows = inputData['Dubbed Seasons'];
  const existingSlugs = data.shows.map((s: any) => s.slug);
  
  let addedShows = 0;
  let addedEpisodes = 0;
  
  for (const [showKey, seasons] of Object.entries(dubbedShows)) {
    // Clean up show name
    const cleanName = showKey.replace(/\s+online\s+hindi\s+dubbed/i, '').trim();
    console.log(`\nProcessing: ${cleanName}`);
    
    // Search TMDB
    const tmdbData = await fetchTMDBShow(cleanName);
    
    if (!tmdbData) {
      console.log(`  No TMDB data found for: ${cleanName}`);
      continue;
    }
    
    const showId = randomUUID();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-hindi';
    
    if (existingSlugs.includes(slug)) {
      console.log(`  Skipping - already exists: ${slug}`);
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
    
    // Create show entry
    const show = {
      id: showId,
      title: tmdbData.name + ' (Hindi Dubbed)',
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
      language: 'Hindi Dubbed',
      cast: cast,
      castDetails: JSON.stringify(castDetails),
      featured: false,
      trending: false,
    };
    
    data.shows.push(show);
    existingSlugs.push(slug);
    addedShows++;
    console.log(`  Added show: ${show.title} (${show.year})`);
    
    // Add episodes
    for (const [seasonKey, episodes] of Object.entries(seasons as object)) {
      const seasonNum = parseInt(seasonKey.replace('Season ', ''));
      
      for (const ep of episodes as any[]) {
        const epNum = ep.episode;
        const videoUrl = ep.video_source?.type === 'google_drive' && ep.video_source?.direct_link
          ? extractFileId(ep.video_source.direct_link)
          : null;
        
        if (!videoUrl) {
          console.log(`    Skipping S${seasonNum}E${epNum} - no video source`);
          continue;
        }
        
        // Fetch episode data from TMDB
        const epData = await fetchEpisodeData(tmdbData.id, seasonNum, epNum);
        
        const episode = {
          id: randomUUID(),
          showId: showId,
          season: seasonNum,
          episodeNumber: epNum,
          title: epData?.name || `Episode ${epNum}`,
          description: epData?.overview || '',
          thumbnailUrl: epData?.still_path 
            ? `https://image.tmdb.org/t/p/w500${epData.still_path}` 
            : show.backdropUrl,
          duration: epData?.runtime || 45,
          googleDriveUrl: videoUrl,
          airDate: epData?.air_date || null,
        };
        
        data.episodes.push(episode);
        addedEpisodes++;
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`    Season ${seasonNum}: added episodes`);
    }
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n========================================');
  console.log(`Added ${addedShows} shows`);
  console.log(`Added ${addedEpisodes} episodes`);
  console.log('Data saved successfully!');
}

addDubbedShows().catch(console.error);
