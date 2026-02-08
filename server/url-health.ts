/**
 * URL Health Checker Utility
 * Checks if video URLs (especially archive.org) are accessible
 */

export interface UrlCheckResult {
    url: string;
    valid: boolean;
    status: number;
    error?: string;
    responseTime?: number;
}

export interface ContentWithUrl {
    id: string;
    type: 'episode' | 'animeEpisode' | 'movie';
    title: string;
    parentTitle?: string; // Show/Anime title for episodes
    season?: number;
    episodeNumber?: number;
    url: string;
    urlField: 'videoUrl' | 'googleDriveUrl';
}

export interface HealthReport {
    checkedAt: Date;
    totalChecked: number;
    valid: number;
    broken: number;
    brokenItems: Array<ContentWithUrl & { checkResult: UrlCheckResult }>;
    summary: {
        episodes: { total: number; broken: number };
        animeEpisodes: { total: number; broken: number };
        movies: { total: number; broken: number };
    };
}

/**
 * Check if a single URL is accessible via HEAD request
 */
export async function checkUrl(url: string): Promise<UrlCheckResult> {
    const startTime = Date.now();

    try {
        // Skip Google Drive URLs as they require auth/different handling
        if (url.includes('drive.google.com')) {
            return {
                url,
                valid: true, // Assume valid, we can't easily check these
                status: 200,
                responseTime: 0,
            };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StreamVault URL Checker',
            },
        });

        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;

        return {
            url,
            valid: response.ok || response.status === 302 || response.status === 301,
            status: response.status,
            responseTime,
        };
    } catch (error: any) {
        return {
            url,
            valid: false,
            status: 0,
            error: error.name === 'AbortError' ? 'Timeout' : error.message,
            responseTime: Date.now() - startTime,
        };
    }
}

/**
 * Check all video URLs in the system
 * Note: This can be slow for large datasets
 */
export async function checkAllVideoUrls(
    episodes: any[],
    animeEpisodes: any[],
    movies: any[],
    shows: any[],
    animeList: any[],
    options: { checkArchiveOnly?: boolean; limit?: number } = {}
): Promise<HealthReport> {
    const brokenItems: Array<ContentWithUrl & { checkResult: UrlCheckResult }> = [];
    const summary = {
        episodes: { total: 0, broken: 0 },
        animeEpisodes: { total: 0, broken: 0 },
        movies: { total: 0, broken: 0 },
    };

    // Build show/anime lookup maps
    const showMap = new Map(shows.map((s: any) => [s.id, s.title]));
    const animeMap = new Map(animeList.map((a: any) => [a.id, a.title]));

    // Collect all URLs to check
    const urlsToCheck: ContentWithUrl[] = [];

    // Helper to check if we should verify this item
    const shouldCheck = (url: string | null | undefined, options: any) => {
        if (!url) return false;
        // If manually filtering for archive only
        if (options.checkArchiveOnly) return url.includes('archive.org');
        // Otherwise check everything that ISN'T a google drive link
        // (as checkUrl automatically skips drive links anyway, but here we decide inclusion)
        return !url.includes('drive.google.com') || options.checkDriveLinks;
    };

    // Episodes
    for (const ep of episodes) {
        // Check videoUrl first
        if (shouldCheck(ep.videoUrl, options)) {
            urlsToCheck.push({
                id: ep.id,
                type: 'episode',
                title: ep.title,
                parentTitle: showMap.get(ep.showId) || 'Unknown Show',
                season: ep.season,
                episodeNumber: ep.episodeNumber,
                url: ep.videoUrl,
                urlField: 'videoUrl',
            });
            summary.episodes.total++;
        }
        // Also check googleDriveUrl if it looks like a direct link (e.g. archive.org stored in drive field)
        else if (shouldCheck(ep.googleDriveUrl, options)) {
            urlsToCheck.push({
                id: ep.id,
                type: 'episode',
                title: ep.title,
                parentTitle: showMap.get(ep.showId) || 'Unknown Show',
                season: ep.season,
                episodeNumber: ep.episodeNumber,
                url: ep.googleDriveUrl,
                urlField: 'googleDriveUrl',
            });
            summary.episodes.total++;
        }
    }

    // Anime Episodes
    for (const ep of animeEpisodes) {
        if (shouldCheck(ep.videoUrl, options)) {
            urlsToCheck.push({
                id: ep.id,
                type: 'animeEpisode',
                title: ep.title,
                parentTitle: animeMap.get(ep.animeId) || 'Unknown Anime',
                season: ep.season,
                episodeNumber: ep.episodeNumber,
                url: ep.videoUrl,
                urlField: 'videoUrl',
            });
            summary.animeEpisodes.total++;
        }
        else if (shouldCheck(ep.googleDriveUrl, options)) {
            urlsToCheck.push({
                id: ep.id,
                type: 'animeEpisode',
                title: ep.title,
                parentTitle: animeMap.get(ep.animeId) || 'Unknown Anime',
                season: ep.season,
                episodeNumber: ep.episodeNumber,
                url: ep.googleDriveUrl,
                urlField: 'googleDriveUrl',
            });
            summary.animeEpisodes.total++;
        }
    }

    // Movies
    for (const movie of movies) {
        if (shouldCheck(movie.googleDriveUrl, options)) {
            urlsToCheck.push({
                id: movie.id,
                type: 'movie',
                title: movie.title,
                parentTitle: 'Movie',
                url: movie.googleDriveUrl,
                urlField: 'googleDriveUrl',
            });
            summary.movies.total++;
        }
    }

    // Apply limit if specified
    const toCheck = options.limit ? urlsToCheck.slice(0, options.limit) : urlsToCheck;

    // Check URLs in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < toCheck.length; i += batchSize) {
        const batch = toCheck.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async (item) => {
                const result = await checkUrl(item.url);
                return { item, result };
            })
        );

        for (const { item, result } of results) {
            if (!result.valid) {
                brokenItems.push({ ...item, checkResult: result });
                if (item.type === 'episode') summary.episodes.broken++;
                if (item.type === 'animeEpisode') summary.animeEpisodes.broken++;
                if (item.type === 'movie') summary.movies.broken++;
            }
        }
    }

    return {
        checkedAt: new Date(),
        totalChecked: toCheck.length,
        valid: toCheck.length - brokenItems.length,
        broken: brokenItems.length,
        brokenItems,
        summary,
    };
}
