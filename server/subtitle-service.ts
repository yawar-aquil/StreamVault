/**
 * Subtitle Service - Multi-provider subtitle search with fallbacks
 * Primary: subs.wyzie.ru (OpenSubtitles + SubDl)
 * Fallback 1: Sub.wyzie.ru/v2  
 * Fallback 2: opensubtitles via subdl.com
 * All free, no API key required
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// API URLs (in order of preference)
const SUBTITLE_APIS = [
    { url: 'https://sub.wyzie.io', type: 'wyzie' },           // Primary free
    { url: 'https://api.subdl.com/api/v1/subtitles', type: 'subdl' }, // SubDL API
    { url: 'https://api.opensubtitles.com/api/v1/subtitles', type: 'opensubtitles' } // OpenSubtitles standard REST API
];

// Subtitle cache directory
const SUBTITLE_CACHE_DIR = path.join(process.cwd(), 'data', 'subtitles');

// Ensure cache directory exists
if (!fs.existsSync(SUBTITLE_CACHE_DIR)) {
    fs.mkdirSync(SUBTITLE_CACHE_DIR, { recursive: true });
}

export interface SubtitleResult {
    id: string;
    url: string;
    downloadUrl: string;
    lang: string;
    language: string;
    format: string;
    hearingImpaired: boolean;
    provider: string;
    releaseName?: string;
    downloads?: number;
    rating?: number;
}

export interface SubtitleSearchResponse {
    subtitles: SubtitleResult[];
    error?: string;
}

/**
 * Try fetching with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 8000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Search for subtitles using IMDB ID with fallback providers
 */
