import fs from 'fs';
import path from 'path';

async function removeEpisodes() {
  console.log('Removing Peaky Blinders Season 1 Episodes 7 and 8...\n');
  
  // Read existing data
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Find Peaky Blinders show
  const peakyBlinders = data.shows.find((s: any) => s.slug === 'peaky-blinders');
  if (!peakyBlinders) {
    console.error('Peaky Blinders not found in data');
    return;
  }
  
  console.log(`Found Peaky Blinders: ${peakyBlinders.title}`);
  console.log(`Show ID: ${peakyBlinders.id}\n`);
  
  const initialCount = data.episodes.length;
  
  // Remove Season 1 Episodes 7 and 8
  data.episodes = data.episodes.filter((e: any) => {
    if (e.showId === peakyBlinders.id && e.season === 1 && (e.episodeNumber === 7 || e.episodeNumber === 8)) {
      console.log(`❌ Removing: Season ${e.season} Episode ${e.episodeNumber} - ${e.title}`);
      console.log(`   ID: ${e.id}`);
      console.log(`   Drive URL: ${e.googleDriveUrl}\n`);
      return false;
    }
    return true;
  });
  
  const removedCount = initialCount - data.episodes.length;
  
  console.log(`\n📊 Summary:`);
  console.log(`   Episodes removed: ${removedCount}`);
  console.log(`   Total episodes now: ${data.episodes.length}`);
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log('\n✅ Episodes removed successfully!');
}

removeEpisodes().catch(console.error);
