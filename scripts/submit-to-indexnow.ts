/**
 * IndexNow API - Automated URL Submission to Bing and other search engines
 * 
 * IndexNow is supported by:
 * - Microsoft Bing
 * - Yandex
 * - Seznam.cz
 * - Naver
 * 
 * Documentation: https://www.indexnow.org/documentation
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

// Configuration
const SITE_URL = 'https://streamvault.live'; // Your StreamVault domain
const API_KEY_FILE = join(process.cwd(), 'indexnow-key.txt');

// IndexNow endpoints (you only need to submit to one, they share the data)
const INDEXNOW_ENDPOINTS = {
  bing: 'https://www.bing.com/indexnow',
  yandex: 'https://yandex.com/indexnow',
  seznam: 'https://search.seznam.cz/indexnow',
  naver: 'https://searchadvisor.naver.com/indexnow',
};

/**
 * Generate or load IndexNow API key
 */
function getOrCreateApiKey(): string {
  try {
    // Try to read existing key
    const key = readFileSync(API_KEY_FILE, 'utf-8').trim();
    if (key.length === 32) {
      console.log('✅ Using existing IndexNow API key');
      return key;
    }
  } catch (error) {
    // File doesn't exist, create new key
  }

  // Generate new 32-character hexadecimal key
  const newKey = crypto.randomBytes(16).toString('hex');
  
  // Save to file
  writeFileSync(API_KEY_FILE, newKey);
  
  // Also create the key file in public directory for verification
  const publicKeyPath = join(process.cwd(), 'dist', 'public', `${newKey}.txt`);
  writeFileSync(publicKeyPath, newKey);
  
  console.log('✅ Generated new IndexNow API key:', newKey);
  console.log(`📝 Key file created at: ${publicKeyPath}`);
  console.log(`⚠️  Upload ${newKey}.txt to your website root for verification`);
  
  return newKey;
}

/**
 * Submit single URL to IndexNow
 */
async function submitUrlToIndexNow(url: string, apiKey: string): Promise<boolean> {
  const payload = {
    host: new URL(SITE_URL).hostname,
    key: apiKey,
    keyLocation: `${SITE_URL}/${apiKey}.txt`,
    urlList: [url]
  };

  try {
    const response = await fetch(INDEXNOW_ENDPOINTS.bing, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 200) {
      console.log(`✅ Successfully submitted: ${url}`);
      return true;
    } else if (response.status === 202) {
      console.log(`✅ URL received (already in queue): ${url}`);
      return true;
    } else {
      console.error(`❌ Failed to submit ${url}: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error submitting ${url}:`, error);
    return false;
  }
}

/**
 * Submit multiple URLs in batch (max 10,000 URLs per request)
 */
async function submitBatchToIndexNow(urls: string[], apiKey: string): Promise<boolean> {
  // IndexNow supports up to 10,000 URLs per request
  const batchSize = 10000;
  const batches = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }

  console.log(`📦 Submitting ${urls.length} URLs in ${batches.length} batch(es)...`);

  let successCount = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const payload = {
      host: new URL(SITE_URL).hostname,
      key: apiKey,
      keyLocation: `${SITE_URL}/${apiKey}.txt`,
      urlList: batch
    };

    try {
      const response = await fetch(INDEXNOW_ENDPOINTS.bing, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 200 || response.status === 202) {
        console.log(`✅ Batch ${i + 1}/${batches.length} submitted successfully (${batch.length} URLs)`);
        successCount += batch.length;
      } else {
        console.error(`❌ Batch ${i + 1} failed: ${response.status} ${response.statusText}`);
      }

      // Wait 1 second between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Error submitting batch ${i + 1}:`, error);
    }
  }

  console.log(`\n📊 Summary: ${successCount}/${urls.length} URLs submitted successfully`);
  return successCount === urls.length;
}

/**
 * Generate all URLs from your StreamVault site
 */
async function generateAllUrls(): Promise<string[]> {
  const urls: string[] = [];

  // Import storage dynamically
  const { storage } = await import('../server/storage.js');

  // Static pages
  const staticPages = [
    '',
    '/shows',
    '/movies',
    '/browse-shows',
    '/browse-movies',
    '/search',
    '/watchlist',
    '/about',
    '/contact',
    '/help',
    '/faq',
    '/privacy',
    '/terms',
    '/dmca',
  ];

  staticPages.forEach(page => {
    urls.push(`${SITE_URL}${page}`);
  });

  console.log('📺 Fetching shows from database...');
  // Get all shows
  const shows = await storage.getAllShows();
  console.log(`   Found ${shows.length} shows`);
  
  for (const show of shows) {
    // Add show detail page
    urls.push(`${SITE_URL}/show/${show.slug}`);
    
    // Get all episodes for this show
    const episodes = await storage.getEpisodesByShowId(show.id);
    episodes.forEach(episode => {
      urls.push(`${SITE_URL}/watch/${show.slug}?season=${episode.season}&episode=${episode.episodeNumber}`);
    });
  }

  console.log('🎬 Fetching movies from database...');
  // Get all movies
  const movies = await storage.getAllMovies();
  console.log(`   Found ${movies.length} movies`);
  
  movies.forEach(movie => {
    urls.push(`${SITE_URL}/movie/${movie.slug}`);
    urls.push(`${SITE_URL}/watch-movie/${movie.slug}`);
  });

  return urls;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 IndexNow URL Submission Tool\n');

  // Get or create API key
  const apiKey = getOrCreateApiKey();

  // Get URLs to submit
  const urls = await generateAllUrls();
  console.log(`\n📋 Total URLs to submit: ${urls.length}\n`);

  // Submit to IndexNow
  const success = await submitBatchToIndexNow(urls, apiKey);

  if (success) {
    console.log('\n✅ All URLs submitted successfully!');
    console.log('📝 Note: It may take a few days for search engines to crawl your URLs');
  } else {
    console.log('\n⚠️  Some URLs failed to submit. Check the logs above.');
  }
}

export { submitUrlToIndexNow, submitBatchToIndexNow, getOrCreateApiKey };

// Run main function
main().catch(console.error);
