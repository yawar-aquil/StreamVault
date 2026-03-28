#!/usr/bin/env node

/**
 * Add Anime Episodes Script
 * Adds episodes to an existing anime in streamvault-data.json
 * 
 * Usage: node scripts/add-anime-episodes.cjs
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

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchShowOnTMDB(title) {
    const encoded = encodeURIComponent(title);
    const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encoded}&language=en-US`;
    return await httpsGet(url);
}

async function fetchSeasonData(tmdbId, seasonNumber) {
    const seasonUrl = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`;
    return await httpsGet(seasonUrl);
}

async function main() {
    console.log('🎌 StreamVault Anime Episode Adder');
    console.log('===================================\n');

    if (!TMDB_API_KEY) {
        console.log('❌ Error: TMDB_API_KEY not found in .env file');
        rl.close();
        return;
    }

    try {
        // Load existing data
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

        if (!data.anime || data.anime.length === 0) {
            console.log('❌ No anime found in database. Use add-anime.cjs first.');
            rl.close();
            return;
        }

        // List available anime
        console.log('\n📋 Available anime:\n');
        const animeList = data.anime || [];

        // Show paginated list
        const pageSize = 20;
        let page = 0;
        let selectedAnime = null;

        while (!selectedAnime) {
            const start = page * pageSize;
            const end = Math.min(start + pageSize, animeList.length);

            for (let i = start; i < end; i++) {
                const epCount = (data.animeEpisodes || []).filter(e => e.animeId === animeList[i].id).length;
                console.log(`   ${i + 1}. ${animeList[i].title} (${animeList[i].year}) - ${epCount} episodes`);
            }

            console.log(`\n   Showing ${start + 1}-${end} of ${animeList.length}`);
            const input = await question('\nEnter anime number (or "n" for next, "p" for prev, or search term): ');

            if (input.toLowerCase() === 'n' && end < animeList.length) {
                page++;
                continue;
            } else if (input.toLowerCase() === 'p' && page > 0) {
                page--;
                continue;
            } else if (!isNaN(input) && input.trim() !== '') {
                const idx = parseInt(input) - 1;
                if (idx >= 0 && idx < animeList.length) {
                    selectedAnime = animeList[idx];
                } else {
                    console.log('❌ Invalid number');
                }
            } else {
                // Search by title
                const matches = animeList.filter(s =>
                    s.title.toLowerCase().includes(input.toLowerCase())
                );
                if (matches.length === 0) {
                    console.log('❌ No matches found');
                } else if (matches.length === 1) {
                    selectedAnime = matches[0];
                } else {
                    console.log('\n   Matches found:');
                    matches.slice(0, 10).forEach((m, i) => {
                        const epCount = (data.animeEpisodes || []).filter(e => e.animeId === m.id).length;
                        console.log(`   ${i + 1}. ${m.title} (${m.year}) - ${epCount} episodes`);
                    });
                    const matchInput = await question('Enter number: ');
                    const matchIdx = parseInt(matchInput) - 1;
                    if (matchIdx >= 0 && matchIdx < matches.length) {
                        selectedAnime = matches[matchIdx];
                    }
                }
            }
        }

        console.log(`\n✅ Selected: ${selectedAnime.title}`);

        // Ask for method: TMDB or manual
        const method = await question('\nAdd episodes from TMDB (t) or manually (m)? (t/m): ');

        const newEpisodes = [];

        if (method.toLowerCase() === 't') {
            // TMDB method
            let tmdbId = selectedAnime.tmdbId;

            if (!tmdbId) {
                console.log(`\n🔍 Searching TMDB for "${selectedAnime.title}"...`);
                const searchResults = await searchShowOnTMDB(selectedAnime.title);

                if (!searchResults.results || searchResults.results.length === 0) {
                    console.log('❌ Show not found on TMDB');
                    const manualInput = await question('Enter TMDB TV Show ID manually (or press Enter to skip): ');
                    if (!manualInput) {
                        rl.close();
                        return;
                    }
                    tmdbId = parseInt(manualInput, 10);
                } else {
                    let tmdbShow = searchResults.results.find(r => 
                        r.name.toLowerCase() === selectedAnime.title.toLowerCase()
                    ) || searchResults.results[0];
                    console.log(`✅ Found on TMDB: ${tmdbShow.name} (ID: ${tmdbShow.id})`);
                    tmdbId = tmdbShow.id;
                }
            }

            const seasonNum = await question('Season number to add: ');
            const season = parseInt(seasonNum);

            if (isNaN(season) || season < 1) {
                console.log('❌ Invalid season number');
                rl.close();
                return;
            }

            console.log(`\n📥 Fetching season ${season} data from TMDB...`);
            const seasonData = await fetchSeasonData(tmdbId, season);

            if (!seasonData.episodes || seasonData.episodes.length === 0) {
                console.log('❌ No episodes found for this season');
                rl.close();
                return;
            }

            console.log(`   Found ${seasonData.episodes.length} episodes\n`);

            // Check for existing episodes in this season
            const existingEps = (data.animeEpisodes || []).filter(
                e => e.animeId === selectedAnime.id && e.season === season
            );

            if (existingEps.length > 0) {
                console.log(`⚠️  Found ${existingEps.length} existing episodes for season ${season}`);
                const replace = (await question('Replace existing episodes? (y/n): ')).toLowerCase() === 'y';
                if (replace) {
                    data.animeEpisodes = (data.animeEpisodes || []).filter(
                        e => !(e.animeId === selectedAnime.id && e.season === season)
                    );
                }
            }

            // Ask for dubbed/subbed
            const isDubbed = (await question('Are these episodes dubbed? (y/n): ')).toLowerCase() === 'y';

            console.log('\nEnter Google Drive URLs for each episode (or press Enter to skip):\n');

            for (const ep of seasonData.episodes) {
                const epNum = ep.episode_number;
                const epTitle = ep.name || `Episode ${epNum}`;

                const driveUrl = await question(`S${season}E${epNum} - ${epTitle}: `);

                if (driveUrl && driveUrl.trim()) {
                    newEpisodes.push({
                        id: generateUUID(),
                        animeId: selectedAnime.id,
                        season: season,
                        episodeNumber: epNum,
                        title: epTitle,
                        description: ep.overview || '',
                        duration: ep.runtime || 24,
                        thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : '',
                        googleDriveUrl: driveUrl.trim(),
                        videoUrl: null,
                        airDate: ep.air_date || null,
                        dubbed: isDubbed
                    });
                }
            }

        } else {
            // Manual method
            const season = parseInt(await question('Season number: '));
            const startEp = parseInt(await question('Starting episode number: '));
            const endEp = parseInt(await question('Ending episode number: '));
            const isDubbed = (await question('Are these episodes dubbed? (y/n): ')).toLowerCase() === 'y';

            if (isNaN(season) || isNaN(startEp) || isNaN(endEp) || startEp > endEp) {
                console.log('❌ Invalid episode range');
                rl.close();
                return;
            }

            console.log('\nEnter Google Drive URLs for each episode:\n');

            for (let epNum = startEp; epNum <= endEp; epNum++) {
                const title = await question(`S${season}E${epNum} title (default: Episode ${epNum}): `) || `Episode ${epNum}`;
                const driveUrl = await question(`S${season}E${epNum} Google Drive URL: `);

                if (driveUrl && driveUrl.trim()) {
                    newEpisodes.push({
                        id: generateUUID(),
                        animeId: selectedAnime.id,
                        season: season,
                        episodeNumber: epNum,
                        title: title,
                        description: '',
                        duration: 24,
                        thumbnailUrl: '',
                        googleDriveUrl: driveUrl.trim(),
                        videoUrl: null,
                        airDate: null,
                        dubbed: isDubbed
                    });
                }
            }
        }

        if (newEpisodes.length === 0) {
            console.log('\n⚠️ No episodes to add.');
            rl.close();
            return;
        }

        // Add episodes
        if (!data.animeEpisodes) data.animeEpisodes = [];
        data.animeEpisodes.push(...newEpisodes);

        // Save data
        console.log('\n💾 Saving data...');
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        console.log('\n✅ Episodes added successfully!');
        console.log(`   Anime: ${selectedAnime.title}`);
        console.log(`   Episodes added: ${newEpisodes.length}`);
        console.log(`   Total episodes now: ${data.animeEpisodes.filter(e => e.animeId === selectedAnime.id).length}`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }

    rl.close();
}

main();
