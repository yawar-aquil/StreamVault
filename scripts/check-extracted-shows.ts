import fs from 'fs';
import path from 'path';

async function checkExtractedShows() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const extractedPath = 'C:\\Users\\yawar\\Desktop\\extracted_history.json';
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const extracted = JSON.parse(fs.readFileSync(extractedPath, 'utf-8'));
  
  const existing: string[] = [];
  const missing: string[] = [];
  
  extracted['English Seasons'].forEach((show: string) => {
    const cleanTitle = show
      .replace(/ Tv Series/gi, '')
      .replace(/ Online English Dubbed/gi, '')
      .trim();
    
    const found = data.shows.find((s: any) => 
      s.title.toLowerCase() === cleanTitle.toLowerCase() ||
      s.title.toLowerCase().includes(cleanTitle.toLowerCase()) ||
      cleanTitle.toLowerCase().includes(s.title.toLowerCase())
    );
    
    if (found) {
      existing.push(`${cleanTitle} -> ${found.title}`);
    } else {
      missing.push(cleanTitle);
    }
  });
  
  console.log(`\n✅ EXISTING (${existing.length}):`);
  existing.forEach(s => console.log(`  ${s}`));
  
  console.log(`\n❌ MISSING (${missing.length}):`);
  missing.forEach(s => console.log(`  ${s}`));
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total shows in extracted list: ${extracted['English Seasons'].length}`);
  console.log(`  Already in database: ${existing.length}`);
  console.log(`  Not in database: ${missing.length}`);
}

checkExtractedShows().catch(console.error);
