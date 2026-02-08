import fs from 'fs';
import path from 'path';

interface Episode {
  id: string;
  showId: string;
  season?: number;
  seasonNumber?: number;
  episodeNumber: number;
  title: string;
  description: string;
  googleDriveUrl: string;
  thumbnailUrl: string;
  airDate: string;
  duration: number;
}

async function fixPeakyBlindersDuplicates() {
  console.log('Analyzing Peaky Blinders episodes for duplicates...\n');
  
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
  
  // Get all Peaky Blinders episodes
  const pbEpisodes = data.episodes.filter((e: Episode) => e.showId === peakyBlinders.id);
  console.log(`Total episodes found: ${pbEpisodes.length}\n`);
  
  // Group episodes by season and episode number
  const episodeMap = new Map<string, Episode[]>();
  
  for (const episode of pbEpisodes) {
    const season = episode.season || episode.seasonNumber || 0;
    const key = `S${season}E${episode.episodeNumber}`;
    
    if (!episodeMap.has(key)) {
      episodeMap.set(key, []);
    }
    episodeMap.get(key)!.push(episode);
  }
  
  // Find duplicates
  const duplicates: string[] = [];
  const toKeep: Episode[] = [];
  const toRemove: string[] = [];
  
  for (const [key, episodes] of episodeMap.entries()) {
    if (episodes.length > 1) {
      console.log(`\n🔍 Found ${episodes.length} duplicates for ${key}:`);
      duplicates.push(key);
      
      // Score each episode based on completeness
      const scored = episodes.map(ep => {
        let score = 0;
        
        // Has season field
        if (ep.season !== undefined) score += 10;
        
        // Has proper title (not generic "Episode X")
        if (ep.title && !ep.title.match(/^Episode \d+$/)) score += 5;
        
        // Has proper description (not placeholder)
        if (ep.description && !ep.description.includes('In this exciting episode')) score += 5;
        
        // Has TMDB thumbnail (not Unsplash)
        if (ep.thumbnailUrl && ep.thumbnailUrl.includes('tmdb.org')) score += 5;
        
        // Has different Google Drive URL (not the placeholder one)
        if (ep.googleDriveUrl && ep.googleDriveUrl !== 'https://drive.google.com/file/d/1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd/preview') score += 10;
        
        // Has proper air date
        if (ep.airDate && ep.airDate !== '2013-09-12') score += 3;
        
        // Has duration
        if (ep.duration && ep.duration > 0) score += 2;
        
        return { episode: ep, score };
      });
      
      // Sort by score (highest first)
      scored.sort((a, b) => b.score - a.score);
      
      // Keep the best one
      const best = scored[0];
      toKeep.push(best.episode);
      
      console.log(`  ✅ KEEPING (score: ${best.score}):`);
      console.log(`     ID: ${best.episode.id}`);
      console.log(`     Title: ${best.episode.title}`);
      console.log(`     Drive URL: ${best.episode.googleDriveUrl.substring(0, 60)}...`);
      console.log(`     Season field: ${best.episode.season !== undefined ? 'Yes' : 'No'}`);
      
      // Mark others for removal
      for (let i = 1; i < scored.length; i++) {
        toRemove.push(scored[i].episode.id);
        console.log(`  ❌ REMOVING (score: ${scored[i].score}):`);
        console.log(`     ID: ${scored[i].episode.id}`);
        console.log(`     Title: ${scored[i].episode.title}`);
        console.log(`     Drive URL: ${scored[i].episode.googleDriveUrl.substring(0, 60)}...`);
      }
    } else {
      toKeep.push(episodes[0]);
    }
  }
  
  console.log(`\n\n📊 Summary:`);
  console.log(`   Total episodes: ${pbEpisodes.length}`);
  console.log(`   Duplicates found: ${duplicates.length}`);
  console.log(`   Episodes to keep: ${toKeep.length}`);
  console.log(`   Episodes to remove: ${toRemove.length}`);
  
  if (toRemove.length > 0) {
    console.log(`\n🗑️  Removing ${toRemove.length} duplicate episodes...`);
    
    // Remove duplicates
    data.episodes = data.episodes.filter((e: Episode) => !toRemove.includes(e.id));
    
    // Write back to file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log('✅ Peaky Blinders duplicates removed successfully!');
  } else {
    console.log('\n✅ No duplicates to remove!');
  }
}

fixPeakyBlindersDuplicates().catch(console.error);
