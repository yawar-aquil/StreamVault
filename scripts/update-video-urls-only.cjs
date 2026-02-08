const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const EXTRACTED_FILE = path.join(__dirname, '..', 'english-seasons_non_drive_category.json');
const COMPARISON_FILE = path.join(__dirname, '..', 'existing_shows_link_status.json');

console.log('📺 StreamVault - Smart Update Video URLs');
console.log('='.repeat(80));

// Load all data files
console.log('\n📂 Loading data files...');
const streamvaultData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));
const comparisonData = JSON.parse(fs.readFileSync(COMPARISON_FILE, 'utf-8'));

console.log(`✅ Loaded ${streamvaultData.shows.length} shows from StreamVault`);
console.log(`✅ Loaded ${Object.keys(extractedData).length} shows from extracted data`);

let updatedCount = 0;

// Update video URLs for existing episodes (keeps all TMDB metadata)
console.log('\n' + '='.repeat(80));
console.log('UPDATING VIDEO URLs FOR EXISTING EPISODES');
console.log('='.repeat(80));

// Combine placeholder shows and shows with no episodes
const showsToUpdate = [
    ...comparisonData.shows_with_placeholders,
    ...comparisonData.shows_no_episodes
];

for (const show of showsToUpdate) {
    console.log(`\n📝 ${show.name}`);

    const extractedShowData = extractedData[show.extracted_name];
    if (!extractedShowData) {
        console.log(`   ⚠️  No extracted data found`);
        continue;
    }

    // Get all episodes for this show
    const showEpisodes = streamvaultData.episodes.filter(ep => ep.showId === show.id);

    for (const seasonKey in extractedShowData) {
        const seasonEpisodes = extractedShowData[seasonKey];
        const seasonNum = parseInt(seasonKey.replace('Season ', ''));

        for (const extractedEp of seasonEpisodes) {
            // Find matching episode
            const matchingEp = showEpisodes.find(ep =>
                ep.season === seasonNum && ep.episodeNumber === extractedEp.episode
            );

            if (matchingEp && extractedEp.video_links && extractedEp.video_links.length > 0) {
                // Use video_src type first, fallback to first link
                const videoLink = extractedEp.video_links.find(v => v.type === 'video_src') ||
                    extractedEp.video_links[0];

                // Update videoUrl (keeps all TMDB metadata intact)
                matchingEp.videoUrl = videoLink.url;
                matchingEp.googleDriveUrl = null; // Clear old Drive link
                updatedCount++;
                console.log(`   ✓ Updated S${seasonNum}E${extractedEp.episode} video URL`);
            }
        }
    }
}

// Save updated data
console.log('\n💾 Saving updated data...');
fs.writeFileSync(DATA_FILE, JSON.stringify(streamvaultData, null, 2));

console.log('\n' + '='.repeat(80));
console.log('✅ COMPLETED!');
console.log('='.repeat(80));
console.log(`📊 Summary:`);
console.log(`   Episodes updated with video URLs: ${updatedCount}`);
console.log(`   (All TMDB metadata preserved)`);
console.log('\n💡 For new shows, use: node scripts/add-show.cjs');
console.log('   Then run this script again to add video URLs');
