import fs from 'fs';
import path from 'path';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function addConjuringMoviesManual() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🧹 Removing wrong movie...\n');
  
  // Remove "Prelude to Happiness"
  const wrongIndex = data.movies.findIndex((m: any) => m.title === 'Prelude to Happiness');
  if (wrongIndex !== -1) {
    data.movies.splice(wrongIndex, 1);
    console.log('   ✅ Removed: Prelude to Happiness\n');
  }
  
  console.log('🎬 Adding The Conjuring 2 manually...\n');
  
  // The Conjuring 2 data (from TMDB ID: 252194)
  const conjuring2 = {
    id: generateId(),
    title: 'The Conjuring 2',
    slug: generateSlug('The Conjuring 2'),
    description: 'Lorraine and Ed Warren travel to north London to help a single mother raising four children alone in a house plagued by malicious spirits.',
    posterUrl: 'https://image.tmdb.org/t/p/w780/zEqyD0SBt6HL7W9JQoWwtd5Do1T.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/dEbLMT0m5QgKMhyFNqKPBmPCSjx.jpg',
    year: 2016,
    rating: 'R',
    imdbRating: '7.3',
    genres: 'Horror, Mystery, Thriller',
    category: 'Horror',
    duration: 134,
    language: 'English',
    cast: 'Vera Farmiga, Patrick Wilson, Frances O\'Connor, Madison Wolfe, Simon McBurney, Franka Potente, Lauren Esposito, Benjamin Haigh, Patrick McAuley, Maria Doyle Kennedy',
    googleDriveUrl: 'https://drive.google.com/file/d/PLACEHOLDER/preview',
    isTrending: false,
    isFeatured: false
  };
  
  // Check if it already exists
  const existingIndex = data.movies.findIndex((m: any) => m.slug === conjuring2.slug);
  
  if (existingIndex !== -1) {
    console.log('   ℹ️  The Conjuring 2 already exists, updating...');
    data.movies[existingIndex] = { ...data.movies[existingIndex], ...conjuring2, id: data.movies[existingIndex].id };
  } else {
    data.movies.push(conjuring2);
    console.log('   ✅ Added: The Conjuring 2 (2016)');
  }
  
  console.log(`      Rating: ${conjuring2.imdbRating}/10`);
  console.log(`      Duration: ${conjuring2.duration} min`);
  console.log(`      Genres: ${conjuring2.genres}`);
  console.log(`      Cast: ${conjuring2.cast.split(', ').slice(0, 3).join(', ')}...`);
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log('\n\n📊 Summary:');
  console.log(`   Total movies in database: ${data.movies.length}`);
  console.log('\n✅ The Conjuring movies completed!');
  console.log('   Movies added:');
  console.log('   1. The Conjuring (2013) ✅');
  console.log('   2. The Conjuring 2 (2016) ✅');
  console.log('   3. The Conjuring: The Devil Made Me Do It (2021) ✅');
  console.log('\n   Note: Google Drive URLs are set to PLACEHOLDER - update them later');
}

addConjuringMoviesManual().catch(console.error);
