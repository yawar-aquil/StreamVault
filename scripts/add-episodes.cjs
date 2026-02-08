#!/usr/bin/env node

/**
 * Add Episodes Script
 * Adds episodes to an existing show for a specific season
 * Fetches episode data from TMDB and prompts for Google Drive URLs
 * 
 * Usage: node scripts/add-episodes.cjs
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function httpsGet(url, retries = 3) {
    return new Promise((resolve, reject) => {
        const makeRequest = (attempt) => {
            const req = https.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'StreamVault/1.0',
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', (err) => {
                if (attempt < retries) {
                    console.log(`   ⚠️ Connection error, retrying (${attempt + 1}/${retries})...`);
                    setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
                } else {
                    reject(err);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (attempt < retries) {
                    console.log(`   ⚠️ Timeout, retrying (${attempt + 1}/${retries})...`);
                    setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
                } else {
                    reject(new Error('Request timeout'));
                }
            });
        };

        makeRequest(1);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function searchShowOnTMDB(title) {
    const encoded = encodeURIComponent(title);
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encoded}&language=en-US`;
    return await httpsGet(url);
}

async function fetchSeasonData(showId, seasonNumber) {
    const seasonUrl = `${TMDB_BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
    return await httpsGet(seasonUrl);
}

async function main() {
    console.log('📺 StreamVault Episode Adder');
    console.log('============================\n');

    if (!TMDB_API_KEY) {
        console.log('❌ Error: TMDB_API_KEY not found in .env file');
        rl.close();
        return;
    }

    try {
        // Load existing data
        console.log('📂 Loading existing data...');
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        // List all shows
        console.log('\n📋 Available shows:\n');
        const shows = data.shows || [];

        // Show paginated list
        const pageSize = 20;
        let page = 0;
        let selectedShow = null;

        while (!selectedShow) {
            const start = page * pageSize;
            const end = Math.min(start + pageSize, shows.length);

            for (let i = start; i < end; i++) {
                console.log(`   ${i + 1}. ${shows[i].title} (${shows[i].year})`);
            }

            console.log(`\n   Showing ${start + 1}-${end} of ${shows.length}`);
            const input = await question('\nEnter show number (or "n" for next, "p" for prev, or search term): ');

            if (input.toLowerCase() === 'n' && end < shows.length) {
                page++;
                continue;
            } else if (input.toLowerCase() === 'p' && page > 0) {
                page--;
                continue;
            } else if (!isNaN(input)) {
                const idx = parseInt(input) - 1;
                if (idx >= 0 && idx < shows.length) {
                    selectedShow = shows[idx];
                } else {
                    console.log('❌ Invalid number');
                }
            } else {
                // Search by title
                const matches = shows.filter(s =>
                    s.title.toLowerCase().includes(input.toLowerCase())
                );
                if (matches.length === 0) {
                    console.log('❌ No matches found');
                } else if (matches.length === 1) {
                    selectedShow = matches[0];
                } else {
                    console.log('\n   Matches found:');
                    matches.slice(0, 10).forEach((m, i) => {
                        console.log(`   ${i + 1}. ${m.title} (${m.year})`);
                    });
                    const matchInput = await question('Enter number: ');
                    const matchIdx = parseInt(matchInput) - 1;
                    if (matchIdx >= 0 && matchIdx < matches.length) {
                        selectedShow = matches[matchIdx];
                    }
                }
            }
        }

        console.log(`\n✅ Selected: ${selectedShow.title}`);
        console.log(`   Seasons: ${selectedShow.totalSeasons || 'Unknown'}`);

        // Ask for season number
        const seasonInput = await question('\nEnter season number to add episodes for: ');
        const seasonNumber = parseInt(seasonInput);

        if (isNaN(seasonNumber) || seasonNumber < 1) {
            console.log('❌ Invalid season number');
            rl.close();
            return;
        }

        // Check existing episodes for this season
        const existingEpisodes = (data.episodes || []).filter(
            e => e.showId === selectedShow.id && e.season === seasonNumber
        );
        console.log(`\n📺 Season ${seasonNumber} - ${existingEpisodes.length} episodes already exist`);

        if (existingEpisodes.length > 0) {
            console.log('   Existing episodes:');
            existingEpisodes.forEach(e => {
                console.log(`   - S${e.season}E${e.episodeNumber}: ${e.title}`);
            });
        }

        // Search for show on TMDB to get TMDB ID
        console.log(`\n🔍 Searching TMDB for "${selectedShow.title}"...`);
        const searchResults = await searchShowOnTMDB(selectedShow.title);

        if (!searchResults.results || searchResults.results.length === 0) {
            console.log('❌ Show not found on TMDB');
            const manualInput = await question('Enter TMDB ID manually (or press Enter to skip): ');
            if (!manualInput) {
                rl.close();
                return;
            }
        }

        // Find best match
        let tmdbShow = searchResults.results.find(r =>
            r.name.toLowerCase() === selectedShow.title.toLowerCase()
        ) || searchResults.results[0];

        console.log(`✅ Found on TMDB: ${tmdbShow.name} (ID: ${tmdbShow.id})`);

        // Fetch season data
        console.log(`\n📥 Fetching season ${seasonNumber} episodes from TMDB...`);
        await delay(300);
        const seasonData = await fetchSeasonData(tmdbShow.id, seasonNumber);

        if (!seasonData.episodes || seasonData.episodes.length === 0) {
            console.log('❌ No episodes found for this season on TMDB');
            rl.close();
            return;
        }

        console.log(`   Found ${seasonData.episodes.length} episodes\n`);

        // Filter out episodes that already exist
        const existingEpNums = existingEpisodes.map(e => e.episodeNumber);
        const newEpisodesFromTMDB = seasonData.episodes.filter(
            e => !existingEpNums.includes(e.episode_number)
        );

        if (newEpisodesFromTMDB.length === 0) {
            console.log('✅ All episodes already exist for this season!');
            rl.close();
            return;
        }

        console.log(`📝 ${newEpisodesFromTMDB.length} new episodes to add:\n`);

        // Ask for Google Drive URLs for each new episode
        const newEpisodes = [];

        for (const ep of newEpisodesFromTMDB) {
            const epNum = ep.episode_number;
            const epTitle = ep.name || `Episode ${epNum}`;

            console.log(`   S${seasonNumber}E${epNum}: ${epTitle}`);
            if (ep.overview) {
                console.log(`   ${ep.overview.substring(0, 100)}...`);
            }

            const driveUrl = await question(`   Google Drive URL (or Enter to skip): `);

            if (driveUrl && driveUrl.trim()) {
                // Extract file ID from various Google Drive URL formats
                let fileId = driveUrl.trim();

                // Handle full URLs
                if (fileId.includes('drive.google.com')) {
                    const match = fileId.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (match) {
                        fileId = match[1];
                    }
                }

                newEpisodes.push({
                    id: generateUUID(),
                    showId: selectedShow.id,
                    season: seasonNumber,
                    episodeNumber: epNum,
                    title: epTitle,
                    description: ep.overview || '',
                    duration: ep.runtime || 45,
                    thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : '',
                    googleDriveUrl: fileId,
                    videoUrl: null,
                    airDate: ep.air_date || null
                });
                console.log(`   ✅ Added\n`);
            } else {
                console.log(`   ⏭️  Skipped\n`);
            }
        }

        if (newEpisodes.length === 0) {
            console.log('❌ No episodes added');
            rl.close();
            return;
        }

        // Add new episodes
        data.episodes.push(...newEpisodes);

        // Update show's updatedAt timestamp
        const showIndex = data.shows.findIndex(s => s.id === selectedShow.id);
        if (showIndex !== -1) {
            data.shows[showIndex].updatedAt = new Date().toISOString();
            console.log('📅 Updated show timestamp (will appear in newsletter)');
        }

        // Save data
        console.log('\n💾 Saving data...');
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        console.log('\n✅ Episodes added successfully!');
        console.log(`   Show: ${selectedShow.title}`);
        console.log(`   Season: ${seasonNumber}`);
        console.log(`   Episodes added: ${newEpisodes.length}`);
        newEpisodes.forEach(e => {
            console.log(`   - S${e.season}E${e.episodeNumber}: ${e.title}`);
        });

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    rl.close();
}

main();
