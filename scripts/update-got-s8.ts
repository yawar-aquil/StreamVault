import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Episode {
  id: string;
  showId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  googleDriveUrl: string;
  videoUrl: string | null;
}

interface Data {
  shows: any[];
  episodes: Episode[];
  movies: any[];
  comments: any[];
  watchlist: any[];
  progress: any[];
  contentRequests: any[];
  issueReports: any[];
}

function extractFileId(url: string): string {
  const match = url.match(/\/d\/([^\/]+)/);
  return match ? match[1] : url;
}

// Game of Thrones Season 8 episode links
const gotS8Links = [
  'https://drive.google.com/file/d/1zSVxbi_rvY-BIJveFWQTqtdhTtceTPAS/preview',
  'https://drive.google.com/file/d/1zgVaPD5FJ-s50ILkoXTxFvT2T6D0HCwR/preview',
  'https://drive.google.com/file/d/1KrlT2WL3SW2c8eUALW6OPDv06eTV6QRM/preview',
  'https://drive.google.com/file/d/1QuoshKNmdHCBueniIT3rdpNsWRfx3Mck/preview',
  'https://drive.google.com/file/d/136cSeRjhAvJ24G_JtCP_NZZIVTY8VEYo/preview',
  'https://drive.google.com/file/d/114D81pF8NUjgHxcz01qRaL-qCT68feeH/preview'
];

function updateGotS8() {
  console.log('📺 Updating Game of Thrones Season 8 episode links...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  // Find Game of Thrones show
  const gotShow = data.shows.find(s => s.slug === 'game-of-thrones');
  
  if (!gotShow) {
    console.log('❌ Game of Thrones show not found!');
    return;
  }

  console.log(`📺 Found Game of Thrones (ID: ${gotShow.id})\n`);

  // Get Season 8 episodes
  const s8Episodes = data.episodes
    .filter(e => e.showId === gotShow.id && e.season === 8)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  console.log(`   Found ${s8Episodes.length} episodes in Season 8\n`);

  s8Episodes.forEach((episode, index) => {
    if (gotS8Links[index]) {
      const fileId = extractFileId(gotS8Links[index]);
      episode.googleDriveUrl = fileId;
      console.log(`   ✅ S8E${episode.episodeNumber}: ${episode.title}`);
      console.log(`      File ID: ${fileId}`);
    }
  });

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ Game of Thrones Season 8 links updated!');
}

updateGotS8();
