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
  duration: number;
  googleDriveUrl: string;
  videoUrl: string | null;
  airDate: string | null;
}

interface Show {
  id: string;
  title: string;
  slug: string;
}

interface Data {
  shows: Show[];
  episodes: Episode[];
  movies: any[];
  comments: any[];
  watchlist: any[];
  progress: any[];
  contentRequests: any[];
  issueReports: any[];
}

const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
const rawData = readFileSync(dataPath, 'utf-8');
const data: Data = JSON.parse(rawData);

console.log('🔍 Finding Berlin show...\n');

const berlinShow = data.shows.find(s => s.slug === 'berlin');
if (!berlinShow) {
  console.log('❌ Berlin show not found!');
  process.exit(1);
}

console.log(`✅ Found: ${berlinShow.title} (ID: ${berlinShow.id})`);

// Get all Berlin episodes
const berlinEpisodes = data.episodes.filter(ep => ep.showId === berlinShow.id);
console.log(`   Total episodes before: ${berlinEpisodes.length}`);

// Group by season and episode number
const episodeMap = new Map<string, Episode[]>();
berlinEpisodes.forEach(ep => {
  const key = `S${ep.season}E${ep.episodeNumber}`;
  if (!episodeMap.has(key)) {
    episodeMap.set(key, []);
  }
  episodeMap.get(key)!.push(ep);
});

// Keep only the first occurrence of each episode
const episodesToKeep = new Set<string>();
const episodesToRemove = new Set<string>();

episodeMap.forEach((episodes, key) => {
  if (episodes.length > 1) {
    console.log(`\n   ${key}: Found ${episodes.length} duplicates`);
    // Keep the first one
    episodesToKeep.add(episodes[0].id);
    console.log(`      ✅ Keeping: ${episodes[0].id}`);
    
    // Mark the rest for removal
    for (let i = 1; i < episodes.length; i++) {
      episodesToRemove.add(episodes[i].id);
      console.log(`      ❌ Removing: ${episodes[i].id}`);
    }
  } else {
    episodesToKeep.add(episodes[0].id);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Episodes to keep: ${episodesToKeep.size}`);
console.log(`   Episodes to remove: ${episodesToRemove.size}`);

// Remove duplicate episodes
const updatedEpisodes = data.episodes.filter(ep => !episodesToRemove.has(ep.id));

console.log(`\n   Total episodes before: ${data.episodes.length}`);
console.log(`   Total episodes after: ${updatedEpisodes.length}`);

// Update the data
data.episodes = updatedEpisodes;

// Save back to file
console.log('\n💾 Saving updated data...');
writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');

console.log('✅ Successfully removed duplicate episodes from Berlin!');
console.log(`\n   Berlin now has ${updatedEpisodes.filter(ep => ep.showId === berlinShow.id).length} episodes`);
