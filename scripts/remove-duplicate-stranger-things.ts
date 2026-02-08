import fs from 'fs';
import path from 'path';

async function removeDuplicateStrangerThings() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🧹 Removing duplicate Stranger Things...\n');
  
  // Find all Stranger Things shows
  const stShows = data.shows.filter((s: any) => s.title === 'Stranger Things');
  
  console.log(`Found ${stShows.length} "Stranger Things" entries:`);
  stShows.forEach((show: any) => {
    const episodes = data.episodes.filter((e: any) => e.showId === show.id);
    console.log(`  - ID: ${show.id} | Episodes: ${episodes.length}`);
  });
  
  // Keep the one with episodes, remove the empty one
  const duplicateId = '9145b151-8f96-473b-9983-3a721205d383';
  
  const index = data.shows.findIndex((s: any) => s.id === duplicateId);
  
  if (index !== -1) {
    data.shows.splice(index, 1);
    console.log(`\n✅ Removed duplicate Stranger Things (ID: ${duplicateId})`);
  } else {
    console.log('\n⚠️  Duplicate not found');
  }
  
  // Also remove "Lover or Stranger" if it has no episodes
  const loverIndex = data.shows.findIndex((s: any) => s.title === 'Lover or Stranger');
  if (loverIndex !== -1) {
    const loverEpisodes = data.episodes.filter((e: any) => e.showId === data.shows[loverIndex].id);
    if (loverEpisodes.length === 0) {
      data.shows.splice(loverIndex, 1);
      console.log('✅ Removed "Lover or Stranger" (no episodes)');
    }
  }
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total shows now: ${data.shows.length}`);
  console.log('\n✅ Duplicates removed!');
}

removeDuplicateStrangerThings().catch(console.error);
