// Simple translation using Google Translate's free API
// This uses the undocumented but widely-used single-string endpoint
export async function translateText(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
    if (!text || !targetLang || targetLang === 'en') return text;

    // Skip translation for media tags, URLs, and very short strings
    if (text.startsWith('[ATTACHMENT:') || text.startsWith('http') || text.length <= 2) return text;

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        if (!response.ok) {
            console.error(`Translation API error: ${response.status}`);
            return text;
        }

        const data = await response.json();

        // Response format: [[["translated text","original text",null,null,10]],null,"en"]
        if (data && data[0]) {
            const translated = data[0].map((item: any) => item[0]).join('');
            return translated || text;
        }

        return text;
    } catch (err) {
        console.error('Translation error:', err);
        return text;
    }
}

// Batch translate multiple texts
export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
    if (!targetLang || targetLang === 'en') return texts;

    // Translate in parallel with a concurrency limit
    const results = await Promise.all(
        texts.map(text => translateText(text, targetLang))
    );

    return results;
}
