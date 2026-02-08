/**
 * Script to fetch and add missing YouTube trailers from TMDB
 * Reads blog posts without trailers and updates them with trailer info
 * 
 * Features:
 * - Primary: Fetches trailers from TMDB videos API
 * - Fallback: Uses YouTube Data API when TMDB doesn't have videos
 * - Fallback 2: Scrapes YouTube search results as last resort
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Optional but recommended
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Delay helper to avoid rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Search YouTube for a trailer using YouTube Data API (if available)
 * Falls back to scraping YouTube search page
 */
async function searchYouTubeTrailer(title, year, contentType = 'movie') {
    const searchQuery = `${title} ${year || ''} official trailer ${contentType === 'show' ? 'tv series' : ''}`.trim();

    // Try YouTube Data API first (if key available)
    if (YOUTUBE_API_KEY) {
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                // Find the most relevant trailer (prefer official channels)
                const video = data.items?.find(v =>
                    v.snippet.title.toLowerCase().includes('trailer') ||
                    v.snippet.title.toLowerCase().includes('official')
                ) || data.items?.[0];

                if (video) {
                    return {
                        key: video.id.videoId,
                        name: video.snippet.title,
                        source: 'youtube_api'
                    };
                }
            }
        } catch (error) {
            console.log(`   ⚠️ YouTube API error: ${error.message}`);
        }
    }

    // Fallback: Scrape YouTube search page
    try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.ok) {
            const html = await response.text();
            // Extract video IDs from the page
            const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            if (videoIdMatch) {
                return {
                    key: videoIdMatch[1],
                    name: `${title} Official Trailer`,
                    source: 'youtube_scrape'
                };
            }
        }
    } catch (error) {
        console.log(`   ⚠️ YouTube scrape error: ${error.message}`);
    }

    return null;
}

/**
 * Get movie release year from TMDB
 */
async function getMovieYear(tmdbId) {
    try {
        const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.release_date?.split('-')[0] || null;
    } catch (error) {
        return null;
    }
}

/**
 * Get show first air year from TMDB
 */
async function getShowYear(tmdbId) {
    try {
        const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.first_air_date?.split('-')[0] || null;
    } catch (error) {
        return null;
    }
}

// Search TMDB for a show by title
async function searchTMDBShow(title) {
    try {
        const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.results?.[0] || null; // Return full result for year extraction
    } catch (error) {
        console.error(`Error searching show "${title}":`, error.message);
        return null;
    }
}

// Search TMDB for a movie by title
async function searchTMDBMovie(title) {
    try {
        const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.results?.[0] || null; // Return full result for year extraction
    } catch (error) {
        console.error(`Error searching movie "${title}":`, error.message);
        return null;
    }
}

// Fetch videos (trailers) for a show - with YouTube fallback
async function fetchShowVideos(tmdbId, title, year) {
    try {
        const url = `${TMDB_BASE_URL}/tv/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();

        // Find official trailer or teaser
        const trailer = data.results?.find(v =>
            v.site === 'YouTube' &&
            (v.type === 'Trailer' || v.type === 'Teaser') &&
            v.official === true
        ) || data.results?.find(v =>
            v.site === 'YouTube' &&
            (v.type === 'Trailer' || v.type === 'Teaser')
        ) || data.results?.find(v =>
            v.site === 'YouTube'
        );

        if (trailer) {
            return { key: trailer.key, name: trailer.name, source: 'tmdb' };
        }

        // FALLBACK: Search YouTube directly
        console.log(`   🔍 TMDB has no videos, trying YouTube fallback...`);
        return await searchYouTubeTrailer(title, year, 'show');
    } catch (error) {
        console.error(`Error fetching show videos:`, error.message);
        return null;
    }
}

// Fetch videos for a movie - with YouTube fallback
async function fetchMovieVideos(tmdbId, title, year) {
    try {
        const url = `${TMDB_BASE_URL}/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();

        // Find official trailer or teaser
        const trailer = data.results?.find(v =>
            v.site === 'YouTube' &&
            v.type === 'Trailer' &&
            v.official === true
        ) || data.results?.find(v =>
            v.site === 'YouTube' &&
            v.type === 'Trailer'
        ) || data.results?.find(v =>
            v.site === 'YouTube' &&
            v.type === 'Teaser'
        ) || data.results?.find(v =>
            v.site === 'YouTube'
        );

        if (trailer) {
            return { key: trailer.key, name: trailer.name, source: 'tmdb' };
        }

        // FALLBACK: Search YouTube directly
        console.log(`   🔍 TMDB has no videos, trying YouTube fallback...`);
        return await searchYouTubeTrailer(title, year, 'movie');
    } catch (error) {
        console.error(`Error fetching movie videos:`, error.message);
        return null;
    }
}

