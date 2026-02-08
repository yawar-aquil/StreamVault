import { readFileSync } from "fs";
import { join } from "path";

const DATA_FILE = join(process.cwd(), "data", "streamvault-data.json");

const data = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

const stShow = data.shows.find((s: any) => 
  s.title.toLowerCase().includes("stranger things")
);

if (!stShow) {
  console.log("❌ Stranger Things not found");
  process.exit(1);
}

const stEpisodes = data.episodes
  .filter((e: any) => e.showId === stShow.id)
  .sort((a: any, b: any) => {
    if (a.season !== b.season) return a.season - b.season;
    return a.episodeNumber - b.episodeNumber;
  });

console.log(`\n📺 Stranger Things - Total Episodes: ${stEpisodes.length}\n`);

// Show Season 3
console.log("Season 3:");
const s3 = stEpisodes.filter((e: any) => e.season === 3);
s3.forEach((ep: any) => {
  console.log(`  E${ep.episodeNumber}: ${ep.title}`);
  if (ep.episodeNumber === 2) {
    console.log(`     ✅ Drive URL: ${ep.googleDriveUrl.substring(0, 60)}...`);
    console.log(`     📸 Thumbnail: ${ep.thumbnailUrl ? '✅' : '❌'}`);
  }
});

console.log("\nSeason 4:");
const s4 = stEpisodes.filter((e: any) => e.season === 4);
s4.forEach((ep: any) => {
  console.log(`  E${ep.episodeNumber}: ${ep.title}`);
  if (ep.episodeNumber === 9) {
    console.log(`     ✅ Drive URL: ${ep.googleDriveUrl.substring(0, 60)}...`);
    console.log(`     📸 Thumbnail: ${ep.thumbnailUrl ? '✅' : '❌'}`);
  }
});

console.log("\n✅ Episodes are properly ordered!\n");
