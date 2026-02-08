/**
 * Script to add missing season trailers for TV shows
 * Uses TMDB as primary source, YouTube search as fallback
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Search YouTube for a specific season trailer
async function searchYouTubeSeasonTrailer(showTitle, seasonNum, showYear) {
    const searchQuery = `${showTitle} season ${seasonNum} official trailer`;

    try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.ok) {
            const html = await response.text();
            const pattern = /"videoId":"([a-zA-Z0-9_-]{11})"/;
            const videoIdMatch = html.match(pattern);
            if (videoIdMatch) {
                return {
                    key: videoIdMatch[1],
                    name: `${showTitle} Season ${seasonNum} Official Trailer`
                };
            }
        }
    } catch (error) {
        console.log(`      ⚠️ YouTube error: ${error.message}`);
    }

    return null;
}

// Search TMDB for a show
async function searchTMDBShow(title) {
    try {
        const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.results?.[0] || null;
    } catch (error) {
        return null;
    }
}

// Fetch season details with trailer from TMDB
async function fetchSeasonFromTMDB(tmdbId, seasonNum) {
    try {
        const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_API_KEY}&append_to_response=videos`;
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        const videos = data.videos?.results || [];
        const trailer = videos.find(v =>
            v.site === 'YouTube' &&
            (v.type === 'Trailer' || v.type === 'Teaser')
        );

        return {
            seasonNumber: seasonNum,
            name: data.name || `Season ${seasonNum}`,
            overview: data.overview || '',
            airDate: data.air_date || null,
            episodeCount: data.episodes?.length || 0,
            posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : null,
            trailerKey: trailer?.key || null,
            trailerName: trailer?.name || null
        };
    } catch (error) {
        return null;
    }
}

async function main() {
    console.log('🎬 Season Trailer Fetcher\n');

    if (!TMDB_API_KEY) {
        console.error('❌ TMDB_API_KEY not found');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`📊 Found ${data.blogPosts.filter(b => b.contentType === 'show').length} shows\n`);

    let totalSeasonsUpdated = 0;
    let showsProcessed = 0;

    for (const bp of data.blogPosts.filter(b => b.contentType === 'show')) {
        if (!bp.seasonDetails) continue;

        let seasons;
        try {
            seasons = JSON.parse(bp.seasonDetails);
        } catch (e) {
            continue;
        }

        // Check which seasons are missing trailers
        const missingSeasons = seasons.filter(s => !s.trailerKey);
        if (missingSeasons.length === 0) continue;

        console.log(`\n📺 ${bp.title} - ${missingSeasons.length}/${seasons.length} seasons missing trailers`);
        showsProcessed++;

        // Search TMDB for the show
        const tmdbResult = await searchTMDBShow(bp.title);
        const tmdbId = tmdbResult?.id;
        const showYear = tmdbResult?.first_air_date?.split('-')[0];

        if (tmdbId) {
            console.log(`   ✅ TMDB ID: ${tmdbId}`);
        }

        let updatedCount = 0;

        for (const missingSeason of missingSeasons) {
            const seasonNum = missingSeason.seasonNumber;
            console.log(`   📹 Season ${seasonNum}...`);

            let trailerKey = null;
            let trailerName = null;

            // Try TMDB first
            if (tmdbId) {
                const tmdbSeason = await fetchSeasonFromTMDB(tmdbId, seasonNum);
                if (tmdbSeason?.trailerKey) {
                    trailerKey = tmdbSeason.trailerKey;
                    trailerName = tmdbSeason.trailerName;
                    console.log(`      ✅ Found on TMDB: ${trailerKey}`);
                }
                await delay(100);
            }

            // Fallback to YouTube
            if (!trailerKey) {
                const ytTrailer = await searchYouTubeSeasonTrailer(bp.title, seasonNum, showYear);
                if (ytTrailer) {
                    trailerKey = ytTrailer.key;
                    trailerName = ytTrailer.name;
                    console.log(`      ✅ Found on YouTube: ${trailerKey}`);
                } else {
                    console.log(`      ⚠️ No trailer found`);
                }
                await delay(200);
            }

            // Update the season
            if (trailerKey) {
                const seasonIdx = seasons.findIndex(s => s.seasonNumber === seasonNum);
                if (seasonIdx !== -1) {
                    seasons[seasonIdx].trailerKey = trailerKey;
                    seasons[seasonIdx].trailerName = trailerName;
                    updatedCount++;
                    totalSeasonsUpdated++;
                }
            }
        }

        // Save updated seasons back
        if (updatedCount > 0) {
            const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
            if (bpIndex !== -1) {
                data.blogPosts[bpIndex].seasonDetails = JSON.stringify(seasons);
            }
            console.log(`   ✅ Updated ${updatedCount} seasons`);
        }

        await delay(250);
    }

    // Save data
    console.log('\n\n💾 Saving...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log('\n📊 Summary:');
    console.log(`   Shows processed: ${showsProcessed}`);
    console.log(`   Seasons updated: ${totalSeasonsUpdated}`);
}

main().catch(console.error);
