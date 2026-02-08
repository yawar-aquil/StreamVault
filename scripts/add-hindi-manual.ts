import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');
const INPUT_FILE = 'C:/Users/yawar/Downloads/hindi.json';

// Manual show data (from TMDB IDs found manually)
const manualShows = [
  {
    tmdbId: 91239, // Asur (Hindi)
    key: 'asur',
    title: 'Asur',
    slug: 'asur',
    year: 2020,
    description: 'A forensic expert and a judicial officer join hands to investigate a series of murders that seem to be connected to Hindu mythology.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4eBYpfoLxPVzVoVmHRcANbFV9Iq.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    rating: 'TV-MA',
    imdbRating: '8.4',
    genres: 'Crime, Drama, Mystery',
    category: 'thriller',
    language: 'Hindi',
    cast: 'Arshad Warsi, Barun Sobti, Anupriya Goenka, Ridhi Dogra, Sharib Hashmi',
  },
  {
    tmdbId: null, // Not on TMDB
    key: 'dayaa',
    title: 'Dayaa',
    slug: 'dayaa',
    year: 2024,
    description: 'A gripping thriller series that explores the dark side of human nature.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BNTMwOTQ0MzAtNjg4Yy00YTg2LTk5NjgtMTk3YmNjZjY5NTRjXkEyXkFqcGc@._V1_.jpg',
    backdropUrl: 'https://m.media-amazon.com/images/M/MV5BNTMwOTQ0MzAtNjg4Yy00YTg2LTk5NjgtMTk3YmNjZjY5NTRjXkEyXkFqcGc@._V1_.jpg',
    rating: 'TV-MA',
    imdbRating: '7.5',
    genres: 'Thriller, Drama',
    category: 'thriller',
    language: 'Hindi',
    cast: '',
  },
  {
    tmdbId: null, // Not on TMDB
    key: 'khoj parchaiyo ke uss paar',
    title: 'Khoj - Parchaiyon Ke Uss Paar',
    slug: 'khoj-parchaiyon-ke-uss-paar',
    year: 2024,
    description: 'A supernatural thriller that follows investigators as they uncover mysteries beyond the shadows.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BODI5MjI5ZTYtMzI3MC00YjZmLWJkYjQtMTNiZjE1NjA2MjNkXkEyXkFqcGc@._V1_.jpg',
    backdropUrl: 'https://m.media-amazon.com/images/M/MV5BODI5MjI5ZTYtMzI3MC00YjZmLWJkYjQtMTNiZjE1NjA2MjNkXkEyXkFqcGc@._V1_.jpg',
    rating: 'TV-14',
    imdbRating: '7.0',
    genres: 'Mystery, Thriller, Horror',
    category: 'thriller',
    language: 'Hindi',
    cast: '',
  },
  {
    tmdbId: null, // Not on TMDB
    key: 'lakadbaggey',
    title: 'Lakkadbaggey',
    slug: 'lakkadbaggey',
    year: 2024,
    description: 'A dark comedy thriller series.',
    posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjE5YjE3MjgtMTgxNy00ZTFhLTk5YzMtMjY4ZjM0YjE0ZjBkXkEyXkFqcGc@._V1_.jpg',
    backdropUrl: 'https://m.media-amazon.com/images/M/MV5BMjE5YjE3MjgtMTgxNy00ZTFhLTk5YzMtMjY4ZjM0YjE0ZjBkXkEyXkFqcGc@._V1_.jpg',
    rating: 'TV-MA',
    imdbRating: '7.2',
    genres: 'Comedy, Thriller, Drama',
    category: 'comedy',
    language: 'Hindi',
    cast: '',
  },
];

// Extract file ID from Google Drive URL
function extractFileId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

// Extract video URL from embed code or direct link
function extractVideoUrl(videoSource: any): string | null {
  if (!videoSource || videoSource.type === 'failed' || !videoSource.direct_link) {
    return null;
  }
  
  if (videoSource.type === 'google_drive') {
    return extractFileId(videoSource.direct_link);
  } else if (videoSource.type === 'mega') {
    const match = videoSource.embed_code?.match(/src="([^"]+)"/);
    return match ? match[1] : videoSource.direct_link;
  }
  return videoSource.direct_link || null;
}

async function addHindiShowsManual() {
  console.log('Reading data files...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  
  const hindiShows = inputData['Hindi Seasons'];
  const existingSlugs = data.shows.map((s: any) => s.slug);
  
  let addedShows = 0;
  let addedEpisodes = 0;
  
  for (const showInfo of manualShows) {
    console.log(`\nProcessing: ${showInfo.title}`);
    
    // Check if already exists
    if (existingSlugs.includes(showInfo.slug)) {
      console.log(`  Skipping - already exists`);
      continue;
    }
    
    const seasons = hindiShows[showInfo.key];
    if (!seasons) {
      console.log(`  Skipping - no episode data found`);
      continue;
    }
    
    const showId = randomUUID();
    
    // Create show entry
    const show = {
      id: showId,
      title: showInfo.title,
      slug: showInfo.slug,
      description: showInfo.description,
      posterUrl: showInfo.posterUrl,
      backdropUrl: showInfo.backdropUrl,
      year: showInfo.year,
      rating: showInfo.rating,
      imdbRating: showInfo.imdbRating,
      genres: showInfo.genres,
      category: showInfo.category,
      totalSeasons: Object.keys(seasons).length,
      language: showInfo.language,
      cast: showInfo.cast,
      featured: false,
      trending: false,
    };
    
    data.shows.push(show);
    existingSlugs.push(showInfo.slug);
    addedShows++;
    console.log(`  Added show: ${show.title} (${show.year})`);
    
    // Add episodes
    for (const [seasonKey, episodes] of Object.entries(seasons)) {
      const seasonNum = parseInt(seasonKey.replace('Season ', ''));
      let epCount = 0;
      
      for (const ep of episodes as any[]) {
        const epNum = ep.episode;
        const videoUrl = extractVideoUrl(ep.video_source);
        
        // Skip episodes with no video
        if (!videoUrl) {
          console.log(`    Skipping S${seasonNum}E${epNum} - no video source`);
          continue;
        }
        
        const episode = {
          id: randomUUID(),
          showId: showId,
          season: seasonNum,
          episodeNumber: epNum,
          title: `Episode ${epNum}`,
          description: '',
          thumbnailUrl: showInfo.backdropUrl,
          duration: 45,
          googleDriveUrl: videoUrl,
          airDate: null,
        };
        
        data.episodes.push(episode);
        addedEpisodes++;
        epCount++;
      }
      
      console.log(`    Season ${seasonNum}: ${epCount} episodes`);
    }
  }
  
  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n========================================');
  console.log(`Added ${addedShows} shows`);
  console.log(`Added ${addedEpisodes} episodes`);
  console.log('Data saved successfully!');
}

addHindiShowsManual().catch(console.error);
