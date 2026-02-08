/**
 * Script to add production company info and external links to blog posts
 * Fetches from TMDB: production companies (logos, websites), external IDs (social media)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch production companies with their details
async function fetchProductionCompanies(companies) {
    const enrichedCompanies = [];

    for (const company of companies.slice(0, 5)) { // Limit to top 5
        try {
            // Get company details including homepage
            const res = await fetch(`${TMDB_BASE_URL}/company/${company.id}?api_key=${TMDB_API_KEY}`);
            if (!res.ok) {
                enrichedCompanies.push({
                    name: company.name,
                    logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w200${company.logo_path}` : null,
                    website: null,
                    country: company.origin_country || null
                });
                continue;
            }

            const data = await res.json();
            enrichedCompanies.push({
                name: data.name || company.name,
                logoUrl: data.logo_path ? `https://image.tmdb.org/t/p/w200${data.logo_path}` : null,
                website: data.homepage || null,
                description: data.description || null,
                country: data.origin_country || company.origin_country || null
            });

            await delay(100);
        } catch (error) {
            console.log(`      ⚠️ Error fetching company ${company.name}:`, error.message);
            enrichedCompanies.push({
                name: company.name,
                logoUrl: company.logo_path ? `https://image.tmdb.org/t/p/w200${company.logo_path}` : null,
                website: null,
                country: company.origin_country || null
            });
        }
    }

    return enrichedCompanies;
}

// Fetch external IDs (social media) for a movie
async function fetchMovieExternalIds(tmdbId) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            imdb: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : null,
            facebook: data.facebook_id ? `https://www.facebook.com/${data.facebook_id}` : null,
            twitter: data.twitter_id ? `https://twitter.com/${data.twitter_id}` : null,
            instagram: data.instagram_id ? `https://www.instagram.com/${data.instagram_id}` : null,
            wikidata: data.wikidata_id ? `https://www.wikidata.org/wiki/${data.wikidata_id}` : null
        };
    } catch (error) {
        return null;
    }
}

// Fetch external IDs for a TV show
async function fetchShowExternalIds(tmdbId) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            imdb: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : null,
            facebook: data.facebook_id ? `https://www.facebook.com/${data.facebook_id}` : null,
            twitter: data.twitter_id ? `https://twitter.com/${data.twitter_id}` : null,
            instagram: data.instagram_id ? `https://www.instagram.com/${data.instagram_id}` : null,
            wikidata: data.wikidata_id ? `https://www.wikidata.org/wiki/${data.wikidata_id}` : null
        };
    } catch (error) {
        return null;
    }
}

// Fetch movie details including production companies and homepage
async function fetchMovieDetails(tmdbId) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        return null;
    }
}

// Fetch show details including production companies and homepage
async function fetchShowDetails(tmdbId) {
    try {
        const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        return null;
    }
}

// Search TMDB for a movie
async function searchTMDBMovie(title) {
    try {
        const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.results?.[0]?.id || null;
    } catch (error) {
        return null;
    }
}

// Search TMDB for a show
async function searchTMDBShow(title) {
    try {
        const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.results?.[0]?.id || null;
    } catch (error) {
        return null;
    }
}

async function main() {
    console.log('🏢 Production Info & External Links Fetcher\n');

    if (!TMDB_API_KEY) {
        console.error('❌ TMDB_API_KEY not found');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`📊 Found ${data.blogPosts.length} blog posts\n`);

    let updated = 0;
    let skipped = 0;

    for (const bp of data.blogPosts) {
        // Skip if already has production info
        if (bp.productionCompanies && bp.externalLinks) {
            skipped++;
            continue;
        }

        console.log(`\n📺 ${bp.title} (${bp.contentType})`);

        try {
            let tmdbId = null;
            let details = null;
            let externalIds = null;

            if (bp.contentType === 'movie') {
                tmdbId = await searchTMDBMovie(bp.title);
                if (tmdbId) {
                    console.log(`   ✅ TMDB ID: ${tmdbId}`);
                    details = await fetchMovieDetails(tmdbId);
                    externalIds = await fetchMovieExternalIds(tmdbId);
                }
            } else if (bp.contentType === 'show') {
                tmdbId = await searchTMDBShow(bp.title);
                if (tmdbId) {
                    console.log(`   ✅ TMDB ID: ${tmdbId}`);
                    details = await fetchShowDetails(tmdbId);
                    externalIds = await fetchShowExternalIds(tmdbId);
                }
            }

            if (!details) {
                console.log(`   ⚠️ Could not fetch details from TMDB`);
                continue;
            }

            // Fetch enriched production companies
            let productionCompanies = [];
            if (details.production_companies?.length > 0) {
                console.log(`   🏢 Fetching ${details.production_companies.length} production companies...`);
                productionCompanies = await fetchProductionCompanies(details.production_companies);
                console.log(`   ✅ Got ${productionCompanies.length} companies`);
            }

            // Build external links object
            const externalLinks = {
                homepage: details.homepage || null,
                ...externalIds
            };

            // Update blog post
            const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
            if (bpIndex !== -1) {
                data.blogPosts[bpIndex].productionCompanies = JSON.stringify(productionCompanies);
                data.blogPosts[bpIndex].externalLinks = JSON.stringify(externalLinks);
                updated++;

                const links = Object.entries(externalLinks).filter(([k, v]) => v).map(([k]) => k);
                console.log(`   ✅ Updated with ${productionCompanies.length} companies, ${links.length} links`);
            }

            await delay(300);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    // Save data
    console.log('\n\n💾 Saving...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already has data): ${skipped}`);
}

main().catch(console.error);
