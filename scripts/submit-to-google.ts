/**
 * Google Search Console API - Automated URL Submission
 * 
 * This script uses the Google Indexing API to submit URLs to Google Search Console.
 * 
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable "Web Search Indexing API"
 * 4. Create a Service Account
 * 5. Download the JSON key file
 * 6. Add the service account email to Google Search Console as an owner
 * 
 * Documentation: https://developers.google.com/search/apis/indexing-api/v3/quickstart
 */

import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Configuration
const SITE_URL = 'https://streamvault.live'; // Your StreamVault domain
const SERVICE_ACCOUNT_KEY_FILE = join(process.cwd(), 'google-service-account.json');
const SUBMITTED_URLS_FILE = join(process.cwd(), 'scripts', 'google-submitted-urls.json');

// Scopes required for the Indexing API
const SCOPES = ['https://www.googleapis.com/auth/indexing'];

/**
 * Load submitted URLs tracking data
 */
function loadSubmittedUrls(): { submittedUrls: string[], lastSubmission: string | null, totalSubmitted: number } {
  try {
    if (existsSync(SUBMITTED_URLS_FILE)) {
      const data = readFileSync(SUBMITTED_URLS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('⚠️  Could not load submitted URLs tracking file, starting fresh');
  }
  return { submittedUrls: [], lastSubmission: null, totalSubmitted: 0 };
}

/**
 * Save submitted URLs tracking data
 */
function saveSubmittedUrls(data: { submittedUrls: string[], lastSubmission: string | null, totalSubmitted: number }) {
  try {
    writeFileSync(SUBMITTED_URLS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('⚠️  Could not save submitted URLs tracking file:', error);
  }
}

/**
 * Initialize Google Auth
 */
function getAuthClient() {
  try {
    const keyFile = readFileSync(SERVICE_ACCOUNT_KEY_FILE, 'utf-8');
    const keys = JSON.parse(keyFile);

    const auth = new google.auth.GoogleAuth({
      credentials: keys,
      scopes: SCOPES,
    });

    return auth;
  } catch (error) {
    console.error('❌ Error loading service account key file:');
    console.error('   Make sure google-service-account.json exists in the project root');
    console.error('   Download it from: https://console.cloud.google.com/');
    throw error;
  }
}

/**
 * Submit URL to Google Indexing API
 * 
 * @param url - The URL to submit
 * @param type - 'URL_UPDATED' or 'URL_DELETED'
 */
async function submitUrlToGoogle(
  url: string,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<boolean> {
  try {
    const auth = getAuthClient();
    const indexing = google.indexing({ version: 'v3', auth });

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: type,
      },
    });

    if (response.status === 200) {
      console.log(`✅ Successfully submitted to Google: ${url}`);
      return true;
    } else {
      console.error(`❌ Failed to submit ${url}: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error: any) {
    if (error.code === 403) {
      console.error(`❌ Permission denied for ${url}`);
      console.error('   Make sure the service account is added as an owner in Google Search Console');
    } else if (error.code === 429) {
      console.error(`❌ Rate limit exceeded. Please wait and try again later.`);
    } else {
      console.error(`❌ Error submitting ${url}:`, error.message);
    }
    return false;
  }
}

/**
 * Get URL status from Google Indexing API
 */
async function getUrlStatus(url: string): Promise<any> {
  try {
    const auth = getAuthClient();
    const indexing = google.indexing({ version: 'v3', auth });

    const response = await indexing.urlNotifications.getMetadata({
      url: url,
    });

    return response.data;
  } catch (error: any) {
    console.error(`❌ Error getting status for ${url}:`, error.message);
    return null;
  }
}

/**
 * Submit multiple URLs in batch with rate limiting
 * Google allows 200 requests per day for free tier
 */
async function submitBatchToGoogle(
  urls: string[],
  delayMs: number = 1000
): Promise<{ success: number; failed: number }> {
  console.log(`📦 Submitting ${urls.length} URLs to Google...`);
  console.log(`⏱️  Delay between requests: ${delayMs}ms\n`);

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] Submitting: ${url}`);

    const success = await submitUrlToGoogle(url);

    if (success) {
      successCount++;
    } else {
      failedCount++;
    }

    // Wait before next request to avoid rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   📝 Total: ${urls.length}`);

  return { success: successCount, failed: failedCount };
}

/**
 * Generate all URLs from your StreamVault site
 */
async function generateAllUrls(): Promise<string[]> {
  const urls: string[] = [];

  // Import storage dynamically
  const { storage } = await import('../server/storage.js');

  // URLs to skip
  const SKIP_PATTERNS = [
    '/watch/',           // Skip all watch pages
    '/watch-movie/',     // Skip watch-movie pages
    'tu-meri-main-tera', // Skip specific content
  ];

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
    // Skip specific content
    if (SKIP_PATTERNS.some(pattern => show.slug.includes(pattern.replace('/', '')))) {
      console.log(`   ⏭️  Skipping: ${show.slug}`);
      continue;
    }
    // Add show detail page only (skip watch pages)
    urls.push(`${SITE_URL}/show/${show.slug}`);
  }

  console.log('🎬 Fetching movies from database...');
  // Get all movies
  const movies = await storage.getAllMovies();
  console.log(`   Found ${movies.length} movies`);

  movies.forEach(movie => {
    // Skip specific content
    if (SKIP_PATTERNS.some(pattern => movie.slug.includes(pattern.replace('/', '')))) {
      console.log(`   ⏭️  Skipping: ${movie.slug}`);
      return;
    }
    // Add movie detail page only (skip watch-movie pages)
    urls.push(`${SITE_URL}/movie/${movie.slug}`);
  });

  return urls;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Google Search Console URL Submission Tool\n');

  try {
    // Load tracking data
    const tracking = loadSubmittedUrls();
    console.log(`📊 Previously submitted: ${tracking.totalSubmitted} URLs`);
    if (tracking.lastSubmission) {
      console.log(`📅 Last submission: ${new Date(tracking.lastSubmission).toLocaleString()}\n`);
    }

    // Get all URLs
    const allUrls = await generateAllUrls();
    console.log(`\n📋 Total URLs found: ${allUrls.length}`);

    // RESUBMIT MODE: Submit all URLs (ignore already submitted)
    const RESUBMIT_ALL = true;

    let pendingUrls: string[];
    if (RESUBMIT_ALL) {
      pendingUrls = allUrls;
      console.log(`🔄 RESUBMIT MODE: Submitting all ${pendingUrls.length} URLs\n`);
    } else {
      // Filter out already submitted URLs
      pendingUrls = allUrls.filter(url => !tracking.submittedUrls.includes(url));
      console.log(`✅ Already submitted: ${allUrls.length - pendingUrls.length} URLs`);
      console.log(`⏳ Pending submission: ${pendingUrls.length} URLs\n`);
    }

    if (pendingUrls.length === 0) {
      console.log('🎉 All URLs have already been submitted to Google!');
      console.log('💡 Check status in Google Search Console: https://search.google.com/search-console');
      return;
    }

    // Google free tier allows 200 requests per day
    const urlsToSubmit = pendingUrls.slice(0, 200);
    console.log(`📤 Submitting next ${urlsToSubmit.length} URLs (Google free tier limit: 200/day)\n`);

    // Submit to Google
    const result = await submitBatchToGoogle(urlsToSubmit, 1000); // 1 second delay

    // Update tracking data
    const successfulUrls = urlsToSubmit.slice(0, result.success);
    tracking.submittedUrls.push(...successfulUrls);
    tracking.totalSubmitted += result.success;
    tracking.lastSubmission = new Date().toISOString();
    saveSubmittedUrls(tracking);

    console.log(`\n📊 Progress: ${tracking.totalSubmitted}/${allUrls.length} URLs submitted (${Math.round(tracking.totalSubmitted / allUrls.length * 100)}%)`);
    console.log(`⏳ Remaining: ${allUrls.length - tracking.totalSubmitted} URLs`);

    if (tracking.totalSubmitted < allUrls.length) {
      const daysRemaining = Math.ceil((allUrls.length - tracking.totalSubmitted) / 200);
      console.log(`📅 Estimated days to complete: ${daysRemaining} days (at 200 URLs/day)`);
      console.log(`\n💡 Run this command again tomorrow to submit the next batch!`);
    } else {
      console.log(`\n🎉 All URLs have been submitted to Google!`);
    }

    console.log('\n📝 Note: Google may take a few days to crawl your URLs');
    console.log('💡 Check status in Google Search Console: https://search.google.com/search-console');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

export { submitUrlToGoogle, submitBatchToGoogle, getUrlStatus };

// Run main function
main().catch(console.error);
