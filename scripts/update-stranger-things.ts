import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const STRANGER_THINGS_TMDB_ID = 66732;

// Season 5 Google Drive links - UPDATE THIS WITH CORRECT LINKS
const season5Links: { [episode: number]: string } = {
  1: 'https://drive.google.com/file/d/1cZMGuDkprlkf1vfiWs4synoj1re8XNV7/preview',
  2: 'https://drive.google.com/file/d/1yU0i8oiOlW6PQLdt4tIBSiHn1_3pCP7P/preview',
  3: 'https://drive.google.com/file/d/1Pgb6-qCVrDi3HNd_vYfYeqdUQEkR8xEl/preview',
  4: 'https://drive.google.com/file/d/1vOBMzRj67Q-gEvDwVVzfZdQsg55CV-0w/preview',
  // Add more episodes as needed
};

async function fetchFromTMDB(endpoint: string) {
  const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }
  return response.json();
}

async function updateStrangerThings() {
  console.log('🎬 Fetching Stranger Things details from TMDB...');
  
  // Fetch show details
  const showDetails = await fetchFromTMDB(`/tv/${STRANGER_THINGS_TMDB_ID}`);
  
  console.log(`📺 Show: ${showDetails.name}`);
  console.log(`📅 Year: ${showDetails.first_air_date?.split('-')[0]}`);
  console.log(`⭐ Rating: ${showDetails.vote_average}`);
  console.log(`🎭 Seasons: ${showDetails.number_of_seasons}`);
  
  // Load existing data
  const dataPath = path.join(__dirname, '..', 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Find Stranger Things in existing shows
  const stIndex = data.shows.findIndex((s: any) => s.slug === 'stranger-things');
  
  if (stIndex === -1) {
    console.error('❌ Stranger Things not found in database!');
    return;
  }
  
  const showId = data.shows[stIndex].id;
  
  // Update show details
  data.shows[stIndex] = {
    ...data.shows[stIndex],
    title: showDetails.name,
    year: parseInt(showDetails.first_air_date?.split('-')[0] || '2016'),
    description: showDetails.overview,
    posterUrl: `https://image.tmdb.org/t/p/w500${showDetails.poster_path}`,
    backdropUrl: `https://image.tmdb.org/t/p/original${showDetails.backdrop_path}`,
    rating: 'TV-14',
    imdbRating: showDetails.vote_average?.toFixed(1) || '8.7',
    totalSeasons: showDetails.number_of_seasons,
    genres: showDetails.genres?.map((g: any) => g.name).join(', ') || 'Drama, Fantasy, Horror',
    language: 'English',
    cast: 'Millie Bobby Brown, Finn Wolfhard, Winona Ryder',
  };
  
  console.log('\n📝 Updating episodes from TMDB...');
  
  // Get existing episodes to preserve Google Drive links
  const existingEpisodes = data.episodes.filter((ep: any) => ep.showId === showId);
  const existingLinksMap = new Map();
  
  existingEpisodes.forEach((ep: any) => {
    const key = `S${ep.season}E${ep.episodeNumber}`;
    existingLinksMap.set(key, ep.googleDriveUrl || ep.videoUrl);
  });
  
  console.log(`📦 Found ${existingEpisodes.length} existing episodes with links`);
  
  // Fetch all episodes for all seasons
  const updatedEpisodes: any[] = [];
  
  for (let season = 1; season <= showDetails.number_of_seasons; season++) {
    console.log(`\n🔄 Processing Season ${season}...`);
    
    try {
      const seasonDetails = await fetchFromTMDB(`/tv/${STRANGER_THINGS_TMDB_ID}/season/${season}`);
      
      for (const episode of seasonDetails.episodes) {
        const key = `S${season}E${episode.episode_number}`;
        
        // Get existing link or Season 5 link
        let driveUrl = existingLinksMap.get(key);
        
        // If Season 5, use new links
        if (season === 5 && season5Links[episode.episode_number]) {
          driveUrl = season5Links[episode.episode_number];
        }
        
        if (!driveUrl) {
          console.log(`  ⚠️  No Drive link for ${key} - skipping`);
          continue;
        }
        
        const episodeData = {
          id: `stranger-things-s${season}e${episode.episode_number}`,
          showId: showId,
          season: season,
          episodeNumber: episode.episode_number,
          title: episode.name,
          description: episode.overview || 'No description available.',
          duration: episode.runtime || 50,
          airDate: episode.air_date || '',
          thumbnailUrl: episode.still_path 
            ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
            : data.shows[stIndex].backdropUrl,
          videoUrl: driveUrl,
          googleDriveUrl: driveUrl,
        };
        
        updatedEpisodes.push(episodeData);
        console.log(`  ✅ ${key}: ${episode.name}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Season ${season} not available yet on TMDB`);
    }
  }
  
  // Remove old Stranger Things episodes
  data.episodes = data.episodes.filter((ep: any) => ep.showId !== showId);
  
  // Add updated episodes
  data.episodes.push(...updatedEpisodes);
  
  // Save updated data
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n✅ Stranger Things updated successfully!');
  console.log(`📊 Total episodes: ${updatedEpisodes.length}`);
  
  for (let s = 1; s <= showDetails.number_of_seasons; s++) {
    const count = updatedEpisodes.filter(e => e.season === s).length;
    if (count > 0) {
      console.log(`   Season ${s}: ${count} episodes`);
    }
  }
}

updateStrangerThings().catch(console.error);
