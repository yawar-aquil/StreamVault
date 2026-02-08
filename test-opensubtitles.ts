
// Uses global fetch in Node 18+
async function testOpenSubtitles() {
    const imdbId = 'tt1375666'; // Inception
    const lang = 'eng';
    // Use the Rest API
    const url = `https://rest.opensubtitles.org/search/imdbid-${imdbId}/sublanguageid-${lang}`;

    console.log(`Testing URL: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TemporaryUserAgent' // Need a UA
            }
        });

        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log(`Found ${data.length} subtitles`);
            if (data.length > 0) {
                console.log('Sample:', JSON.stringify(data[0], null, 2));
            }
        } else {
            console.log('Error body:', await response.text());
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testOpenSubtitles();
