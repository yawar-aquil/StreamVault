const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const EXTRACTED_FILE = path.join(__dirname, '..', 'english-seasons_non_drive_category.json');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { timeout: 30000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function generateSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
    console.log('📺 Adding "As You Stood By"');
    console.log('='.repeat(80));

    const streamvaultData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));

    const showName = "AS YOU STOOD BY TV SERIES"; // Exact key from JSON
    const extractedShowData = extractedData[showName];

    if (!extractedShowData) {
        console.log('❌ Show not found in extracted data');
        return;
    }

    // Search TMDB for "You Stood By"
    console.log('\n🔍 Searching TMDB...');
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent('You Stood By')}`;
    const searchResults = await httpsGet(searchUrl);
    await delay(500);

    if (!searchResults.results || searchResults.results.length === 0) {
        console.log('❌ Not found on TMDB');
        console.log('💡 Adding with basic info and extracted video URLs');

        // Add with basic info
        const showId = generateUUID();
        const newShow = {
            id: showId,
            title: "As You Stood By",
            slug: generateSlug("As You Stood By"),
            description: "A compelling drama series.",
            posterUrl: "",
            backdropUrl: "",
            year: 2024,
            rating: "TV-14",
            imdbRating: null,
            genres: "Drama",
            language: "English",
            totalSeasons: 1,
            cast: "",
            creators: "",
            featured: false,
            trending: false,
            category: "drama",
            castDetails: "[]",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        streamvaultData.shows.push(newShow);
        console.log(`✓ Added show: ${newShow.title}`);

        // Add episodes
        let episodeCount = 0;
        for (const seasonKey in extractedShowData) {
            const seasonNum = parseInt(seasonKey.replace('Season ', ''));
            const seasonEpisodes = extractedShowData[seasonKey];

            for (const extractedEp of seasonEpisodes) {
                if (extractedEp.video_links && extractedEp.video_links.length > 0) {
                    const videoLink = extractedEp.video_links.find(v => v.type === 'video_src') || extractedEp.video_links[0];

                    streamvaultData.episodes.push({
                        id: generateUUID(),
                        showId: showId,
                        season: seasonNum,
                        episodeNumber: extractedEp.episode,
                        title: `Episode ${extractedEp.episode}`,
                        description: "",
                        duration: 45,
                        thumbnailUrl: "",
                        googleDriveUrl: null,
                        videoUrl: videoLink.url,
                        airDate: null
                    });
                    episodeCount++;
                }
            }
        }

        console.log(`✓ Added ${episodeCount} episodes`);

        // Save
        fs.writeFileSync(DATA_FILE, JSON.stringify(streamvaultData, null, 2));
        console.log('\n✅ COMPLETED!');
    }
}

main().catch(console.error);
