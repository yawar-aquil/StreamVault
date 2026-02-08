const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const EXTRACTED_FILE = path.join(__dirname, '..', 'english-seasons_non_drive_category.json');
const COMPARISON_FILE = path.join(__dirname, '..', 'existing_shows_link_status.json');

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

console.log('📺 StreamVault - Update Links from Extracted Data');
console.log('='.repeat(80));

// Load all data files
console.log('\n📂 Loading data files...');
const streamvaultData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));
const comparisonData = JSON.parse(fs.readFileSync(COMPARISON_FILE, 'utf-8'));

console.log(`✅ Loaded ${streamvaultData.shows.length} shows from StreamVault`);
console.log(`✅ Loaded ${Object.keys(extractedData).length} shows from extracted data`);

let updatedEpisodes = 0;
let addedEpisodes = 0;

// Task 1: Update placeholder links for 3 shows
console.log('\n' + '='.repeat(80));
console.log('TASK 1: Updating Placeholder Links');
console.log('='.repeat(80));

for (const show of comparisonData.shows_with_placeholders) {
    console.log(`\n📝 ${show.name} (${show.streamvault_episodes} episodes)`);

    const extractedShowData = extractedData[show.extracted_name];
    if (!extractedShowData) {
        console.log(`   ⚠️  No extracted data found`);
        continue;
    }

    // Get all episodes for this show
    const showEpisodes = streamvaultData.episodes.filter(ep => ep.showId === show.id);

    // Update episodes with extracted links
    for (const seasonKey in extractedShowData) {
        const seasonEpisodes = extractedShowData[seasonKey];
        const seasonNum = parseInt(seasonKey.replace('Season ', ''));

        for (const extractedEp of seasonEpisodes) {
            // Find matching episode in StreamVault
            const matchingEp = showEpisodes.find(ep =>
                ep.season === seasonNum && ep.episodeNumber === extractedEp.episode
            );

            if (matchingEp && extractedEp.video_links && extractedEp.video_links.length > 0) {
                // Use the first video link (prefer video_src over others)
                const videoLink = extractedEp.video_links.find(v => v.type === 'video_src') ||
                    extractedEp.video_links[0];

                matchingEp.videoUrl = videoLink.url;
                matchingEp.googleDriveUrl = null; // Clear old Drive link
                updatedEpisodes++;
                console.log(`   ✓ Updated S${seasonNum}E${extractedEp.episode}`);
            }
        }
    }
}

console.log(`\n✅ Updated ${updatedEpisodes} episode links`);

// Task 2: Add episodes for 9 shows with no episodes
console.log('\n' + '='.repeat(80));
console.log('TASK 2: Adding Episodes for Shows with No Episodes');
console.log('='.repeat(80));

for (const show of comparisonData.shows_no_episodes) {
    console.log(`\n📝 ${show.name}`);

    const extractedShowData = extractedData[show.extracted_name];
    if (!extractedShowData) {
        console.log(`   ⚠️  No extracted data found`);
        continue;
    }

    // Add episodes
    for (const seasonKey in extractedShowData) {
        const seasonEpisodes = extractedShowData[seasonKey];
        const seasonNum = parseInt(seasonKey.replace('Season ', ''));

        for (const extractedEp of seasonEpisodes) {
            if (extractedEp.video_links && extractedEp.video_links.length > 0) {
                const videoLink = extractedEp.video_links.find(v => v.type === 'video_src') ||
                    extractedEp.video_links[0];

                const newEpisode = {
                    id: generateUUID(),
                    showId: show.id,
                    season: seasonNum,
                    episodeNumber: extractedEp.episode,
                    title: `Episode ${extractedEp.episode}`,
                    description: '',
                    duration: 45,
                    thumbnailUrl: '',
                    googleDriveUrl: null,
                    videoUrl: videoLink.url,
                    airDate: null
                };

                streamvaultData.episodes.push(newEpisode);
                addedEpisodes++;
                console.log(`   ✓ Added S${seasonNum}E${extractedEp.episode}`);
            }
        }
    }
}

console.log(`\n✅ Added ${addedEpisodes} new episodes`);

// Save updated data
console.log('\n💾 Saving updated data...');
fs.writeFileSync(DATA_FILE, JSON.stringify(streamvaultData, null, 2));

console.log('\n' + '='.repeat(80));
console.log('✅ COMPLETED!');
console.log('='.repeat(80));
console.log(`📊 Summary:`);
console.log(`   Updated episodes: ${updatedEpisodes}`);
console.log(`   Added episodes: ${addedEpisodes}`);
console.log(`   Total changes: ${updatedEpisodes + addedEpisodes}`);
console.log('\n💡 Next step: Run the script to add new shows');
