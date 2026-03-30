import fs from 'fs';

const SUBTITLE_APIS = [
    'https://subs.wyzie.ru',
    'https://sub.wyzie.ru/v2',
    'https://api.subdl.com/subtitle'
];

async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

async function testProviders() {
    const imdbId = 'tt0111161'; // The Shawshank Redemption
    const language = 'en';
    let output = '';
    
    for (let i = 0; i < SUBTITLE_APIS.length; i++) {
        const baseUrl = SUBTITLE_APIS[i];
        try {
            let url;
            if (baseUrl.includes('subdl.com')) {
                url = `${baseUrl}/search?imdb_id=${imdbId}&languages=${language}`;
            } else {
                url = `${baseUrl}/search?id=${imdbId}&language=${language}`;
            }

            output += `\nTesting provider ${i + 1}/${SUBTITLE_APIS.length}: ${url}\n`;
            
            const start = performance.now();
            const response = await fetchWithTimeout(url, 8000);
            const duration = performance.now() - start;

            if (!response.ok) {
                output += `Provider ${i + 1} failed: ${response.status} ${response.statusText}\n`;
                continue;
            }

            const data = await response.json();
            
            let count = 0;
            if (Array.isArray(data)) count = data.length;
            else if (data.subtitles && Array.isArray(data.subtitles)) count = data.subtitles.length;
            else if (data.results && Array.isArray(data.results)) count = data.results.length;
            
            output += `Provider ${i + 1} success in ${Math.round(duration)}ms! Found ${count} results.\n`;
            
        } catch (error) {
            output += `Provider ${i + 1} failed: ${error.message}\n`;
        }
    }
    
    fs.writeFileSync('test-output.txt', output, 'utf8');
}

testProviders();
