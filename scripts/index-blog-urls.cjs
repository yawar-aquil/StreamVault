#!/usr/bin/env node

/**
 * 📡 StreamVault Blog URL Batch Indexer
 * =======================================
 * Submits all published blog post URLs to:
 *   - Bing (via IndexNow - instant, free, no auth needed)
 *   - Google (via Indexing API - requires service account JSON)
 *
 * Usage:
 *   node scripts/index-blog-urls.cjs             → Submit to both Google + Bing
 *   node scripts/index-blog-urls.cjs --bing       → Bing only
 *   node scripts/index-blog-urls.cjs --google     → Google only
 *   node scripts/index-blog-urls.cjs --reset      → Clear tracking and resubmit all
 *   node scripts/index-blog-urls.cjs --new        → Only submit URLs not previously submitted
 *   node scripts/index-blog-urls.cjs --list       → List all blog URLs without submitting
 *
 * Google Setup (one-time):
 *   1. Go to https://console.cloud.google.com/
 *   2. Enable "Web Search Indexing API"
 *   3. Create a Service Account → download JSON key
 *   4. Add service account email to Google Search Console as "Owner"
 *   5. Save the key file as: google-service-account.json (project root)
 *
 * Bing/IndexNow Setup (one-time):
 *   1. Run this script once — it auto-generates an API key
 *   2. A key file (e.g. abc123.txt) will appear in the server's public folder
 *   3. Bing will verify it at https://streamvault.in/<key>.txt
 *   4. That's it! No manual steps required.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// ─── Configuration ────────────────────────────────────────────────────────────
const SITE_URL = 'https://streamvault.live';
const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');
const TRACKING_FILE = path.join(__dirname, 'blog-indexing-log.json');
const GOOGLE_KEY_FILE = path.join(__dirname, '..', 'google-service-account.json');
const INDEXNOW_KEY_FILE = path.join(__dirname, '..', 'indexnow-key.txt');

// Google Indexing API daily limit (free tier)
const GOOGLE_DAILY_LIMIT = 200;
// Delay between Google API calls (ms) to stay under rate limits
const GOOGLE_DELAY_MS = 1200;

// ─── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const BING_ONLY    = args.includes('--bing');
const GOOGLE_ONLY  = args.includes('--google');
const RESET        = args.includes('--reset');
const NEW_ONLY     = args.includes('--new');
const LIST_ONLY    = args.includes('--list');
const DO_BING      = !GOOGLE_ONLY;
const DO_GOOGLE    = !BING_ONLY;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function httpsPost(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadTracking() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
    }
  } catch {}
  return {
    bingSubmitted: [],
    googleSubmitted: [],
    lastRun: null,
    stats: { bingTotal: 0, googleTotal: 0 },
  };
}

function saveTracking(data) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
}

function getOrCreateIndexNowKey() {
  try {
    const existing = fs.readFileSync(INDEXNOW_KEY_FILE, 'utf-8').trim();
    if (existing.length >= 32) {
      console.log(`✅ IndexNow key loaded: ${existing}`);
      return existing;
    }
  } catch {}

  // Generate a new key
  const crypto = require('crypto');
  const key = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  fs.writeFileSync(INDEXNOW_KEY_FILE, key);

  // Place key file in public root for Bing verification
  const publicDir = path.join(__dirname, '..', 'client', 'public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, `${key}.txt`), key);
    console.log(`\n📄 Created key file: client/public/${key}.txt`);
  }

  console.log(`\n🔑 New IndexNow key generated: ${key}`);
  console.log(`⚠️  Bing will verify it at: ${SITE_URL}/${key}.txt`);
  console.log(`   Make sure to deploy so this file is publicly accessible!\n`);
  return key;
}

// ─── Collect Blog URLs ────────────────────────────────────────────────────────

function getBlogUrls() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const posts = data.blogPosts || [];

  const publishedPosts = posts.filter(p => p.published !== false);
  const urls = publishedPosts.map(p => `${SITE_URL}/blog/${p.contentType}/${p.slug}`);

  return { urls, total: posts.length, published: publishedPosts.length };
}

// ─── Bing IndexNow ───────────────────────────────────────────────────────────

async function submitToBing(urls, apiKey) {
  console.log(`\n🔵 Submitting ${urls.length} URLs to Bing via IndexNow...`);

  const BATCH_SIZE = 500; // IndexNow supports up to 10,000 but 500 is safe
  let successTotal = 0;
  let failTotal = 0;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);

    try {
      const result = await httpsPost('www.bing.com', '/indexnow', {
        host: new URL(SITE_URL).hostname,
        key: apiKey,
        keyLocation: `${SITE_URL}/${apiKey}.txt`,
        urlList: batch,
      });

      if (result.status === 200 || result.status === 202) {
        console.log(`  ✅ Batch ${batchNum}/${totalBatches}: ${batch.length} URLs accepted (HTTP ${result.status})`);
        successTotal += batch.length;
      } else if (result.status === 422) {
        console.log(`  ⚠️  Batch ${batchNum}/${totalBatches}: Unprocessable (key not verified yet?)`);
        console.log(`     Response: ${result.body.slice(0, 200)}`);
        failTotal += batch.length;
      } else {
        console.log(`  ❌ Batch ${batchNum}/${totalBatches}: HTTP ${result.status}`);
        console.log(`     Response: ${result.body.slice(0, 200)}`);
        failTotal += batch.length;
      }
    } catch (err) {
      console.error(`  ❌ Batch ${batchNum}/${totalBatches} error:`, err.message);
      failTotal += batch.length;
    }

    if (i + BATCH_SIZE < urls.length) {
      await delay(1000);
    }
  }

  console.log(`\n  📊 Bing: ✅ ${successTotal} submitted, ❌ ${failTotal} failed`);
  return { count: successTotal, submittedUrls: successTotal > 0 ? urls : [] };
}

// ─── Google Indexing API ──────────────────────────────────────────────────────

async function getGoogleAccessToken() {
  if (!fs.existsSync(GOOGLE_KEY_FILE)) {
    throw new Error(
      `google-service-account.json not found.\n` +
      `  1. Go to https://console.cloud.google.com/\n` +
      `  2. Enable "Web Search Indexing API"\n` +
      `  3. Create a Service Account and download the JSON key\n` +
      `  4. Add the service account email as Owner in Google Search Console\n` +
      `  5. Save as: google-service-account.json in the project root`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(GOOGLE_KEY_FILE, 'utf-8'));

  // Build JWT for Google OAuth2
  const { createSign } = require('crypto');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  // Exchange JWT for access token
  return new Promise((resolve, reject) => {
    const body = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) {
          resolve(parsed.access_token);
        } else {
          reject(new Error(`Failed to get access token: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function submitUrlToGoogle(url, accessToken) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ url, type: 'URL_UPDATED' });
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (err) => resolve({ status: 0, body: err.message }));
    req.write(body);
    req.end();
  });
}

async function submitToGoogle(urls) {
  console.log(`\n🔴 Submitting ${urls.length} URLs to Google Indexing API...`);
  console.log(`   (Daily limit: ${GOOGLE_DAILY_LIMIT} URLs, delay: ${GOOGLE_DELAY_MS}ms between each)\n`);

  let accessToken;
  try {
    accessToken = await getGoogleAccessToken();
    console.log('  ✅ Google auth successful\n');
  } catch (err) {
    console.error('  ❌ Google auth failed:', err.message);
    return 0;
  }

  const toSubmit = urls.slice(0, GOOGLE_DAILY_LIMIT);
  if (urls.length > GOOGLE_DAILY_LIMIT) {
    console.log(`  ⚠️  Limiting to ${GOOGLE_DAILY_LIMIT} URLs (daily quota). Run again tomorrow for the rest.\n`);
  }

  let successCount = 0;
  let failCount = 0;
  let rateLimited = false;

  for (let i = 0; i < toSubmit.length; i++) {
    const url = toSubmit[i];

    if (rateLimited) {
      console.log(`  ⏸️  Rate limited — stopping. Run again tomorrow.`);
      break;
    }

    process.stdout.write(`  [${i + 1}/${toSubmit.length}] ${url} → `);

    const result = await submitUrlToGoogle(url, accessToken);

    if (result.status === 200) {
      console.log('✅ Indexed');
      successCount++;
    } else if (result.status === 429) {
      console.log('❌ Rate limited!');
      rateLimited = true;
      failCount++;
    } else if (result.status === 403) {
      console.log('❌ Permission denied (check Search Console ownership)');
      failCount++;
    } else {
      const msg = (() => { try { return JSON.parse(result.body)?.error?.message || result.body; } catch { return result.body; } })();
      console.log(`❌ HTTP ${result.status}: ${msg.slice(0, 80)}`);
      failCount++;
    }

    if (i < toSubmit.length - 1 && !rateLimited) {
      await delay(GOOGLE_DELAY_MS);
    }
  }

  console.log(`\n  📊 Google: ✅ ${successCount} indexed, ❌ ${failCount} failed`);
  if (urls.length > GOOGLE_DAILY_LIMIT) {
    console.log(`  ℹ️  ${urls.length - GOOGLE_DAILY_LIMIT} URLs queued for tomorrow's run`);
  }

  return successCount;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('📡 StreamVault Blog URL Batch Indexer');
  console.log('══════════════════════════════════════');
  console.log(`   Site: ${SITE_URL}`);
  console.log(`   Mode: ${LIST_ONLY ? 'LIST ONLY' : [DO_BING && 'Bing', DO_GOOGLE && 'Google'].filter(Boolean).join(' + ')}`);
  if (RESET) console.log('   ⚠️  RESET mode: clearing previous tracking data');
  if (NEW_ONLY) console.log('   ℹ️  NEW mode: only submitting URLs not previously indexed');
  console.log('');

  // Load data
  let blogData;
  try {
    blogData = getBlogUrls();
  } catch (err) {
    console.error('❌ Could not read data file:', err.message);
    process.exit(1);
  }

  const { urls, total, published } = blogData;
  console.log(`📝 Blog posts: ${total} total, ${published} published`);
  console.log(`🔗 URLs to process: ${urls.length}`);

  if (LIST_ONLY) {
    console.log('\n📋 All blog URLs:\n');
    urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
    console.log(`\nTotal: ${urls.length} URLs`);
    return;
  }

  if (urls.length === 0) {
    console.log('\n⚠️  No published blog posts found.');
    return;
  }

  // Load or reset tracking
  let tracking = RESET ? {
    bingSubmitted: [],
    googleSubmitted: [],
    lastRun: null,
    stats: { bingTotal: 0, googleTotal: 0 },
  } : loadTracking();

  // Filter to new-only if requested
  let bingUrls   = NEW_ONLY ? urls.filter(u => !tracking.bingSubmitted.includes(u))   : urls;
  let googleUrls = NEW_ONLY ? urls.filter(u => !tracking.googleSubmitted.includes(u)) : urls;

  if (NEW_ONLY) {
    console.log(`\n  Bing:   ${bingUrls.length} new URLs (${urls.length - bingUrls.length} already submitted)`);
    console.log(`  Google: ${googleUrls.length} new URLs (${urls.length - googleUrls.length} already submitted)`);
  }

  // ── Bing ──────────────────────────────────────────────────────
  if (DO_BING && bingUrls.length > 0) {
    const apiKey = getOrCreateIndexNowKey();
    const bingResult = await submitToBing(bingUrls, apiKey);

    // Only mark URLs as submitted if they were actually accepted
    if (bingResult.count > 0) {
      tracking.bingSubmitted = [...new Set([...tracking.bingSubmitted, ...bingResult.submittedUrls])];
      tracking.stats.bingTotal = tracking.bingSubmitted.length;
    }
  } else if (DO_BING) {
    console.log('\n🔵 Bing: No new URLs to submit');
  }

  // ── Google ────────────────────────────────────────────────────
  if (DO_GOOGLE && googleUrls.length > 0) {
    const googleSuccess = await submitToGoogle(googleUrls);

    // Mark only the first GOOGLE_DAILY_LIMIT as submitted
    const submitted = googleUrls.slice(0, googleSuccess);
    tracking.googleSubmitted = [...new Set([...tracking.googleSubmitted, ...submitted])];
    tracking.stats.googleTotal = tracking.googleSubmitted.length;
  } else if (DO_GOOGLE) {
    console.log('\n🔴 Google: No new URLs to submit');
  }

  // Save tracking
  tracking.lastRun = new Date().toISOString();
  saveTracking(tracking);

  // Final summary
  console.log('\n');
  console.log('══════════════════════════════════════');
  console.log('📊 Final Summary');
  console.log('══════════════════════════════════════');
  console.log(`  🔵 Bing total indexed:   ${tracking.stats.bingTotal} / ${urls.length}`);
  console.log(`  🔴 Google total indexed: ${tracking.stats.googleTotal} / ${urls.length}`);
  console.log(`  📅 Last run: ${new Date().toLocaleString()}`);
  console.log(`  📄 Tracking log: scripts/blog-indexing-log.json`);
  console.log('');
  console.log('💡 Tips:');
  console.log('  • Run with --new to only submit new posts next time');
  console.log('  • Google has a 200 URL/day limit — run daily for large batches');
  console.log('  • Check Google Search Console: https://search.google.com/search-console');
  console.log('  • Check Bing Webmaster Tools: https://www.bing.com/webmasters');
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
