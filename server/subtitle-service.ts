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
    'https://subs.wyzie.ru',           // Primary
    'https://sub.wyzie.ru/v2',         // Alternative mirror
    'https://api.subdl.com/subtitle'   // SubDL API (backup)
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


    // Try each API in order
    for (let i = 0; i < SUBTITLE_APIS.length; i++) {
        const baseUrl = SUBTITLE_APIS[i];

        try {
            let url: string;

            // Different URL formats for different providers
            if (baseUrl.includes('subdl.com')) {
                // SubDL format
                url = `${baseUrl}/search?imdb_id=${imdbId}&languages=${language}`;
                if (season !== undefined && episode !== undefined) {
                    url += `&season_number=${season}&episode_number=${episode}`;
                }
            } else {
                // Wyzie format
                url = `${baseUrl}/search?id=${imdbId}&language=${language}`;
                if (season !== undefined && episode !== undefined) {
                    url += `&season=${season}&episode=${episode}`;
                }
            }

            console.log(`🔍 Trying provider ${i + 1}/${SUBTITLE_APIS.length}: ${url}`);

            const response = await fetchWithTimeout(url, 8000);

            if (!response.ok) {
                console.log(`⚠️ Provider ${i + 1} (${baseUrl}) returned ${response.status} ${response.statusText}, trying next...`);
                continue;
            }

            const data = await response.json();

            // Parse response based on provider format
            let subtitles: SubtitleResult[] = [];

            if (Array.isArray(data)) {
                // Wyzie format - array of subtitles
                subtitles = data.map((sub: any, index: number) => ({
                    id: sub.id || `sub_${index}`,
                    url: sub.url || sub.SubDownloadLink || '',
                    downloadUrl: sub.url || sub.SubDownloadLink || '',
                    lang: sub.lang || sub.LanguageId || language,
                    language: sub.language || sub.LanguageName || 'English',
                    format: sub.format || 'srt',
                    hearingImpaired: sub.hearingImpaired || sub.SubHearingImpaired === '1' || false,
                    provider: baseUrl.includes('subdl') ? 'subdl' : 'wyzie'
                }));
            } else if (data.subtitles && Array.isArray(data.subtitles)) {
                // SubDL format - { subtitles: [] }
                subtitles = data.subtitles.map((sub: any, index: number) => ({
                    id: sub.id || sub.subtitle_id || `sub_${index}`,
                    url: sub.url || sub.download_url || '',
                    downloadUrl: sub.url || sub.download_url || '',
                    lang: sub.lang || sub.language || language,
                    language: sub.language_name || sub.language || 'English',
                    format: sub.format || 'srt',
                    hearingImpaired: sub.hi || sub.hearing_impaired || false,
                    provider: 'subdl'
                }));
            }

            // Filter out empty URLs
            subtitles = subtitles.filter(s => s.url && s.url.startsWith('http'));

            if (subtitles.length > 0) {
                console.log(`✅ Found ${subtitles.length} subtitles from provider ${i + 1}`);
                return { subtitles };
            } else {
                console.log(`⚠️ No valid subtitles found from provider ${i + 1}, trying next...`);
            }

        } catch (error: any) {
            console.log(`⚠️ Provider ${i + 1} (${baseUrl}) failed: ${error.message}, trying next...`);
            continue;
        }
    }

    // All providers failed
    console.error('❌ All subtitle providers failed');
    return { subtitles: [], error: 'All subtitle providers failed' };
}

/**
 * Download and cache a subtitle file
 * @param subtitleUrl - URL to the subtitle file
 * @returns Local file path to the cached subtitle
 */
export async function downloadSubtitle(subtitleUrl: string): Promise<string | null> {
    try {
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

        let content = await response.text();

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
function convertSrtToVtt(srt: string): string {
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
