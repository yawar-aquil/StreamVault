const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const EXTRACTED_FILE = path.join(__dirname, '..', 'english-seasons_non_drive_category.json');
const COMPARISON_FILE = path.join(__dirname, '..', 'show_comparison_results.json');

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
        .replace(/ tv series| online english dubbed| online english/gi, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

console.log('📺 StreamVault - Add New Shows from Extracted Data');
console.log('='.repeat(80));

// Load all data files
console.log('\n📂 Loading data files...');
const streamvaultData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));
const comparisonData = JSON.parse(fs.readFileSync(COMPARISON_FILE, 'utf-8'));

console.log(`✅ Loaded ${streamvaultData.shows.length} shows from StreamVault`);
console.log(`✅ Found ${comparisonData.new_shows.length} new shows to add`);

let addedShows = 0;
let addedEpisodes = 0;

console.log('\n' + '='.repeat(80));
console.log('Adding New Shows');
console.log('='.repeat(80));

for (const showName of comparisonData.new_shows) {
    console.log(`\n📝 ${showName}`);

    const extractedShowData = extractedData[showName];
    if (!extractedShowData) {
        console.log(`   ⚠️  No extracted data found`);
        continue;
    }

    // Count total episodes
    const totalEpisodes = Object.values(extractedShowData).reduce((sum, eps) => sum + eps.length, 0);
    const totalSeasons = Object.keys(extractedShowData).length;

    console.log(`   ${totalEpisodes} episodes across ${totalSeasons} season(s)`);

    // Create show object
    const showId = generateUUID();
    const cleanTitle = showName
        .replace(/ Tv Series| Online English Dubbed| Online English/gi, '')
        .trim();

    const newShow = {
        id: showId,
        title: cleanTitle,
        slug: generateSlug(showName),
        description: `Watch ${cleanTitle} online. A compelling series with ${totalSeasons} season${totalSeasons > 1 ? 's' : ''} and ${totalEpisodes} episodes.`,
        posterUrl: '',
        backdropUrl: '',
        year: new Date().getFullYear(),
        rating: 'TV-14',
        imdbRating: null,
        genres: 'Drama',
        language: 'English',
        totalSeasons: totalSeasons,
        cast: '',
        creators: '',
        featured: false,
        trending: false,
        category: 'drama',
        castDetails: '[]',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Add show
    streamvaultData.shows.push(newShow);
    addedShows++;
    console.log(`   ✓ Created show: ${cleanTitle}`);

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
                    showId: showId,
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
            }
        }
    }

    console.log(`   ✓ Added ${totalEpisodes} episodes`);
}

// Save updated data
console.log('\n💾 Saving updated data...');
fs.writeFileSync(DATA_FILE, JSON.stringify(streamvaultData, null, 2));

console.log('\n' + '='.repeat(80));
console.log('✅ COMPLETED!');
console.log('='.repeat(80));
console.log(`📊 Summary:`);
console.log(`   New shows added: ${addedShows}`);
console.log(`   New episodes added: ${addedEpisodes}`);
console.log(`   Total StreamVault shows: ${streamvaultData.shows.length}`);
console.log(`   Total StreamVault episodes: ${streamvaultData.episodes.length}`);
console.log('\n💡 Restart the server to see the new shows!');
