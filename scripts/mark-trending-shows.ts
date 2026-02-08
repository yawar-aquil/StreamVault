import fs from 'fs';
import path from 'path';

async function markTrendingShows() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🔥 Marking top shows as trending...\n');
  
  // List of top trending shows
  const trendingShowNames = [
    'Wednesday',
    'Money Heist',
    'Peaky Blinders',
    'Game of Thrones',
    'Stranger Things',
    'Breaking Bad',
    'Better Call Saul',
    'The Boys',
    'House of the Dragon',
    'The Mandalorian',
    'Westworld',
    'The Witcher',
    'Vikings',
    'The Walking Dead',
    'You',
    'Squid Game',
    'Bridgerton',
    'The Last of Us',
    'Yellowstone',
    'The Good Doctor',
    'Lucifer',
    'Prison Break',
    'Shameless',
    'Orange Is the New Black',
    'Sex Education',
    'The Mentalist',
    'How to Get Away with Murder',
    'Ozark',
    'Black Mirror',
    'True Detective'
  ];
  
  let markedCount = 0;
  let notFoundCount = 0;
  const notFound: string[] = [];
  
  // First, unmark all shows as trending
  data.shows.forEach((show: any) => {
    show.isTrending = false;
  });
  
  // Mark trending shows
  trendingShowNames.forEach(showName => {
    const show = data.shows.find((s: any) => 
      s.title.toLowerCase() === showName.toLowerCase() ||
      s.title.toLowerCase().includes(showName.toLowerCase())
    );
    
    if (show) {
      show.isTrending = true;
      console.log(`✅ ${show.title}`);
      markedCount++;
    } else {
      notFound.push(showName);
      notFoundCount++;
    }
  });
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   Marked as trending: ${markedCount}`);
  console.log(`   Not found: ${notFoundCount}`);
  
  if (notFound.length > 0) {
    console.log(`\n⚠️  Shows not found in database:`);
    notFound.forEach(name => console.log(`   - ${name}`));
  }
  
  console.log(`\n✅ Trending shows updated!`);
}

markTrendingShows().catch(console.error);
