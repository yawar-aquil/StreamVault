import { storage } from "../server/storage.js";

async function migrateGenresToString() {
  console.log('🔄 Migrating genres, cast, and creators from arrays to strings...\n');
  
  try {
    const allShows = await storage.getAllShows();
    console.log(`📊 Found ${allShows.length} shows\n`);
    
    let updated = 0;
    
    for (const show of allShows) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Check if genres is an array
      if (Array.isArray(show.genres)) {
        updates.genres = show.genres.join(', ');
        needsUpdate = true;
      }
      
      // Check if cast is an array
      if (Array.isArray(show.cast)) {
        updates.cast = show.cast.join(', ');
        needsUpdate = true;
      }
      
      // Check if creators is an array
      if (Array.isArray(show.creators)) {
        updates.creators = show.creators.join(', ');
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await storage.updateShow(show.id, {
          ...show,
          ...updates,
        });
        
        console.log(`✅ Updated: ${show.title}`);
        if (updates.genres) console.log(`   Genres: ${updates.genres}`);
        if (updates.cast) console.log(`   Cast: ${updates.cast}`);
        if (updates.creators) console.log(`   Creators: ${updates.creators}`);
        console.log('');
        
        updated++;
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updated} shows`);
    console.log(`   Skipped: ${allShows.length - updated} shows (already strings)`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

migrateGenresToString();
