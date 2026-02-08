import fs from 'fs';
import path from 'path';

async function restoreOldPosters() {
  const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('🖼️  Restoring old posters and backdrops...\n');
  
  const oldUrls: { [key: string]: { poster: string; backdrop: string } } = {
    'Wednesday': {
      poster: 'https://www.themoviedb.org/t/p/w1280/36xXlhEpQqVVPuiZhfoQuaY4OlA.jpg',
      backdrop: 'https://media.themoviedb.org/t/p/w1066_and_h600_face/dQRMa4McqdAz9AowjjHzzv0R48u.jpg'
    },
    'Game of Thrones': {
      poster: 'https://m.media-amazon.com/images/M/MV5BMTNhMDJmNmYtNDQ5OS00ODdlLWE0ZDAtZTgyYTIwNDY3OTU3XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
      backdrop: 'https://img10.hotstar.com/image/upload/f_auto/sources/r1/cms/prod/3281/1739947253281-h'
    },
    'Money Heist': {
      poster: 'https://i0.wp.com/thsindex.org/wp-content/uploads/2023/04/Money-Heist-was-first-released-on-Antena-3-in-Spain-in-2017-Netflix.jpg?resize=730%2C973&ssl=1',
      backdrop: 'https://wp-socialnation-assets.s3.ap-south-1.amazonaws.com/wp-content/uploads/2021/05/25185045/Money-Heist.png'
    },
    'The Boys': {
      poster: 'https://www.themoviedb.org/t/p/w1280/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg',
      backdrop: 'https://media.themoviedb.org/t/p/w1066_and_h600_face/7cqKGQMnNabzOpi7qaIgZvQ7NGV.jpg'
    },
    'Peaky Blinders': {
      poster: 'https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p14765800_b_v8_aa.jpg',
      backdrop: 'https://m.media-amazon.com/images/S/pv-target-images/0094920244a8673146cb15e2eae6a8207a50ac03e0d92784dcc1b3cf52c1db03.jpg'
    }
  };
  
  let updatedCount = 0;
  
  Object.keys(oldUrls).forEach(showName => {
    const show = data.shows.find((s: any) => 
      s.title.toLowerCase() === showName.toLowerCase() ||
      s.title.toLowerCase().includes(showName.toLowerCase())
    );
    
    if (show) {
      const oldPoster = show.posterUrl;
      const oldBackdrop = show.backdropUrl;
      
      show.posterUrl = oldUrls[showName].poster;
      show.backdropUrl = oldUrls[showName].backdrop;
      
      console.log(`✅ ${show.title}`);
      console.log(`   Poster: ${oldPoster.substring(0, 60)}...`);
      console.log(`   → ${show.posterUrl.substring(0, 60)}...`);
      console.log(`   Backdrop: ${oldBackdrop.substring(0, 60)}...`);
      console.log(`   → ${show.backdropUrl.substring(0, 60)}...`);
      console.log('');
      
      updatedCount++;
    } else {
      console.log(`❌ ${showName} not found`);
    }
  });
  
  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  
  console.log(`\n📊 Summary:`);
  console.log(`   Shows updated: ${updatedCount}`);
  console.log(`\n✅ Old posters and backdrops restored!`);
}

restoreOldPosters().catch(console.error);