export async function searchSubtitles(
    imdbId: string,
    season?: number,
    episode?: number,
    language: string = 'en'
): Promise<SubtitleSearchResponse> {
    console.log(`🔍 Subtitle search: imdbId=${imdbId}, season=${season}, episode=${episode}, lang=${language}`);

    // Fetch from all providers in parallel and merge results
    const providerPromises = SUBTITLE_APIS.map(async (provider) => {
        const baseUrl = provider.url;

        // Skip providers that strictly require API keys if we don't have them
        if (provider.type === 'opensubtitles' && !process.env.OPENSUBTITLES_API_KEY) {
            return [];
        }

        try {
            let url: string;
            const headers: any = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            };

            // Different URL formats for different providers
            if (provider.type === 'subdl') {
                url = `${baseUrl}?imdb_id=${imdbId}&languages=${language}`;
                if (season !== undefined && episode !== undefined) {
                    url += `&season_number=${season}&episode_number=${episode}`;
                }
                if (process.env.SUBDL_API_KEY) {
                    url += `&type=${(season !== undefined) ? 'tv' : 'movie'}`;
                    url += `&api_key=${process.env.SUBDL_API_KEY}`;
                } else {
                    url = `https://api.subdl.com/subtitle/search?imdb_id=${imdbId}&languages=${language}`;
                    if (season !== undefined && episode !== undefined) {
                        url += `&season_number=${season}&episode_number=${episode}`;
                    }
                }
            } else if (provider.type === 'opensubtitles') {
                const osImdbId = imdbId.replace('tt', '');
                url = `${baseUrl}?imdb_id=${osImdbId}&languages=${language}`;
                if (season !== undefined && episode !== undefined) {
                    url += `&season_number=${season}&episode_number=${episode}`;
                }
                headers['Api-Key'] = process.env.OPENSUBTITLES_API_KEY;
                headers['User-Agent'] = 'StreamVault v1.0';
            } else {
                // Wyzie format
                if (!process.env.WYZIE_API_KEY) {
                    url = 'invalid'; // Skip if no key
                } else {
                    url = `${baseUrl}/search?key=${process.env.WYZIE_API_KEY}&id=${imdbId}&language=${language}`;
                    if (season !== undefined && episode !== undefined) {
                        url += `&season=${season}&episode=${episode}`;
                    }
                }
            }

            console.log(`🔍 Querying provider ${provider.type}: ${url.split('api_key')[0]}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, { signal: controller.signal, headers });
            clearTimeout(timeoutId);

            if (url === 'invalid' || !response.ok) {
                if (url !== 'invalid') console.log(`⚠️ Provider ${provider.type} returned ${response.status}, skipping...`);
                return [];
            }

            const data = await response.json();
            let subtitles: SubtitleResult[] = [];

            if (provider.type === 'opensubtitles' && data.data && Array.isArray(data.data)) {
                subtitles = data.data.map((item: any, index: number) => {
                    const attrs = item.attributes;
                    const file = attrs?.files?.[0];
                    return {
                        id: item.id || `os_${index}`,
                        url: file ? `https://api.opensubtitles.com/api/v1/download/${file.file_id}` : (attrs.url || ''),
                        downloadUrl: file ? file.file_id : attrs.url,
                        lang: attrs.language || language,
                        language: attrs.language || 'English',
                        format: 'srt',
                        hearingImpaired: attrs.hearing_impaired || false,
                        provider: 'opensubtitles',
                        releaseName: attrs.release || file?.file_name || undefined,
                        downloads: attrs.download_count || 0,
                        rating: attrs.ratings || 0
                    };
                });
            } else if (Array.isArray(data)) {
                // Wyzie format - use direct url from response (more reliable than /download endpoint)
                subtitles = data.map((sub: any, index: number) => ({
                    id: sub.id || `wyzie_${index}`,
                    url: sub.url || '',  // Direct .srt URL from wyzie search response
                    downloadUrl: sub.url || '',
                    lang: sub.language || language,
                    language: sub.display || 'English',
                    format: sub.format || 'srt',
                    hearingImpaired: sub.isHearingImpaired || false,
                    provider: 'wyzie',
                    releaseName: sub.media || sub.release || undefined,
                    downloads: sub.downloadCount || 0,
                    rating: 0
                }));
            } else if ((data.subtitles && Array.isArray(data.subtitles)) || (data.results && Array.isArray(data.results))) {
                // SubDL format
                const items = data.subtitles || data.results;
                subtitles = items.map((sub: any, index: number) => ({
                    id: sub.id || sub.subtitle_id || sub.sd_id || `subdl_${index}`,
                    url: sub.url ? `https://dl.subdl.com${sub.url}` : sub.download_url || '',
                    downloadUrl: sub.url ? `https://dl.subdl.com${sub.url}` : sub.download_url || '',
                    lang: sub.lang || sub.language || language,
                    language: sub.language_name || sub.language || 'English',
                    format: sub.format || (sub.url && sub.url.endsWith('zip') ? 'zip' : 'srt'),
                    hearingImpaired: sub.hi || sub.hearing_impaired || false,
                    provider: 'subdl',
                    releaseName: sub.release_name || sub.name || undefined,
                    downloads: sub.download_count || sub.downloads || 0,
                    rating: sub.rating || 0
                }));
            }

            // Filter out empty/invalid URLs
            subtitles = subtitles.filter(s => s.url && s.url.startsWith('http'));
            console.log(`✅ ${provider.type}: found ${subtitles.length} subtitles`);
            return subtitles;

        } catch (error: any) {
            console.log(`⚠️ Provider ${provider.type} failed: ${error.message}`);
            return [];
        }
    });

    // Wait for all providers (don't let one failure kill the rest)
    const results = await Promise.allSettled(providerPromises);

    const allSubtitles: SubtitleResult[] = [];
    const seenUrls = new Set<string>();

    for (const result of results) {
        if (result.status === 'fulfilled') {
            for (const sub of result.value) {
                // De-duplicate by URL
                if (!seenUrls.has(sub.url)) {
                    seenUrls.add(sub.url);
                    allSubtitles.push(sub);
                }
            }
        }
    }

    if (allSubtitles.length === 0) {
        console.error('❌ All subtitle providers returned no results');
        return { subtitles: [], error: 'No subtitles found from any provider' };
    }

    console.log(`✅ Total subtitles from all providers: ${allSubtitles.length}`);
    return { subtitles: allSubtitles };
}

/**
 * Download and cache a subtitle file
 * @param subtitleUrl - URL to the subtitle file
 * @returns Local file path to the cached subtitle
 */
