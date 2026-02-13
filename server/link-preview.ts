
import * as cheerio from 'cheerio';

interface LinkPreviewData {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
}

export async function getLinkPreview(url: string): Promise<LinkPreviewData> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'StreamVault-LinkPreview/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
        const image = $('meta[property="og:image"]').attr('content') || '';
        const siteName = $('meta[property="og:site_name"]').attr('content') || '';

        // Helper to resolve relative URLs
        const resolveUrl = (relativeUrl: string) => {
            if (!relativeUrl) return undefined;
            try {
                return new URL(relativeUrl, url).toString();
            } catch (e) {
                return relativeUrl;
            }
        };

        return {
            url,
            title: title || undefined,
            description: description || undefined,
            image: resolveUrl(image),
            siteName: siteName || undefined
        };
    } catch (error) {
        console.error('Error fetching link preview:', error);
        return { url };
    }
}
