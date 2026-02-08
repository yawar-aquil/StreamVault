import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function restoreMoneyHeist() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  
  console.log('💰 Restoring old Money Heist data...\n');
  
  // Get the old data from before the import (commit f3af45f)
  const oldDataJson = execSync('git show f3af45f:data/streamvault-data.json', { 
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024 // 50MB buffer
  });
  const oldData = JSON.parse(oldDataJson);
  
  // Get current data
  const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Find Money Heist in old data
  const oldShow = oldData.shows.find((s: any) => s.title.toLowerCase().includes('money heist'));
  const oldEpisodes = oldData.episodes.filter((e: any) => e.showId === oldShow?.id);
  
  // Find Money Heist in current data
  const currentShow = currentData.shows.find((s: any) => s.title.toLowerCase().includes('money heist'));
  
  if (!oldShow || !currentShow) {
    console.log('❌ Money Heist not found in old or current data');
    return;
  }
  
  console.log(`Old Money Heist: ${oldShow.title}`);
  console.log(`  Episodes: ${oldEpisodes.length}`);
  console.log(`  ID: ${oldShow.id}\n`);
  
  console.log(`Current Money Heist: ${currentShow.title}`);
  console.log(`  ID: ${currentShow.id}\n`);
  
  // Remove current Money Heist episodes
  currentData.episodes = currentData.episodes.filter((e: any) => e.showId !== currentShow.id);
  console.log(`✅ Removed current Money Heist episodes\n`);
  
  // Add old episodes with the current show ID
  const restoredEpisodes = oldEpisodes.map((e: any) => ({
    ...e,
    showId: currentShow.id
  }));
  
  currentData.episodes.push(...restoredEpisodes);
  console.log(`✅ Restored ${restoredEpisodes.length} old episodes\n`);
  
  // Show sample of restored episodes
  console.log('Sample of restored episodes:');
  restoredEpisodes.slice(0, 5).forEach((e: any) => {
    console.log(`  S${e.season}E${e.episodeNumber}: ${e.title}`);
    console.log(`    Thumbnail: ${e.thumbnailUrl?.substring(0, 60)}...`);
  });
  
  console.log('\n  ...\n');
  
  restoredEpisodes.slice(-5).forEach((e: any) => {
    console.log(`  S${e.season}E${e.episodeNumber}: ${e.title}`);
    console.log(`    Thumbnail: ${e.thumbnailUrl?.substring(0, 60)}...`);
  });
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   Old episodes restored: ${restoredEpisodes.length}`);
  console.log(`   Total episodes now: ${currentData.episodes.length}`);
  console.log(`\n✅ Money Heist restored successfully!`);
}

restoreMoneyHeist().catch(console.error);