export async function downloadSubtitle(subtitleUrl: string): Promise<string | null> {
    try {
        // Intercept OpenSubtitles API download links
        if (subtitleUrl.includes('api.opensubtitles.com/api/v1/download/')) {
            const match = subtitleUrl.match(/download\/(\d+)$/);
            const fileId = match ? parseInt(match[1]) : null;
            
            if (fileId && process.env.OPENSUBTITLES_API_KEY) {
                console.log(`🔑 Requesting official OpenSubtitles download link for file ${fileId}...`);
                const tokenRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Api-Key': process.env.OPENSUBTITLES_API_KEY
                    },
                    body: JSON.stringify({ file_id: fileId })
                });

                if (tokenRes.ok) {
                    const data = await tokenRes.json();
                    if (data.link) {
                        subtitleUrl = data.link;
                        console.log(`✅ Got official download link from OpenSubtitles.`);
                    } else {
                        throw new Error("OpenSubtitles didn't return a link. Possibly reached quota.");
                    }
                } else {
                    console.error(`❌ Failed to get OpenSubtitle token: ${tokenRes.status} ${tokenRes.statusText}`);
                    return null;
                }
            } else {
                console.error(`❌ Cannot download from OpenSubtitles: Missing API Key or invalid file_id`);
                return null;
            }
        } else if (subtitleUrl.includes('sub.wyzie.io') && process.env.WYZIE_API_KEY) {
            // Ensure Wyzie API key is appended securely
            const urlObj = new URL(subtitleUrl);
            if (!urlObj.searchParams.has('key')) {
                urlObj.searchParams.append('key', process.env.WYZIE_API_KEY);
                subtitleUrl = urlObj.toString();
            }
        }

        // Generate cache filename from URL hash
        const urlHash = crypto.createHash('md5').update(subtitleUrl).digest('hex');
        const cachedPath = path.join(SUBTITLE_CACHE_DIR, `${urlHash}.vtt`);

        // Check if already cached
        if (fs.existsSync(cachedPath)) {
            console.log(`📁 Using cached subtitle: ${urlHash}`);
            return cachedPath;
        }

        console.log(`⬇️ Downloading subtitle: ${subtitleUrl}`);

        const response = await fetch(subtitleUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.opensubtitles.org/'
            }
        });

        if (!response.ok) {
            console.error(`❌ Download failed: ${response.status}`);
            return null;
        }

        let content = '';

        const isZip = subtitleUrl.endsWith('.zip') || response.headers.get('content-type')?.includes('zip');
        if (isZip) {
            console.log(`📦 Unzipping downloaded file...`);
            const arrayBuffer = await response.arrayBuffer();
            
            // Fix ESM/CommonJS AdmZip import issue
            let AdmZip: any;
            try {
                const mod = await import('adm-zip');
                AdmZip = mod.default || mod;
            } catch (e) {
                console.error("Failed to load adm-zip", e);
                return null;
            }

            const zip = new AdmZip(Buffer.from(arrayBuffer));
            const zipEntries = zip.getEntries();
            const srtEntry = zipEntries.find((e: any) => e.entryName.endsWith('.srt') || e.entryName.endsWith('.vtt'));
            
            if (srtEntry) {
                 content = zip.readAsText(srtEntry, 'utf8');
                 // Update so the convert logic runs if it's an SRT
                 subtitleUrl = srtEntry.entryName;
            } else {
                 throw new Error("No subtitle found in zip");
            }
        } else {
            content = await response.text();
        }

        // Convert SRT to VTT if needed
        if (subtitleUrl.endsWith('.srt') || content.includes('-->') && !content.startsWith('WEBVTT')) {
            content = convertSrtToVtt(content);
        }

        // Save to cache
        fs.writeFileSync(cachedPath, content, 'utf-8');
        console.log(`💾 Cached subtitle: ${urlHash}`);

        return cachedPath;

    } catch (error: any) {
        console.error('❌ Subtitle download error:', error.message);
        return null;
    }
}

/**
 * Convert SRT format to WebVTT format
 */
export function convertSrtToVtt(srt: string): string {
    // Add WEBVTT header
    let vtt = 'WEBVTT\n\n';

    // Clean up the SRT content
    const cleaned = srt
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

    // Split into subtitle blocks
    const blocks = cleaned.split(/\n\n+/);

    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length < 2) continue;

        // Find the timestamp line (contains "-->")
        let timestampIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('-->')) {
                timestampIndex = i;
                break;
            }
        }

        // Convert timestamps from SRT format (00:00:00,000) to VTT format (00:00:00.000)
        const timestamp = lines[timestampIndex].replace(/,/g, '.');

        // Get the subtitle text (everything after timestamp)
        const text = lines.slice(timestampIndex + 1).join('\n');

        if (timestamp && text) {
            vtt += `${timestamp}\n${text}\n\n`;
        }
    }

    return vtt;
}

/**
 * Get cached subtitle file path by hash
 */
export function getCachedSubtitle(hash: string): string | null {
    const cachedPath = path.join(SUBTITLE_CACHE_DIR, `${hash}.vtt`);
    return fs.existsSync(cachedPath) ? cachedPath : null;
}

/**
 * Quick search and get first English subtitle
 */
export async function getFirstSubtitle(
    imdbId: string,
    season?: number,
    episode?: number
): Promise<{ url: string; language: string } | null> {
    const result = await searchSubtitles(imdbId, season, episode, 'en');

    if (result.subtitles.length === 0) {
        return null;
    }

    // Return best subtitle (first non-hearing-impaired, or first available)
    const best = result.subtitles.find(s => !s.hearingImpaired) || result.subtitles[0];

    return {
        url: best.url,
        language: best.language
    };
}
