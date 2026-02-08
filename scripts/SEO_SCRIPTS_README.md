# 🔍 SEO Automation Scripts

This directory contains automated URL submission scripts for search engine optimization.

---

## 📁 Files Overview

### Core Scripts

1. **`submit-to-indexnow.ts`**
   - Submit URLs to IndexNow protocol (Bing, Yandex, Seznam, Naver)
   - Auto-generates and manages API key
   - Supports batch submissions (up to 10,000 URLs)
   - No rate limits

2. **`submit-to-google.ts`**
   - Submit URLs to Google Search Console via Indexing API
   - Requires Google service account
   - Rate limited (200 requests/day free tier)
   - Supports deletion notifications

3. **`auto-submit-urls.ts`**
   - Unified interface for both IndexNow and Google
   - Submit shows, movies, or all content
   - Easy integration with admin panel
   - Command-line interface

---

## 🚀 Usage

### Command Line

```bash
# Submit all content to both search engines
npm run submit-urls all

# Submit specific show (includes all episodes)
npm run submit-urls show stranger-things

# Submit specific movie
npm run submit-urls movie inception

# Submit single URL
npm run submit-urls url https://yourdomain.com/page

# IndexNow only
npm run submit-indexnow

# Google only
npm run submit-google
```

### Programmatic Usage

```typescript
import { submitShow, submitMovie, submitUrl } from './scripts/auto-submit-urls';

// Submit a show and all its episodes
await submitShow('stranger-things');

// Submit a movie
await submitMovie('inception');

// Submit a single URL
await submitUrl('https://yourdomain.com/shows');
```

---

## 🔧 Configuration

### IndexNow Setup

1. Run the script once to generate API key:
   ```bash
   npm run submit-indexnow
   ```

2. Upload the verification file:
   - File: `dist/public/{key}.txt`
   - Upload to: `https://yourdomain.com/{key}.txt`

3. Done! The key is saved in `indexnow-key.txt`

### Google Search Console Setup

1. Create service account:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project
   - Enable "Web Search Indexing API"
   - Create service account
   - Download JSON key

2. Save the JSON file:
   ```
   google-service-account.json
   ```
   (in project root)

3. Add service account to Search Console:
   - Copy email from JSON file
   - Add as Owner in [Search Console](https://search.google.com/search-console)

4. Test:
   ```bash
   npm run submit-google
   ```

---

## 📊 Functions Reference

### `submit-to-indexnow.ts`

#### `getOrCreateApiKey(): string`
Generates or loads the IndexNow API key.

```typescript
const apiKey = getOrCreateApiKey();
// Returns: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

#### `submitUrlToIndexNow(url: string, apiKey: string): Promise<boolean>`
Submit a single URL to IndexNow.

```typescript
const success = await submitUrlToIndexNow(
  'https://yourdomain.com/shows',
  apiKey
);
```

#### `submitBatchToIndexNow(urls: string[], apiKey: string): Promise<boolean>`
Submit multiple URLs in batch.

```typescript
const urls = [
  'https://yourdomain.com/shows',
  'https://yourdomain.com/movies',
  // ... up to 10,000 URLs
];

const success = await submitBatchToIndexNow(urls, apiKey);
```

---

### `submit-to-google.ts`

#### `submitUrlToGoogle(url: string, type?: 'URL_UPDATED' | 'URL_DELETED'): Promise<boolean>`
Submit a single URL to Google.

```typescript
// Notify about new/updated URL
await submitUrlToGoogle('https://yourdomain.com/shows');

// Notify about deleted URL
await submitUrlToGoogle('https://yourdomain.com/old-page', 'URL_DELETED');
```

#### `submitBatchToGoogle(urls: string[], delayMs?: number): Promise<{success: number, failed: number}>`
Submit multiple URLs with rate limiting.

```typescript
const urls = ['url1', 'url2', 'url3'];
const result = await submitBatchToGoogle(urls, 1000); // 1 second delay

console.log(`Success: ${result.success}, Failed: ${result.failed}`);
```

#### `getUrlStatus(url: string): Promise<any>`
Get indexing status of a URL.

```typescript
const status = await getUrlStatus('https://yourdomain.com/shows');
console.log(status);
```

---

### `auto-submit-urls.ts`

#### `submitUrl(url: string): Promise<void>`
Submit a single URL to both search engines.

```typescript
await submitUrl('https://yourdomain.com/shows');
```

#### `submitShow(showSlug: string): Promise<void>`
Submit a show and all its episodes.

```typescript
await submitShow('stranger-things');
// Submits:
// - /show/stranger-things
// - /watch/stranger-things?season=1&episode=1
// - /watch/stranger-things?season=1&episode=2
// - ... all episodes
```

#### `submitMovie(movieSlug: string): Promise<void>`
Submit a movie and its watch page.

```typescript
await submitMovie('inception');
// Submits:
// - /movie/inception
// - /watch-movie/inception
```

#### `submitAllContent(): Promise<void>`
Submit all content (shows, movies, static pages).

```typescript
await submitAllContent();
// Submits all URLs from your site
```

#### `deleteUrl(url: string): Promise<void>`
Notify Google about deleted content.

```typescript
await deleteUrl('https://yourdomain.com/removed-show');
```

---

## 🔄 Integration Examples

### Admin Panel Integration

```typescript
// In your admin panel API routes
import { submitShow, submitMovie, deleteUrl } from './scripts/auto-submit-urls';

// When adding new show
app.post('/api/admin/shows', async (req, res) => {
  const show = await storage.addShow(req.body);
  
  // Auto-submit to search engines
  await submitShow(show.slug);
  
  res.json(show);
});

// When adding new movie
app.post('/api/admin/movies', async (req, res) => {
  const movie = await storage.addMovie(req.body);
  await submitMovie(movie.slug);
  res.json(movie);
});

// When deleting content
app.delete('/api/admin/shows/:id', async (req, res) => {
  const show = await storage.getShowById(req.params.id);
  const url = `https://yourdomain.com/show/${show.slug}`;
  
  await storage.deleteShow(req.params.id);
  await deleteUrl(url);
  
  res.json({ success: true });
});
```

### Scheduled Submissions

```typescript
import cron from 'node-cron';
import { submitAllContent } from './scripts/auto-submit-urls';

// Run every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled URL submission...');
  await submitAllContent();
});
```

### Webhook Integration

```typescript
// Submit URLs when content is published
app.post('/api/webhooks/content-published', async (req, res) => {
  const { type, slug } = req.body;
  
  if (type === 'show') {
    await submitShow(slug);
  } else if (type === 'movie') {
    await submitMovie(slug);
  }
  
  res.json({ success: true });
});
```

---

## 📈 Best Practices

### 1. Submit Immediately
Submit URLs as soon as content is published, not in batches later.

```typescript
// ✅ Good
async function publishShow(show) {
  await storage.updateShow(show.id, { published: true });
  await submitShow(show.slug); // Immediate submission
}

