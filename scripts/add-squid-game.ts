import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const DATA_FILE = join(process.cwd(), 'data', 'streamvault-data.json');

// Google Drive links from the JSON file
const driveLinks = {
  "Season 1": [
    { episode: 1, link: "https://drive.google.com/file/d/1EujcRRdzc5UwUA-xQIxhi87nbRy7PUlj/view" },
    { episode: 2, link: "https://drive.google.com/file/d/1_PrVxaQjFdrq-rbOI7SPEWDbddNBB8OJ/view" },
    { episode: 3, link: "https://drive.google.com/file/d/1BBl5OGsWYxQ5HLEpGSjBDfwVRMl2HRUI/view" },
    { episode: 4, link: "https://drive.google.com/file/d/1NAl96whm4yY8EwE_uazzABR0OWSBgCqG/view" },
    { episode: 5, link: "https://drive.google.com/file/d/1-sHGzEa6iocblWFJ9d14W-SR1eBFgbkK/view" },
    { episode: 6, link: "https://drive.google.com/file/d/10su5S0h6Qf6oaKj_TrSTcZzZZb_u-HwG/view" },
    { episode: 7, link: "https://drive.google.com/file/d/1pof1s4fxhVV2-WOgnU3ZFwhYeWRKSWNe/view" },
    { episode: 8, link: "https://drive.google.com/file/d/1pJ6DEQOSayu_QpFYNt0xkHtRAd8vFTQz/view" },
    { episode: 9, link: "https://drive.google.com/file/d/1P2KyWWHX8aLVc8iez-0_h28vX34dmLCC/view" }
  ],
  "Season 2": [
    { episode: 1, link: "https://drive.google.com/file/d/1GVoUaJ80oTEVtBebYLG1f4dXIsSHR1PB/view" },
    { episode: 2, link: "https://drive.google.com/file/d/1xyBi9qHBYLieJL9dB2HE-7qq3zLA-A8V/view" },
    { episode: 3, link: "https://drive.google.com/file/d/1Ywie6wMItBM4dzFhNrenBz3Iaf0dpnUW/view" },
    { episode: 4, link: "https://drive.google.com/file/d/15U07-bdwe_OspvyybcLfryhWXlVVRAPz/view" },
    { episode: 5, link: "https://drive.google.com/file/d/1ZXYbF4SdiNRyqgkl8Q2_E_bFa4pfgEc5/view" },
    { episode: 6, link: "https://drive.google.com/file/d/1uPQcGyY3XqzQ5XvkHtdo9DWjKTmVGReu/view" },
    { episode: 7, link: "https://drive.google.com/file/d/1BXxBooB3dnxX-ffeda3iZTNQACDNOEWY/view" }
  ],
  "Season 3": [
    { episode: 1, link: "https://drive.google.com/file/d/1oAztE9aig0yLpbyd2KPC71GxzvFEA2GZ/view" },
    { episode: 2, link: "https://drive.google.com/file/d/12MQkGDrpJqa-EC1vJAYyyST2R6kDHOrf/view" },
    { episode: 3, link: "https://drive.google.com/file/d/1XwZoXxdb2sAAIwAGsHwPjMkIvsHNzsOq/view" },
    { episode: 4, link: "https://drive.google.com/file/d/1tUoHl_42LEPs2kUGG-ZORxmkbDodCJEf/view" },
    { episode: 5, link: "https://drive.google.com/file/d/1FCpzQj851-2NGxgxcwpLbEIUtQbrVW9e/view" },
    { episode: 6, link: "https://drive.google.com/file/d/1XfLEnZylv3OVyS5qMIPuTrUkprLPTc4X/view" }
  ]
};

interface TMDBShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
}

interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string;
  air_date: string;
  runtime: number;
}

