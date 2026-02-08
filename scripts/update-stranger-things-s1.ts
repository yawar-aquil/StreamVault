import { storage } from "../server/storage.js";

async function updateStrangerThingsS1() {
  console.log('🔄 Updating Stranger Things Season 1 episode URLs...\n');
  
  try {
    // Get all shows
    const allShows = await storage.getAllShows();
    
    // Find Stranger Things
    const strangerThings = allShows.find(show => 
      show.title.toLowerCase().includes('stranger things')
    );
    
    if (!strangerThings) {
      console.error('❌ Stranger Things show not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found show: ${strangerThings.title} (ID: ${strangerThings.id})\n`);
    
    // Get all episodes for this show
    const allEpisodes = await storage.getEpisodesByShowId(strangerThings.id);
    
    // Filter Season 1 episodes
    const season1Episodes = allEpisodes.filter(ep => ep.season === 1);
    
    console.log(`📊 Found ${season1Episodes.length} Season 1 episodes\n`);
    
    // New URLs for Season 1
    const newUrls: Record<number, string> = {
      1: 'https://drive.google.com/file/d/1aWKosTAFWOYsl1PF4buqsVGMyC0Riwbf/preview',
      2: 'https://drive.google.com/file/d/1lG9JbtgXXG5ccWxyIjlqaqD0BP4fi3uY/preview',
      3: 'https://drive.google.com/file/d/1brc8GoRPmUn3SCWVdlFYrFSMGP34Z1Qx/preview',
      4: 'https://drive.google.com/file/d/14zYe8aHhQuMZFSjtvr5uUJOAr6d-IBRj/preview',
      5: 'https://drive.google.com/file/d/1Ln240sgBWmANF8v5IpWZcgp4K96TYQt-/preview',
      6: 'https://drive.google.com/file/d/1jN_zxBxODK976gc-AVp8rPOLv-KVKuZ3/preview',
      7: 'https://drive.google.com/file/d/1Nrlvn-NH6NCtk3trrhU4ph0Wun4Q5NNb/preview',
      8: 'https://drive.google.com/file/d/13t3GF1IfXBgCIkCRDn3H3tqsvWz6fVQO/preview',
    };
    
    let updated = 0;
    
    // Update each episode
    for (const episode of season1Episodes) {
      const newUrl = newUrls[episode.episodeNumber];
      
      if (newUrl) {
        await storage.updateEpisode(episode.id, {
          ...episode,
          googleDriveUrl: newUrl,
        });
        
        console.log(`✅ Updated Episode ${episode.episodeNumber}: ${episode.title}`);
        console.log(`   URL: ${newUrl}\n`);
        
        updated++;
      } else {
        console.log(`⚠️  No URL provided for Episode ${episode.episodeNumber}`);
      }
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updated} episodes`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

updateStrangerThingsS1();