// ❌ Bad
async function publishShow(show) {
  await storage.updateShow(show.id, { published: true });
  // Waiting to submit later in a batch
}
```

### 2. Handle Errors Gracefully
Don't let SEO submission failures break your app.

```typescript
try {
  await submitShow(show.slug);
} catch (error) {
  console.error('SEO submission failed:', error);
  // Continue with app logic - don't throw
}
```

### 3. Respect Rate Limits
Google has a 200/day limit. Don't exceed it.

```typescript
// Track daily submissions
let dailySubmissions = 0;
const MAX_DAILY = 200;

async function submitWithLimit(url: string) {
  if (dailySubmissions >= MAX_DAILY) {
    console.log('Daily Google limit reached, using IndexNow only');
    const apiKey = getOrCreateApiKey();
    await submitUrlToIndexNow(url, apiKey);
    return;
  }
  
  await submitUrl(url);
  dailySubmissions++;
}
```

### 4. Use Batch Submissions
For initial setup or bulk operations.

```typescript
// ✅ Good - Batch submission
const urls = shows.map(s => `https://yourdomain.com/show/${s.slug}`);
await submitBatchToIndexNow(urls, apiKey);

// ❌ Bad - Individual submissions in loop
for (const show of shows) {
  await submitUrlToIndexNow(`https://yourdomain.com/show/${show.slug}`, apiKey);
}
```

### 5. Log Submissions
Keep track of what was submitted and when.

```typescript
async function submitWithLogging(url: string) {
  console.log(`[${new Date().toISOString()}] Submitting: ${url}`);
  
  try {
    await submitUrl(url);
    console.log(`[${new Date().toISOString()}] ✅ Success: ${url}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed: ${url}`, error);
  }
}
```

---

## 🐛 Troubleshooting

### IndexNow Issues

**"Key file not found"**
- Ensure `{key}.txt` is uploaded to website root
- Verify accessible at `https://yourdomain.com/{key}.txt`

**"Invalid key format"**
- Key must be exactly 32 hexadecimal characters
- Regenerate: Delete `indexnow-key.txt` and run script again

### Google Issues

**"Permission denied (403)"**
- Service account not added to Search Console
- Add as **Owner** (not Editor)
- Wait 2-5 minutes after adding

**"Rate limit exceeded (429)"**
- Hit 200/day limit
- Wait 24 hours
- Use IndexNow for additional submissions

**"Service account key not found"**
- Ensure `google-service-account.json` exists in project root
- Check file path in script

**"API not enabled"**
- Enable "Web Search Indexing API" in Google Cloud Console

---

## 📊 Monitoring

### Check Submission Status

```typescript
import { getUrlStatus } from './scripts/submit-to-google';

const status = await getUrlStatus('https://yourdomain.com/shows');
console.log('Indexing status:', status);
```

### Webmaster Tools

- **Bing**: [Bing Webmaster Tools](https://www.bing.com/webmasters)
- **Google**: [Google Search Console](https://search.google.com/search-console)

---

## 🔐 Security Notes

### Sensitive Files (Never Commit)

- `google-service-account.json` - Contains private keys
- `indexnow-key.txt` - Your API key
- Already added to `.gitignore`

### Public Files (Must Upload)

- `{key}.txt` - IndexNow verification file
- Upload to website root for verification

---

## 📚 Additional Resources

- [IndexNow Documentation](https://www.indexnow.org/documentation)
- [Google Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart)
- [SEO_AUTOMATION_SETUP.md](../SEO_AUTOMATION_SETUP.md) - Complete setup guide
- [QUICK_SEO_GUIDE.md](../QUICK_SEO_GUIDE.md) - Quick reference

---

**Need help?** Check the main documentation files in the project root.
