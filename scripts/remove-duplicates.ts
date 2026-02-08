import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('🔍 Finding and removing duplicate shows...\n');

// Group shows by title (case-insensitive)
const showsByTitle = new Map<string, any[]>();

for (const show of data.shows) {
  const normalizedTitle = show.title.toLowerCase().trim();
  if (!showsByTitle.has(normalizedTitle)) {
    showsByTitle.set(normalizedTitle, []);
  }
  showsByTitle.get(normalizedTitle)!.push(show);
}

const showsToRemove: string[] = [];
let duplicatesFound = 0;

for (const [title, shows] of showsByTitle.entries()) {
  if (shows.length > 1) {
    duplicatesFound++;
    console.log(`\n📺 "${title}" has ${shows.length} copies:`);
    
    // For each show, count episodes
    const showsWithEpisodeCounts = shows.map(show => ({
      ...show,
      episodeCount: data.episodes.filter((e: any) => e.showId === show.id).length
    }));
    
    // Sort by episode count (descending), then by creation order
    showsWithEpisodeCounts.sort((a, b) => {
      if (b.episodeCount !== a.episodeCount) {
        return b.episodeCount - a.episodeCount;
      }
      return 0;
    });
    
    // Keep the first one (most episodes), remove the rest
    const keepShow = showsWithEpisodeCounts[0];
    const removeShows = showsWithEpisodeCounts.slice(1);
    
    console.log(`   ✅ KEEPING: ${keepShow.title} (${keepShow.slug}) - ${keepShow.episodeCount} episodes`);
    
    for (const show of removeShows) {
      console.log(`   ❌ REMOVING: ${show.title} (${show.slug}) - ${show.episodeCount} episodes`);
      showsToRemove.push(show.id);
    }
  }
}

if (showsToRemove.length === 0) {
  console.log('\n✅ No duplicates found!');
} else {
  console.log(`\n\n🗑️  Removing ${showsToRemove.length} duplicate show(s)...`);
  
  // Remove duplicate shows
  data.shows = data.shows.filter((show: any) => !showsToRemove.includes(show.id));
  
  // Remove episodes associated with removed shows
  const episodesBefore = data.episodes.length;
  data.episodes = data.episodes.filter((episode: any) => !showsToRemove.includes(episode.showId));
  const episodesRemoved = episodesBefore - data.episodes.length;
  
  console.log(`   ✅ Removed ${showsToRemove.length} shows`);
  console.log(`   ✅ Removed ${episodesRemoved} associated episodes`);
  
  // Save data
  console.log('\n💾 Saving data...');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n✅ Complete!');
  console.log(`\n📊 Final count: ${data.shows.length} shows, ${data.episodes.length} episodes`);
}
