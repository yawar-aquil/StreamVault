import fs from 'fs';

const extractedHistory = JSON.parse(fs.readFileSync('C:\\Users\\yawar\\Desktop\\extracted_history.json', 'utf-8'));
const showsJson = JSON.parse(fs.readFileSync('C:\\Users\\yawar\\Downloads\\shows.json', 'utf-8'));

const historyShows = extractedHistory['English Seasons'].map((s: string) => 
  s.replace(/ Tv Series| Online English Dubbed| Online English Subtitles/gi, '').trim().toLowerCase()
);

const jsonShows = Object.keys(showsJson.all_results['English Seasons']).map(s => 
  s.replace(/ Tv Series| Online English Dubbed| Online English Subtitles/gi, '').trim().toLowerCase()
);

const missingInJson = historyShows.filter((s: string) => !jsonShows.includes(s));

console.log(`Shows in extracted_history.json: ${historyShows.length}`);
console.log(`Shows in shows.json: ${jsonShows.length}`);
console.log(`\nShows in history but NOT in shows.json (${missingInJson.length}):`);

missingInJson.forEach((show: string, i: number) => {
  const original = extractedHistory['English Seasons'].find((s: string) => 
    s.replace(/ Tv Series| Online English Dubbed| Online English Subtitles/gi, '').trim().toLowerCase() === show
  );
  console.log(`${i + 1}. ${original}`);
});
