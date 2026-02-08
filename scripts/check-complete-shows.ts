import fs from 'fs';
import path from 'path';

async function checkCompleteShows() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🔍 Checking shows with complete data...\n');
  
  const completeShows: any[] = [];
  const incompleteShows: any[] = [];
  
  for (const show of data.shows) {
    const episodes = data.episodes.filter((e: any) => e.showId === show.id);
    
    if (episodes.length === 0) {
      incompleteShows.push({
        title: show.title,
        reason: 'No episodes',
        episodeCount: 0
      });
      continue;
    }
    
    // Check if all episodes have:
    // 1. Valid Google Drive links (not PLACEHOLDER)
    // 2. Title
    // 3. Description
    // 4. Thumbnail
    
    const episodesWithLinks = episodes.filter((e: any) => 
      e.googleDriveUrl && 
      !e.googleDriveUrl.includes('PLACEHOLDER') &&
      e.googleDriveUrl.includes('drive.google.com')
    );
    
    const episodesWithTitles = episodes.filter((e: any) => 
      e.title && e.title.trim() !== '' && !e.title.startsWith('Episode ')
    );
    
    const episodesWithDescriptions = episodes.filter((e: any) => 
      e.description && e.description.trim() !== ''
    );
    
    const episodesWithThumbnails = episodes.filter((e: any) => 
      e.thumbnailUrl && 
      e.thumbnailUrl.trim() !== '' &&
      e.thumbnailUrl.startsWith('http')
    );
    
    const allEpisodesComplete = 
      episodesWithLinks.length === episodes.length &&
      episodesWithTitles.length === episodes.length &&
      episodesWithDescriptions.length === episodes.length &&
      episodesWithThumbnails.length === episodes.length;
    
    if (allEpisodesComplete) {
      completeShows.push({
        title: show.title,
        episodeCount: episodes.length,
        seasons: Math.max(...episodes.map((e: any) => e.season))
      });
    } else {
      incompleteShows.push({
        title: show.title,
        episodeCount: episodes.length,
        withLinks: episodesWithLinks.length,
        withTitles: episodesWithTitles.length,
        withDescriptions: episodesWithDescriptions.length,
        withThumbnails: episodesWithThumbnails.length
      });
    }
  }
  
  console.log(`✅ COMPLETE SHOWS (${completeShows.length}):`);
  console.log('   (All episodes have Drive links, titles, descriptions, and thumbnails)\n');
  
  completeShows
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach((show, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${show.title}`);
      console.log(`     Episodes: ${show.episodeCount} | Seasons: ${show.seasons}`);
    });
  
  console.log(`\n\n⚠️  INCOMPLETE SHOWS (${incompleteShows.length}):`);
  console.log('   (Missing Drive links, titles, descriptions, or thumbnails)\n');
  
  incompleteShows
    .sort((a, b) => b.episodeCount - a.episodeCount)
    .slice(0, 20)
    .forEach((show, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${show.title}`);
      if (show.reason) {
        console.log(`     ${show.reason}`);
      } else {
        console.log(`     Episodes: ${show.episodeCount}`);
        console.log(`     With Links: ${show.withLinks}/${show.episodeCount}`);
        console.log(`     With Titles: ${show.withTitles}/${show.episodeCount}`);
        console.log(`     With Descriptions: ${show.withDescriptions}/${show.episodeCount}`);
        console.log(`     With Thumbnails: ${show.withThumbnails}/${show.episodeCount}`);
      }
    });
  
  if (incompleteShows.length > 20) {
    console.log(`\n   ... and ${incompleteShows.length - 20} more incomplete shows`);
  }
  
  console.log(`\n\n📊 SUMMARY:`);
  console.log(`   Total shows: ${data.shows.length}`);
  console.log(`   Complete shows: ${completeShows.length} (${((completeShows.length / data.shows.length) * 100).toFixed(1)}%)`);
  console.log(`   Incomplete shows: ${incompleteShows.length} (${((incompleteShows.length / data.shows.length) * 100).toFixed(1)}%)`);
  console.log(`   Total episodes: ${data.episodes.length}`);
  
  // Save complete shows list to file
  const outputPath = path.join(process.cwd(), 'scripts', 'complete-shows-list.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    completeShows: completeShows.map(s => s.title).sort(),
    incompleteShows: incompleteShows.map(s => s.title).sort(),
    summary: {
      totalShows: data.shows.length,
      completeCount: completeShows.length,
      incompleteCount: incompleteShows.length
    }
  }, null, 2));
  
  console.log(`\n✅ Complete shows list saved to: scripts/complete-shows-list.json`);
}

checkCompleteShows().catch(console.error);
