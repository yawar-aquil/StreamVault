import fs from 'fs';

const showsData = JSON.parse(fs.readFileSync('C:\\Users\\yawar\\Downloads\\shows.json', 'utf-8'));

const englishSeasons = showsData.all_results['English Seasons'];
const showNames = Object.keys(englishSeasons);

console.log(`📊 Analysis of shows.json:\n`);
console.log(`Total shows: ${showNames.length}\n`);

// Count episodes and video types
let totalEpisodes = 0;
const videoTypes = new Set<string>();

showNames.slice(0, 10).forEach(showName => {
  const show = englishSeasons[showName];
  const seasons = Object.keys(show);
  let showEpisodeCount = 0;
  
  seasons.forEach(season => {
    const episodes = show[season];
    showEpisodeCount += episodes.length;
    
    episodes.forEach((ep: any) => {
      if (ep.video_source?.type) {
        videoTypes.add(ep.video_source.type);
      }
    });
  });
  
  totalEpisodes += showEpisodeCount;
  console.log(`${showName}: ${showEpisodeCount} episodes across ${seasons.length} seasons`);
});

console.log(`\n... and ${showNames.length - 10} more shows`);
console.log(`\nVideo source types found:`);
videoTypes.forEach(type => console.log(`  - ${type}`));
console.log(`\nFirst 20 show names:`);
showNames.slice(0, 20).forEach((name, i) => console.log(`${i + 1}. ${name}`));
