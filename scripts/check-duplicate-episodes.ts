import { readFileSync } from 'fs';
import { join } from 'path';

interface Episode {
  id: string;
  showId: string;
  season: number;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  googleDriveUrl: string;
  videoUrl: string | null;
  airDate: string | null;
}

interface Show {
  id: string;
  title: string;
  slug: string;
  totalSeasons: number;
}

interface Data {
  shows: Show[];
  episodes: Episode[];
}

const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
const rawData = readFileSync(dataPath, 'utf-8');
const data: Data = JSON.parse(rawData);

console.log('🔍 Checking for duplicate episodes...\n');

// Group episodes by show
const episodesByShow = new Map<string, Episode[]>();
data.episodes.forEach(episode => {
  if (!episodesByShow.has(episode.showId)) {
    episodesByShow.set(episode.showId, []);
  }
  episodesByShow.get(episode.showId)!.push(episode);
});

let totalDuplicates = 0;
const showsWithDuplicates: string[] = [];

// Check each show for duplicates
episodesByShow.forEach((episodes, showId) => {
  const show = data.shows.find(s => s.id === showId);
  if (!show) return;

  // Group by season and episode number
  const episodeMap = new Map<string, Episode[]>();
  
  episodes.forEach(ep => {
    const key = `S${ep.season}E${ep.episodeNumber}`;
    if (!episodeMap.has(key)) {
      episodeMap.set(key, []);
    }
    episodeMap.get(key)!.push(ep);
  });

  // Find duplicates
  const duplicates: Array<{ key: string; episodes: Episode[] }> = [];
  episodeMap.forEach((eps, key) => {
    if (eps.length > 1) {
      duplicates.push({ key, episodes: eps });
    }
  });

  if (duplicates.length > 0) {
    showsWithDuplicates.push(show.title);
    console.log(`\n❌ ${show.title} (${show.slug})`);
    console.log(`   Total episodes: ${episodes.length}`);
    console.log(`   Duplicate episodes found: ${duplicates.length}`);
    
    duplicates.forEach(({ key, episodes: dupEps }) => {
      console.log(`\n   ${key}:`);
      dupEps.forEach((ep, index) => {
        console.log(`     ${index + 1}. ID: ${ep.id}`);
        console.log(`        Title: ${ep.title}`);
        const driveUrl = ep.googleDriveUrl || 'N/A';
        console.log(`        Drive URL: ${driveUrl.substring(0, Math.min(60, driveUrl.length))}${driveUrl.length > 60 ? '...' : ''}`);
      });
      totalDuplicates += dupEps.length - 1; // Count extras
    });
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Summary:`);
console.log(`   Shows with duplicates: ${showsWithDuplicates.length}`);
console.log(`   Total duplicate episodes to remove: ${totalDuplicates}`);

if (showsWithDuplicates.length > 0) {
  console.log(`\n   Affected shows:`);
  showsWithDuplicates.forEach(title => {
    console.log(`   - ${title}`);
  });
} else {
  console.log(`\n✅ No duplicate episodes found!`);
}

console.log('\n' + '='.repeat(60));
