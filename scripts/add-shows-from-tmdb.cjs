#!/usr/bin/env node

/**
 * Add Shows from TMDB with Extracted Video URLs
 * Fetches full show data from TMDB and adds video URLs from extracted data
 * 
 * Usage: node scripts/add-shows-from-tmdb.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY || '920654cb695ee99175e53d6da8dc2edf';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const EXTRACTED_FILE = path.join(__dirname, '..', 'english-seasons_non_drive_category.json');
const COMPARISON_FILE = path.join(__dirname, '..', 'show_comparison_results.json');

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
                    console.log(`   ⚠️ Retry (${attempt + 1}/${retries})...`);
                    setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
                } else {
                    reject(err);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (attempt < retries) {
                    setTimeout(() => makeRequest(attempt + 1), 1000 * attempt);
                } else {
                    reject(new Error('Timeout'));
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

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function mapContentRating(ratings) {
    const usRating = ratings?.results?.find(r => r.iso_3166_1 === 'US');
    return usRating?.rating || 'TV-14';
}

function mapCategory(genres) {
    const genreMap = {
        'Action & Adventure': 'action',
        'Thriller': 'action',
        'Drama': 'drama',
        'Comedy': 'comedy',
        'Horror': 'horror',
        'Mystery': 'horror',
        'Sci-Fi & Fantasy': 'sci-fi',
        'Crime': 'crime'
    };
    for (const genre of genres || []) {
        if (genreMap[genre.name]) return genreMap[genre.name];
    }
    return 'drama';
}

async function searchShow(title) {
    const cleanTitle = title.replace(/ Tv Series| Online English Dubbed/gi, '').trim();
    const encoded = encodeURIComponent(cleanTitle);
    return await httpsGet(`${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encoded}`);
}

async function fetchShowData(showId) {
    console.log('   Fetching show details...');
    const show = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`);
    await delay(500);

    console.log('   Fetching credits...');
    const credits = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/credits?api_key=${TMDB_API_KEY}`);
    await delay(500);

    console.log('   Fetching ratings...');
    const ratings = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/content_ratings?api_key=${TMDB_API_KEY}`);
    await delay(500);

    console.log('   Fetching reviews...');
    const reviews = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/reviews?api_key=${TMDB_API_KEY}`);
    await delay(500);

    console.log('   Fetching keywords...');
    const keywords = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/keywords?api_key=${TMDB_API_KEY}`);
    await delay(500);

    console.log('   Fetching external IDs...');
    const externalIds = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/external_ids?api_key=${TMDB_API_KEY}`);
    await delay(500);

    console.log('   Fetching videos...');
    const videos = await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/videos?api_key=${TMDB_API_KEY}`);
    await delay(500);

    return { show, credits, ratings, reviews, keywords, externalIds, videos };
}

async function fetchSeasonData(showId, seasonNum) {
    return await httpsGet(`${TMDB_BASE_URL}/tv/${showId}/season/${seasonNum}?api_key=${TMDB_API_KEY}`);
}

async function main() {
    console.log('📺 Adding New Shows from TMDB');
    console.log('='.repeat(80));

    const streamvaultData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));
    const comparisonData = JSON.parse(fs.readFileSync(COMPARISON_FILE, 'utf-8'));

    const newShows = comparisonData.new_shows;
    console.log(`\n📋 Found ${newShows.length} new shows to add\n`);

    let addedShows = 0;
    let addedEpisodes = 0;

    for (const showName of newShows) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📺 ${showName}`);
        console.log('='.repeat(80));

        const extractedShowData = extractedData[showName];
        if (!extractedShowData) {
            console.log('   ⚠️ No extracted data, skipping');
            continue;
        }

        // Search TMDB
        console.log('🔍 Searching TMDB...');
        const searchResults = await searchShow(showName);
        await delay(300);

        if (!searchResults.results || searchResults.results.length === 0) {
            console.log('   ❌ Not found on TMDB, skipping');
            continue;
        }

        const tmdbShow = searchResults.results[0];
        console.log(`   ✅ Found: ${tmdbShow.name} (ID: ${tmdbShow.id})`);

        // Fetch full show data
        console.log('📥 Fetching full data...');
        const { show, credits, ratings, reviews, keywords, externalIds, videos } = await fetchShowData(tmdbShow.id);
        await delay(300);

        // Build show object
        const showId = generateUUID();
        const topCast = credits.cast?.slice(0, 10) || [];
        const castDetails = topCast.map(c => ({
            name: c.name,
            character: c.character,
            profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
        }));

        const newShow = {
            id: showId,
            title: show.name,
            slug: generateSlug(show.name),
            description: show.overview || '',
            posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
            backdropUrl: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : '',
            year: parseInt(show.first_air_date?.split('-')[0]) || new Date().getFullYear(),
            rating: mapContentRating(ratings),
            imdbRating: show.vote_average?.toFixed(1) || null,
            genres: show.genres?.map(g => g.name).join(', ') || '',
            language: 'English',
            totalSeasons: show.number_of_seasons,
            cast: topCast.map(c => c.name).join(', '),
            creators: show.created_by?.map(c => c.name).join(', ') || '',
            featured: false,
            trending: false,
            category: mapCategory(show.genres),
            castDetails: JSON.stringify(castDetails),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        streamvaultData.shows.push(newShow);
        addedShows++;
        console.log(`   ✓ Added show: ${newShow.title}`);

        // Add episodes with video URLs
        console.log('📺 Adding episodes...');
        const seasonsInExtracted = Object.keys(extractedShowData);

        for (const seasonKey of seasonsInExtracted) {
            const seasonNum = parseInt(seasonKey.replace('Season ', ''));
            const seasonEpisodes = extractedShowData[seasonKey];

            console.log(`   Season ${seasonNum}...`);
            const seasonData = await fetchSeasonData(tmdbShow.id, seasonNum);
            await delay(300);

            for (const extractedEp of seasonEpisodes) {
                const tmdbEp = seasonData.episodes?.find(e => e.episode_number === extractedEp.episode);

                if (tmdbEp && extractedEp.video_links && extractedEp.video_links.length > 0) {
                    const videoLink = extractedEp.video_links.find(v => v.type === 'video_src') || extractedEp.video_links[0];

                    streamvaultData.episodes.push({
                        id: generateUUID(),
                        showId: showId,
                        season: seasonNum,
                        episodeNumber: tmdbEp.episode_number,
                        title: tmdbEp.name || `Episode ${tmdbEp.episode_number}`,
                        description: tmdbEp.overview || '',
                        duration: tmdbEp.runtime || 45,
                        thumbnailUrl: tmdbEp.still_path ? `https://image.tmdb.org/t/p/w300${tmdbEp.still_path}` : '',
                        googleDriveUrl: null,
                        videoUrl: videoLink.url,
                        airDate: tmdbEp.air_date || null
                    });
                    addedEpisodes++;
                }
            }
        }
        console.log(`   ✓ Added ${addedEpisodes} episodes`);
    }

    // Save
    console.log('\n💾 Saving data...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(streamvaultData, null, 2));

    console.log('\n✅ COMPLETED!');
    console.log(`   Shows added: ${addedShows}`);
    console.log(`   Episodes added: ${addedEpisodes}`);
}

main().catch(console.error);