// Fetch seasons with trailers for a show - with YouTube fallback for missing trailers
async function fetchShowSeasonTrailers(tmdbId, numSeasons, showTitle, showYear) {
    const seasonDetails = [];
    let foundAnyTrailer = false;

    for (let seasonNum = 1; seasonNum <= numSeasons; seasonNum++) {
        try {
            const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_API_KEY}&append_to_response=videos`;
            const response = await fetch(url);
            if (!response.ok) continue;

            const data = await response.json();

            // Find trailer for this season
            const videos = data.videos?.results || [];
            const trailer = videos.find(v =>
                v.site === 'YouTube' &&
                (v.type === 'Trailer' || v.type === 'Teaser')
            );

            if (trailer) foundAnyTrailer = true;

            seasonDetails.push({
                seasonNumber: seasonNum,
                name: data.name || `Season ${seasonNum}`,
                overview: data.overview || '',
                airDate: data.air_date || null,
                episodeCount: data.episodes?.length || 0,
                posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : null,
                trailerKey: trailer?.key || null,
                trailerName: trailer?.name || null
            });

            await delay(100); // Small delay between season requests
        } catch (error) {
            console.error(`Error fetching season ${seasonNum}:`, error.message);
        }
    }

    // If no trailers found for any season, try YouTube fallback for season 1
    if (!foundAnyTrailer && seasonDetails.length > 0 && showTitle) {
        console.log(`   🔍 No TMDB season trailers, trying YouTube fallback...`);
        const ytTrailer = await searchYouTubeTrailer(showTitle, showYear, 'show');
        if (ytTrailer && seasonDetails[0]) {
            seasonDetails[0].trailerKey = ytTrailer.key;
            seasonDetails[0].trailerName = ytTrailer.name;
            seasonDetails[0].trailerSource = ytTrailer.source;
        }
    }

    return seasonDetails;
}

// Main function
async function main() {
    console.log('🎬 Missing Trailers Fetcher\n');

    if (!TMDB_API_KEY) {
        console.error('❌ TMDB_API_KEY not found in environment variables');
        process.exit(1);
    }

    // Load data
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`📊 Loaded ${data.blogPosts.length} blog posts\n`);

    // Find blog posts without trailers
    const postsToUpdate = [];

    data.blogPosts.forEach(bp => {
        let hasTrailer = false;

        // Check seasonDetails for shows
        if (bp.seasonDetails) {
            try {
                const seasons = JSON.parse(bp.seasonDetails);
                hasTrailer = seasons.some(s => s.trailerKey && s.trailerKey !== null);
            } catch (e) { }
        }

        // Check trivia for movie trailers
        if (bp.trivia) {
            try {
                const triviaArr = JSON.parse(bp.trivia);
                hasTrailer = hasTrailer || triviaArr.some(t => t.includes('youtube.com/watch'));
            } catch (e) { }
        }

        if (!hasTrailer) {
            postsToUpdate.push(bp);
        }
    });

    console.log(`🔍 Found ${postsToUpdate.length} blog posts without trailers\n`);

    let updated = 0;
    let failed = 0;

    for (const bp of postsToUpdate) {
        console.log(`\n📺 Processing: ${bp.title} (${bp.contentType})`);

        try {
            if (bp.contentType === 'show') {
                // Search for the show
                const tmdbResult = await searchTMDBShow(bp.title);

                if (!tmdbResult) {
                    console.log(`   ⚠️ Could not find on TMDB, trying YouTube directly...`);
                    // Fallback to YouTube search directly
                    const ytTrailer = await searchYouTubeTrailer(bp.title, null, 'show');
                    if (ytTrailer) {
                        const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
                        if (bpIndex !== -1) {
                            try {
                                const trivia = JSON.parse(data.blogPosts[bpIndex].trivia || '[]');
                                const trailerLine = `Watch the official trailer: https://www.youtube.com/watch?v=${ytTrailer.key}`;
                                if (!trivia.some(t => t.includes('youtube.com/watch'))) {
                                    trivia.push(trailerLine);
                                    data.blogPosts[bpIndex].trivia = JSON.stringify(trivia);
                                }
                                console.log(`   ✅ Added trailer from YouTube: ${ytTrailer.source}`);
                                updated++;
                            } catch (e) { }
                        }
                    } else {
                        failed++;
                    }
                    continue;
                }

                const tmdbId = tmdbResult.id;
                const showYear = tmdbResult.first_air_date?.split('-')[0] || null;
                console.log(`   ✅ Found TMDB ID: ${tmdbId} (${showYear})`);

                // Get show details to know number of seasons
                const showUrl = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
                const showRes = await fetch(showUrl);
                const showData = await showRes.json();
                const numSeasons = showData.number_of_seasons || 1;

                // Fetch season trailers
                const seasonDetails = await fetchShowSeasonTrailers(tmdbId, numSeasons, bp.title, showYear);

                const hasNewTrailer = seasonDetails.some(s => s.trailerKey);

                if (hasNewTrailer) {
                    // Update the blog post
                    const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
                    if (bpIndex !== -1) {
                        data.blogPosts[bpIndex].seasonDetails = JSON.stringify(seasonDetails);

                        // Also update trivia with trailer link
                        const mainTrailer = seasonDetails.find(s => s.trailerKey);
                        if (mainTrailer) {
                            try {
                                const trivia = JSON.parse(data.blogPosts[bpIndex].trivia || '[]');
                                const trailerLine = `Watch the official trailer: https://www.youtube.com/watch?v=${mainTrailer.trailerKey}`;
                                if (!trivia.some(t => t.includes('youtube.com/watch'))) {
                                    trivia.push(trailerLine);
                                    data.blogPosts[bpIndex].trivia = JSON.stringify(trivia);
                                }
                            } catch (e) { }
                        }

                        console.log(`   ✅ Added trailers for ${seasonDetails.filter(s => s.trailerKey).length} seasons`);
                        updated++;
                    }
                } else {
                    // Try to get show-level trailer (with YouTube fallback)
                    const showTrailer = await fetchShowVideos(tmdbId, bp.title, showYear);
                    if (showTrailer) {
                        // Add trailer to trivia
                        const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
                        if (bpIndex !== -1) {
                            try {
                                const trivia = JSON.parse(data.blogPosts[bpIndex].trivia || '[]');
                                const trailerLine = `Watch the official trailer: https://www.youtube.com/watch?v=${showTrailer.key}`;
                                if (!trivia.some(t => t.includes('youtube.com/watch'))) {
                                    trivia.push(trailerLine);
                                    data.blogPosts[bpIndex].trivia = JSON.stringify(trivia);
                                }
                                console.log(`   ✅ Added show-level trailer (source: ${showTrailer.source})`);
                                updated++;
                            } catch (e) { }
                        }
                    } else {
                        console.log(`   ⚠️ No trailer found`);
                        failed++;
                    }
                }

            } else if (bp.contentType === 'movie') {
                // Search for the movie
                const tmdbResult = await searchTMDBMovie(bp.title);

                if (!tmdbResult) {
                    console.log(`   ⚠️ Could not find on TMDB, trying YouTube directly...`);
                    // Fallback to YouTube search directly
                    const ytTrailer = await searchYouTubeTrailer(bp.title, null, 'movie');
                    if (ytTrailer) {
                        const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
                        if (bpIndex !== -1) {
                            try {
                                const trivia = JSON.parse(data.blogPosts[bpIndex].trivia || '[]');
                                const trailerLine = `Watch the official trailer: https://www.youtube.com/watch?v=${ytTrailer.key}`;
                                if (!trivia.some(t => t.includes('youtube.com/watch'))) {
                                    trivia.push(trailerLine);
                                    data.blogPosts[bpIndex].trivia = JSON.stringify(trivia);
                                }
                                console.log(`   ✅ Added trailer from YouTube: ${ytTrailer.source}`);
                                updated++;
                            } catch (e) { }
                        }
                    } else {
                        failed++;
                    }
                    continue;
                }

                const tmdbId = tmdbResult.id;
                const movieYear = tmdbResult.release_date?.split('-')[0] || null;
                console.log(`   ✅ Found TMDB ID: ${tmdbId} (${movieYear})`);

                // Fetch movie trailer (with YouTube fallback)
                const trailer = await fetchMovieVideos(tmdbId, bp.title, movieYear);

                if (trailer) {
                    // Update trivia with trailer link
                    const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
                    if (bpIndex !== -1) {
                        try {
                            const trivia = JSON.parse(data.blogPosts[bpIndex].trivia || '[]');
                            const trailerLine = `Watch the official trailer: https://www.youtube.com/watch?v=${trailer.key}`;
                            if (!trivia.some(t => t.includes('youtube.com/watch'))) {
                                trivia.push(trailerLine);
                                data.blogPosts[bpIndex].trivia = JSON.stringify(trivia);
                            }
                            console.log(`   ✅ Added trailer: ${trailer.name} (source: ${trailer.source})`);
                            updated++;
                        } catch (e) { }
                    }
                } else {
                    console.log(`   ⚠️ No trailer found`);
                    failed++;
                }
            }

            // Rate limiting - wait between requests
            await delay(250);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
        }
    }

    // Save updated data
    console.log('\n\n💾 Saving updated data...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️ Failed/Not found: ${failed}`);
    console.log(`   📁 Data saved to: ${DATA_FILE}`);
}

main().catch(console.error);
