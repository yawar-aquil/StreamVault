/**
 * Retry script for items that failed production info fetch
 * Uses fuzzy matching and alternative search strategies
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Clean title for better TMDB search
function cleanTitle(title) {
    return title
        .replace(/\s*\(Hindi Dubbed\)\s*/gi, '')
        .replace(/\s*\(Dubbed\)\s*/gi, '')
        .replace(/\s*Hindi\s*$/gi, '')
        .replace(/\s*Season\s*\d+\s*/gi, '')
        .replace(/\s*S\d+\s*/gi, '')
        .replace(/[:\-–]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Try multiple search variations
async function fuzzySearchMovie(title) {
    const variations = [
        title,
        cleanTitle(title),
        title.split(':')[0].trim(), // First part before colon
        title.split('-')[0].trim(), // First part before dash
    ];

    for (const query of [...new Set(variations)]) {
        if (!query || query.length < 2) continue;

        try {
            const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();

            if (data.results?.length > 0) {
                console.log(`      Found with query: "${query}"`);
                return data.results[0].id;
            }
        } catch (error) { }
        await delay(100);
    }
    return null;
}

async function fuzzySearchShow(title) {
    const variations = [
        title,
        cleanTitle(title),
        title.split(':')[0].trim(),
        title.split('-')[0].trim(),
    ];

    for (const query of [...new Set(variations)]) {
        if (!query || query.length < 2) continue;

        try {
            const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();

            if (data.results?.length > 0) {
                console.log(`      Found with query: "${query}"`);
                return data.results[0].id;
            }
        } catch (error) { }
        await delay(100);
    }
    return null;
}

// Fetch production companies
async function fetchProductionCompanies(companies) {
    const enrichedCompanies = [];
    for (const company of companies.slice(0, 5)) {
        try {
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
                country: data.origin_country || company.origin_country || null
            });
            await delay(50);
        } catch {
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

async function fetchExternalIds(tmdbId, type) {
    try {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const res = await fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            imdb: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : null,
            facebook: data.facebook_id ? `https://www.facebook.com/${data.facebook_id}` : null,
            twitter: data.twitter_id ? `https://twitter.com/${data.twitter_id}` : null,
            instagram: data.instagram_id ? `https://www.instagram.com/${data.instagram_id}` : null,
        };
    } catch { return null; }
}

async function fetchDetails(tmdbId, type) {
    try {
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const res = await fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`);
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

async function main() {
    console.log('🔍 Fuzzy Search Retry for Missing Production Info\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    // Find items without production data
    const missing = data.blogPosts.filter(bp => {
        const prods = JSON.parse(bp.productionCompanies || '[]');
        return prods.length === 0;
    });

    console.log(`📊 Found ${missing.length} items missing production info\n`);

    let updated = 0;
    let failed = 0;

    for (const bp of missing) {
        console.log(`\n📺 ${bp.title} (${bp.contentType})`);

        try {
            let tmdbId = null;

            if (bp.contentType === 'movie') {
                tmdbId = await fuzzySearchMovie(bp.title);
            } else {
                tmdbId = await fuzzySearchShow(bp.title);
            }

            if (!tmdbId) {
                console.log(`   ❌ Could not find on TMDB`);
                failed++;
                continue;
            }

            console.log(`   ✅ TMDB ID: ${tmdbId}`);

            const details = await fetchDetails(tmdbId, bp.contentType);
            if (!details) {
                console.log(`   ❌ Could not fetch details`);
                failed++;
                continue;
            }

            let productionCompanies = [];
            if (details.production_companies?.length > 0) {
                productionCompanies = await fetchProductionCompanies(details.production_companies);
            }

            const externalIds = await fetchExternalIds(tmdbId, bp.contentType);
            const externalLinks = {
                homepage: details.homepage || null,
                ...externalIds
            };

            const bpIndex = data.blogPosts.findIndex(b => b.id === bp.id);
            if (bpIndex !== -1) {
                data.blogPosts[bpIndex].productionCompanies = JSON.stringify(productionCompanies);
                data.blogPosts[bpIndex].externalLinks = JSON.stringify(externalLinks);
                updated++;
                console.log(`   ✅ Updated with ${productionCompanies.length} companies`);
            }

            await delay(200);
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
        }
    }

    console.log('\n\n💾 Saving...');
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Still failed: ${failed}`);
}

main().catch(console.error);
