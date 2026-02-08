import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('🔍 Checking for duplicate shows...\n');

// Group shows by title (case-insensitive)
const showsByTitle = new Map<string, any[]>();

for (const show of data.shows) {
  const normalizedTitle = show.title.toLowerCase().trim();
  if (!showsByTitle.has(normalizedTitle)) {
    showsByTitle.set(normalizedTitle, []);
  }
  showsByTitle.get(normalizedTitle)!.push(show);
}

// Find duplicates
const duplicates: any[] = [];

for (const [title, shows] of showsByTitle.entries()) {
  if (shows.length > 1) {
    duplicates.push({
      title: title,
      count: shows.length,
      shows: shows.map(s => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        year: s.year,
        totalSeasons: s.totalSeasons,
      }))
    });
  }
}

if (duplicates.length === 0) {
  console.log('✅ No duplicates found!');
} else {
  console.log(`❌ Found ${duplicates.length} duplicate show(s):\n`);
  
  duplicates.forEach((dup, index) => {
    console.log(`${index + 1}. "${dup.title}" (${dup.count} copies):`);
    dup.shows.forEach((show: any, i: number) => {
      console.log(`   ${i + 1}. ID: ${show.id}`);
      console.log(`      Title: ${show.title}`);
      console.log(`      Slug: ${show.slug}`);
      console.log(`      Year: ${show.year}`);
      console.log(`      Seasons: ${show.totalSeasons}`);
      
      // Count episodes for this show
      const episodeCount = data.episodes.filter((e: any) => e.showId === show.id).length;
      console.log(`      Episodes: ${episodeCount}`);
      console.log('');
    });
  });
  
  // Save duplicates to file
  const outputPath = path.join(process.cwd(), 'scripts', 'duplicates-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(duplicates, null, 2));
  console.log(`\n💾 Detailed report saved to: ${outputPath}`);
}

console.log(`\n📊 Total shows in database: ${data.shows.length}`);
