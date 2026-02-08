/**
 * Automated URL Submission to Both Bing (IndexNow) and Google
 * 
 * This script automatically submits URLs to both search engines whenever:
 * - New content is added (shows, movies, episodes)
 * - Content is updated
 * - Content is deleted
 */

import { submitUrlToIndexNow, submitBatchToIndexNow } from './submit-to-indexnow';
import { submitUrlToGoogle, submitBatchToGoogle } from './submit-to-google';
import { storage } from '../server/storage';

const SITE_URL = process.env.SITE_URL || 'https://streamvault.live';

/**
 * Submit a single URL to both search engines
 */
export async function submitUrl(url: string): Promise<void> {
  console.log(`\n🔄 Submitting URL: ${url}`);

  // Get IndexNow API key
  const { getOrCreateApiKey } = await import('./submit-to-indexnow');
  const apiKey = getOrCreateApiKey();

  // Submit to IndexNow (Bing, Yandex, etc.)
  const indexNowSuccess = await submitUrlToIndexNow(url, apiKey);

  // Submit to Google (with 1 second delay)
  await new Promise(resolve => setTimeout(resolve, 1000));
  const googleSuccess = await submitUrlToGoogle(url);

  if (indexNowSuccess && googleSuccess) {
    console.log(`✅ URL submitted to all search engines successfully`);
  } else {
    console.log(`⚠️  URL submission partially completed`);
  }
}

/**
 * Submit show and all its episodes
 */
export async function submitShow(showSlug: string): Promise<void> {
  console.log(`\n📺 Submitting show: ${showSlug}`);

  const show = await storage.getShowBySlug(showSlug);
  if (!show) {
    console.error(`❌ Show not found: ${showSlug}`);
    return;
  }

  const urls: string[] = [];

  // Add show detail page
  urls.push(`${SITE_URL}/show/${show.slug}`);

  // Add all episode watch pages
  const episodes = await storage.getEpisodesByShowId(show.id);
  episodes.forEach(episode => {
    urls.push(`${SITE_URL}/watch/${show.slug}?season=${episode.season}&episode=${episode.episodeNumber}`);
  });

  console.log(`📋 Found ${urls.length} URLs for ${show.title}`);

  // Submit to both search engines
  await submitBatch(urls);
}

/**
 * Submit movie
 */
export async function submitMovie(movieSlug: string): Promise<void> {
  console.log(`\n🎬 Submitting movie: ${movieSlug}`);

  const movie = await storage.getMovieBySlug(movieSlug);
  if (!movie) {
    console.error(`❌ Movie not found: ${movieSlug}`);
    return;
  }

  const urls: string[] = [
    `${SITE_URL}/movie/${movie.slug}`,
    `${SITE_URL}/watch-movie/${movie.slug}`,
  ];

  await submitBatch(urls);
}

/**
 * Submit all content (shows, movies, static pages)
 */
export async function submitAllContent(): Promise<void> {
  console.log(`\n🌐 Submitting all content to search engines...`);

  const urls: string[] = [];

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

  // All shows
  const shows = await storage.getAllShows();
  for (const show of shows) {
    urls.push(`${SITE_URL}/show/${show.slug}`);

    // All episodes for this show
    const episodes = await storage.getEpisodesByShowId(show.id);
    episodes.forEach(episode => {
      urls.push(`${SITE_URL}/watch/${show.slug}?season=${episode.season}&episode=${episode.episodeNumber}`);
    });
  }

  // All movies
  const movies = await storage.getAllMovies();
  movies.forEach(movie => {
    urls.push(`${SITE_URL}/movie/${movie.slug}`);
    urls.push(`${SITE_URL}/watch-movie/${movie.slug}`);
  });

  console.log(`\n📊 Total URLs to submit: ${urls.length}`);

  await submitBatch(urls);
}

/**
 * Submit batch of URLs to both search engines
 */
async function submitBatch(urls: string[]): Promise<void> {
  const { getOrCreateApiKey } = await import('./submit-to-indexnow');
  const apiKey = getOrCreateApiKey();

  console.log(`\n📤 Submitting to IndexNow (Bing)...`);
  await submitBatchToIndexNow(urls, apiKey);

  console.log(`\n📤 Submitting to Google Search Console...`);
  // Google has rate limits, so we use a delay
  await submitBatchToGoogle(urls, 2000); // 2 second delay between requests

  console.log(`\n✅ Batch submission completed!`);
}

/**
 * Delete URL notification (for removed content)
 */
export async function deleteUrl(url: string): Promise<void> {
  console.log(`\n🗑️  Notifying search engines about deleted URL: ${url}`);

  // Google supports deletion notifications
  const { submitUrlToGoogle } = await import('./submit-to-google');
  await submitUrlToGoogle(url, 'URL_DELETED');

  console.log(`✅ Deletion notification sent`);
}

/**
 * Main execution - submit all content
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'all':
      await submitAllContent();
      break;
    case 'show':
      const showSlug = process.argv[3];
      if (!showSlug) {
        console.error('❌ Please provide a show slug: npm run submit-urls show <slug>');
        process.exit(1);
      }
      await submitShow(showSlug);
      break;
    case 'movie':
      const movieSlug = process.argv[3];
      if (!movieSlug) {
        console.error('❌ Please provide a movie slug: npm run submit-urls movie <slug>');
        process.exit(1);
      }
      await submitMovie(movieSlug);
      break;
    case 'url':
      const url = process.argv[3];
      if (!url) {
        console.error('❌ Please provide a URL: npm run submit-urls url <url>');
        process.exit(1);
      }
      await submitUrl(url);
      break;
    default:
      console.log(`
🔍 URL Submission Tool

Usage:
  npm run submit-urls all              # Submit all content
  npm run submit-urls show <slug>      # Submit specific show
  npm run submit-urls movie <slug>     # Submit specific movie
  npm run submit-urls url <url>        # Submit specific URL

Examples:
  npm run submit-urls all
  npm run submit-urls show stranger-things
  npm run submit-urls movie shawshank-redemption
  npm run submit-urls url https://streamvault.com/shows
      `);
      break;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