async function fetchFromTMDB(endpoint: string) {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.statusText}`);
  }
  return response.json();
}

async function addSquidGame() {
  console.log('🎬 Adding Squid Game to StreamVault...\n');

  // Squid Game TMDB ID: 93405
  const SQUID_GAME_ID = 93405;

  try {
    // Fetch show details
    console.log('📡 Fetching show details from TMDB...');
    const showData: TMDBShow = await fetchFromTMDB(`/tv/${SQUID_GAME_ID}`);

    // Read existing data
    const data = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    
    // Check if show already exists
    const existingShow = data.shows.find((s: any) => s.slug === 'squid-game');
    if (existingShow) {
      console.log('⚠️  Squid Game already exists. Updating...');
    }

    // Create show object
    const show = {
      id: existingShow?.id || `show-${Date.now()}`,
      title: showData.name,
      slug: 'squid-game',
      description: showData.overview,
      posterUrl: `https://image.tmdb.org/t/p/w500${showData.poster_path}`,
      backdropUrl: `https://image.tmdb.org/t/p/original${showData.backdrop_path}`,
      trailerUrl: '',
      year: new Date(showData.first_air_date).getFullYear().toString(),
      rating: 'TV-MA',
      imdbRating: showData.vote_average.toFixed(1),
      genres: showData.genres.map(g => g.name).join(', '),
      totalSeasons: 3, // We have 3 seasons of data
      language: 'Korean',
      status: 'Ongoing',
      cast: 'Lee Jung-jae, Park Hae-soo, Wi Ha-joon, Jung Ho-yeon, O Yeong-su',
      director: 'Hwang Dong-hyuk',
      isFeatured: true,
      isTrending: true,
      createdAt: existingShow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ Show: ${show.title}`);
    console.log(`   Year: ${show.year}`);
    console.log(`   Rating: ${show.imdbRating}/10`);
    console.log(`   Seasons: ${show.totalSeasons}\n`);

    // Fetch and create episodes for all seasons
    const episodes = [];
    
    for (let season = 1; season <= 3; season++) {
      console.log(`📺 Fetching Season ${season} episodes...`);
      
      const seasonData = await fetchFromTMDB(`/tv/${SQUID_GAME_ID}/season/${season}`);
      const seasonEpisodes = seasonData.episodes;
      
      const seasonKey = `Season ${season}` as keyof typeof driveLinks;
      const seasonDriveLinks = driveLinks[seasonKey];

      for (const ep of seasonEpisodes) {
        const driveLink = seasonDriveLinks.find(d => d.episode === ep.episode_number);
        
        if (!driveLink) {
          console.log(`   ⚠️  No Drive link for S${season}E${ep.episode_number}, skipping...`);
          continue;
        }

        const episode = {
          id: `episode-${Date.now()}-${season}-${ep.episode_number}`,
          showId: show.id,
          season: season,
          episodeNumber: ep.episode_number,
          title: ep.name,
          description: ep.overview || `Episode ${ep.episode_number} of Squid Game Season ${season}`,
          duration: ep.runtime || 60,
          airDate: ep.air_date || '',
          thumbnailUrl: ep.still_path 
            ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
            : show.backdropUrl,
          videoUrl: driveLink.link,
          googleDriveUrl: driveLink.link,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        episodes.push(episode);
        console.log(`   ✅ S${season}E${ep.episode_number}: ${episode.title}`);
      }
    }

    console.log(`\n📊 Total episodes: ${episodes.length}`);

    // Update or add show
    if (existingShow) {
      const showIndex = data.shows.findIndex((s: any) => s.slug === 'squid-game');
      data.shows[showIndex] = show;
      console.log('✅ Show updated');
    } else {
      data.shows.push(show);
      console.log('✅ Show added');
    }

    // Remove old episodes and add new ones
    data.episodes = data.episodes.filter((e: any) => e.showId !== show.id);
    data.episodes.push(...episodes);
    console.log('✅ Episodes added');

    // Save to file
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('\n✅ Squid Game successfully added to StreamVault!');
    console.log(`\n📺 Summary:`);
    console.log(`   Show: ${show.title}`);
    console.log(`   Seasons: 3`);
    console.log(`   Episodes: ${episodes.length}`);
    console.log(`   Season 1: 9 episodes`);
    console.log(`   Season 2: 7 episodes`);
    console.log(`   Season 3: 6 episodes`);

  } catch (error) {
    console.error('❌ Error adding Squid Game:', error);
    process.exit(1);
  }
}

addSquidGame();
