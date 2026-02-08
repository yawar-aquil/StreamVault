import { storage } from "../server/storage.js";
import { readFileSync } from "fs";
import { config } from "dotenv";

// Load environment variables
config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface EpisodeData {
  episode: number;
  episode_url: string;
  google_drive_link: string;
}

interface SeasonData {
  [key: string]: EpisodeData[];
}

interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  genres: { id: number; name: string }[];
  created_by: { id: number; name: string }[];
  vote_average: number;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  networks: { name: string }[];
}

interface TMDBCredits {
  cast: { name: string; order: number }[];
}

interface TMDBEpisode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  air_date: string;
}

interface TMDBSeason {
  episodes: TMDBEpisode[];
}

// Search for show on TMDB
async function searchTMDBShow(title: string): Promise<number | null> {
  try {
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Fetch show details from TMDB
async function fetchShowDetails(tmdbId: number): Promise<TMDBShow | null> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`   API Error: ${response.status} ${response.statusText}`);
      const errorData = await response.text();
      console.error(`   Response: ${errorData}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`   Fetch error:`, error);
    return null;
  }
}

// Fetch cast from TMDB credits
async function fetchShowCredits(tmdbId: number): Promise<string> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return '';
    }
    
    const data: TMDBCredits = await response.json();
    // Get top 10 cast members
    const cast = data.cast
      .sort((a, b) => a.order - b.order)
      .slice(0, 10)
      .map(c => c.name)
      .join(', ');
    
    return cast;
  } catch (error) {
    return '';
  }
}

// Fetch season details from TMDB
async function fetchSeasonDetails(tmdbId: number, seasonNumber: number): Promise<TMDBSeason | null> {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
}

// Create slug from title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('🎬 Adding Wednesday show with episodes...\n');

  try {
    // Read the JSON file
    const jsonData = readFileSync('C:\\Users\\yawar\\Desktop\\wednesday.json', 'utf-8');
    const episodesData: SeasonData = JSON.parse(jsonData);

    // Use the known TMDB ID for Wednesday
    const tmdbId = 119051; // Wednesday (2022)
    console.log(`✅ Using TMDB ID: ${tmdbId}\n`);

    // Fetch show details
    console.log('📥 Fetching show details from TMDB...');
    const showDetails = await fetchShowDetails(tmdbId);
    
    if (!showDetails) {
      console.error('❌ Could not fetch show details');
      process.exit(1);
    }

    console.log(`✅ Fetched details for: ${showDetails.name}\n`);

    // Fetch cast
    console.log('🎭 Fetching cast from TMDB...');
    const cast = await fetchShowCredits(tmdbId);
    console.log(`✅ Fetched ${cast.split(', ').length} cast members\n`);

    // Check if show already exists
    const shows = await storage.getAllShows();
    let wednesdayShow = shows.find(s => s.title.toLowerCase() === 'wednesday');

    if (wednesdayShow) {
      console.log(`ℹ️  Show already exists: ${wednesdayShow.title} (ID: ${wednesdayShow.id})`);
      console.log(`📝 Updating show with cast information...\n`);
      
      // Update the show with cast
      wednesdayShow = await storage.updateShow(wednesdayShow.id, {
        ...wednesdayShow,
        cast: cast,
      });
      console.log(`✅ Updated show with cast\n`);
    } else {
      // Create the show
      console.log('✨ Creating Wednesday show...');
      
      const showPayload = {
        title: showDetails.name,
        slug: createSlug(showDetails.name),
        description: showDetails.overview,
        thumbnail: showDetails.poster_path 
          ? `${TMDB_IMAGE_BASE}/w500${showDetails.poster_path}`
          : '',
        backdrop: showDetails.backdrop_path
          ? `${TMDB_IMAGE_BASE}/original${showDetails.backdrop_path}`
          : '',
        year: parseInt(showDetails.first_air_date?.split('-')[0] || '2022'),
        rating: 'TV-14',
        imdbRating: showDetails.vote_average.toFixed(1),
        genres: showDetails.genres.map(g => g.name).join(', '),
        language: 'English',
        seasons: showDetails.number_of_seasons,
        totalEpisodes: showDetails.number_of_episodes,
        status: showDetails.status,
        cast: cast,
        creators: showDetails.created_by.map(c => c.name).join(', '),
        network: showDetails.networks[0]?.name || 'Netflix',
        featured: true,
        trending: true,
      };

      wednesdayShow = await storage.createShow(showPayload);
      console.log(`✅ Created show: ${wednesdayShow.title} (ID: ${wednesdayShow.id})\n`);
    }

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    // Process each season
    for (const [seasonKey, episodes] of Object.entries(episodesData)) {
      const seasonNumber = parseInt(seasonKey.replace('Season ', ''));
      console.log(`\n📺 Processing Season ${seasonNumber}...`);

      // Fetch TMDB data for this season
      const tmdbSeason = await fetchSeasonDetails(tmdbId, seasonNumber);
      
      if (!tmdbSeason) {
        console.log(`   ⚠️  Could not fetch TMDB data for Season ${seasonNumber}`);
        continue;
      }

      // Get existing episodes for this season
      const existingEpisodes = await storage.getEpisodesByShowId(wednesdayShow.id);
      const seasonEpisodes = existingEpisodes.filter(e => e.season === seasonNumber);

      // Process each episode
      for (const episodeData of episodes) {
        const episodeNumber = episodeData.episode;
        
        // Find TMDB data for this episode
        const tmdbEpisode = tmdbSeason.episodes.find(e => e.episode_number === episodeNumber);
        
        if (!tmdbEpisode) {
          console.log(`   ⚠️  S${seasonNumber}E${episodeNumber}: No TMDB data found`);
          totalSkipped++;
          continue;
        }

        // Check if episode already exists
        const existingEpisode = seasonEpisodes.find(e => e.episodeNumber === episodeNumber);

        const episodePayload = {
          showId: wednesdayShow.id,
          season: seasonNumber,
          episodeNumber: episodeNumber,
          episode: episodeNumber,
          title: tmdbEpisode.name,
          description: tmdbEpisode.overview || `Season ${seasonNumber}, Episode ${episodeNumber}`,
          duration: tmdbEpisode.runtime || 45,
          releaseDate: tmdbEpisode.air_date || '',
          videoUrl: episodeData.google_drive_link,
          thumbnailUrl: tmdbEpisode.still_path 
            ? `${TMDB_IMAGE_BASE}/w500${tmdbEpisode.still_path}`
            : wednesdayShow.thumbnail || '',
        };

        if (existingEpisode) {
          // Update existing episode
          await storage.updateEpisode(existingEpisode.id, episodePayload);
          console.log(`   ✅ Updated S${seasonNumber}E${episodeNumber}: ${tmdbEpisode.name}`);
          totalUpdated++;
        } else {
          // Create new episode
          await storage.createEpisode(episodePayload);
          console.log(`   ✨ Created S${seasonNumber}E${episodeNumber}: ${tmdbEpisode.name}`);
          totalCreated++;
        }
      }

      // Rate limit between seasons
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log('\n✅ Wednesday show and episodes added successfully!');
    console.log(`   Episodes created: ${totalCreated}`);
    console.log(`   Episodes updated: ${totalUpdated}`);
    console.log(`   Episodes skipped: ${totalSkipped}`);
    console.log(`   Total processed: ${totalCreated + totalUpdated + totalSkipped}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
