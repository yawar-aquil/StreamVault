import fs from 'fs';
import path from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

// Load complete shows list to skip
const completeShowsList = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'scripts', 'complete-shows-list.json'), 'utf-8')
);
const completeShows = new Set(completeShowsList.completeShows.map((s: string) => s.toLowerCase()));

interface Episode {
  episode: number;
  video_source: {
    type: string;
    direct_link?: string;
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ tv series| online english dubbed/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function extractDriveId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}

async function searchTMDB(showName: string): Promise<any> {
  const cleanName = showName
    .replace(/ tv series| online english dubbed/gi, '')
    .trim();
  
  const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanName)}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.results && data.results.length > 0) {
    return data.results[0];
  }
  return null;
}

async function fetchShowDetails(tmdbId: number): Promise<any> {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,content_ratings`;
  const response = await fetch(url);
  return response.json();
}

async function fetchSeasonDetails(tmdbId: number, seasonNumber: number): Promise<any> {
  const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

async function importShows() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const showsJsonPath = 'C:\\Users\\yawar\\Downloads\\shows.json';
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const showsData = JSON.parse(fs.readFileSync(showsJsonPath, 'utf-8'));
  
  const englishSeasons = showsData.all_results['English Seasons'];
  const showNames = Object.keys(englishSeasons);
  
  console.log(`🎬 Starting import process...\n`);
  console.log(`Total shows in JSON: ${showNames.length}`);
  console.log(`Complete shows to skip: ${completeShows.size}\n`);
  
  let addedShows = 0;
  let updatedShows = 0;
  let skippedShows = 0;
  let addedEpisodes = 0;
  let errors: string[] = [];
  
  for (const showName of showNames) {
    try {
      const cleanShowName = showName.replace(/ Tv Series| Online English Dubbed/gi, '').trim();
      
      // Skip if in complete shows list
      if (completeShows.has(cleanShowName.toLowerCase())) {
        console.log(`⏭️  Skipping: ${cleanShowName} (already complete)`);
        skippedShows++;
        continue;
      }
      
      console.log(`\n📺 Processing: ${cleanShowName}`);
      
      const showData = englishSeasons[showName];
      const seasons = Object.keys(showData);
      
      // Count episodes with Google Drive links only
      let totalEpisodes = 0;
      let googleDriveEpisodes = 0;
      
      seasons.forEach(season => {
        const episodes = showData[season] as Episode[];
        totalEpisodes += episodes.length;
        googleDriveEpisodes += episodes.filter((e: Episode) => 
          e.video_source?.type === 'google_drive'
        ).length;
      });
      
      if (googleDriveEpisodes === 0) {
        console.log(`   ⚠️  No Google Drive episodes, skipping...`);
        skippedShows++;
        continue;
      }
      
      console.log(`   Episodes: ${googleDriveEpisodes} Google Drive (${totalEpisodes} total)`);
      
      // Search TMDB
      console.log(`   🔍 Searching TMDB...`);
      const tmdbResult = await searchTMDB(cleanShowName);
      
      if (!tmdbResult) {
        console.log(`   ❌ Not found on TMDB, skipping...`);
        errors.push(`${cleanShowName}: Not found on TMDB`);
        skippedShows++;
        continue;
      }
      
      console.log(`   ✅ Found: ${tmdbResult.name} (TMDB ID: ${tmdbResult.id})`);
      
      // Fetch full show details
      const showDetails = await fetchShowDetails(tmdbResult.id);
      
      // Get content rating
      const usRating = showDetails.content_ratings?.results?.find(
        (r: any) => r.iso_3166_1 === 'US'
      );
      const rating = usRating?.rating || 'TV-14';
      
      // Get cast
      const cast = showDetails.credits?.cast
        ?.slice(0, 10)
        .map((actor: any) => actor.name)
        .join(', ') || '';
      
      // Determine category from genres
      const genres = showDetails.genres?.map((g: any) => g.name).join(', ') || '';
      const category = showDetails.genres?.[0]?.name || 'Drama';
      
      const slug = generateSlug(cleanShowName);
      
      // Check if show already exists
      const existingShow = data.shows.find((s: any) => s.slug === slug);
      
      const show = {
        id: existingShow?.id || generateId(),
        title: showDetails.name,
        slug: slug,
        description: showDetails.overview || '',
        posterUrl: showDetails.poster_path ? `${TMDB_IMAGE_BASE}${showDetails.poster_path}` : '',
        backdropUrl: showDetails.backdrop_path ? `${TMDB_IMAGE_BASE}${showDetails.backdrop_path}` : '',
        year: showDetails.first_air_date ? new Date(showDetails.first_air_date).getFullYear() : 2024,
        rating: rating,
        imdbRating: showDetails.vote_average ? showDetails.vote_average.toFixed(1) : '0.0',
        genres: genres,
        category: category,
        totalSeasons: showDetails.number_of_seasons || seasons.length,
        language: 'English',
        cast: cast,
        isTrending: false,
        isFeatured: false
      };
      
      if (existingShow) {
        const index = data.shows.findIndex((s: any) => s.id === existingShow.id);
        data.shows[index] = show;
        console.log(`   ✏️  Updated show: ${show.title}`);
        updatedShows++;
      } else {
        data.shows.push(show);
        console.log(`   ➕ Added show: ${show.title}`);
        addedShows++;
      }
      
      // Add episodes
      console.log(`   📝 Adding episodes...`);
      let episodesAdded = 0;
      
      for (const seasonKey of seasons) {
        const seasonNumber = parseInt(seasonKey.replace('Season ', ''));
        const episodes = showData[seasonKey] as Episode[];
        
        // Fetch season details from TMDB
        let seasonDetails: any = null;
        try {
          seasonDetails = await fetchSeasonDetails(tmdbResult.id, seasonNumber);
          await new Promise(resolve => setTimeout(resolve, 250)); // Rate limit
        } catch (error) {
          console.log(`   ⚠️  Could not fetch Season ${seasonNumber} details from TMDB`);
        }
        
        for (const ep of episodes) {
          // Only process Google Drive episodes
          if (ep.video_source?.type !== 'google_drive') {
            continue;
          }
          
          const driveId = extractDriveId(ep.video_source.direct_link || '');
          
          if (!driveId) {
            console.log(`   ⚠️  No Drive ID for S${seasonNumber}E${ep.episode}`);
            continue;
          }
          
          // Get episode details from TMDB
          const tmdbEpisode = seasonDetails?.episodes?.find(
            (e: any) => e.episode_number === ep.episode
          );
          
          // Check if episode already exists
          const existingEpisode = data.episodes.find((e: any) => 
            e.showId === show.id && 
            e.season === seasonNumber && 
            e.episodeNumber === ep.episode
          );
          
          const episode = {
            id: existingEpisode?.id || generateId(),
            showId: show.id,
            season: seasonNumber,
            episodeNumber: ep.episode,
            title: tmdbEpisode?.name || `Episode ${ep.episode}`,
            description: tmdbEpisode?.overview || '',
            thumbnailUrl: tmdbEpisode?.still_path 
              ? `${TMDB_IMAGE_BASE}${tmdbEpisode.still_path}` 
              : show.posterUrl,
            duration: tmdbEpisode?.runtime || 45,
            googleDriveUrl: `https://drive.google.com/file/d/${driveId}/preview`,
            airDate: tmdbEpisode?.air_date || ''
          };
          
          if (existingEpisode) {
            const index = data.episodes.findIndex((e: any) => e.id === existingEpisode.id);
            data.episodes[index] = episode;
          } else {
            data.episodes.push(episode);
            episodesAdded++;
            addedEpisodes++;
          }
        }
      }
      
      console.log(`   ✅ Added ${episodesAdded} episodes`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`   ❌ Error processing ${showName}:`, error);
      errors.push(`${showName}: ${error}`);
    }
  }
  
  // Write back to file
  console.log(`\n💾 Saving data...`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log(`\n\n📊 IMPORT SUMMARY:`);
  console.log(`   Shows added: ${addedShows}`);
  console.log(`   Shows updated: ${updatedShows}`);
  console.log(`   Shows skipped: ${skippedShows}`);
  console.log(`   Episodes added: ${addedEpisodes}`);
  console.log(`   Total shows now: ${data.shows.length}`);
  console.log(`   Total episodes now: ${data.episodes.length}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${errors.length}):`);
    errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`);
    }
  }
  
  console.log(`\n✅ Import complete!`);
}

importShows().catch(console.error);
