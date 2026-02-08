
import { searchSubtitles, downloadSubtitle } from './server/subtitle-service';

async function testSubtitles() {
    console.log('Testing subtitle providers...');

    // Test with a known movie (Inception - tt1375666)
    console.log('\n--- Testing Movie (Inception) ---');
    try {
        const movieResult = await searchSubtitles('tt1375666', undefined, undefined, 'en');
        console.log(`Found ${movieResult.subtitles.length} subtitles for movie.`);
        if (movieResult.subtitles.length > 0) {
            const firstSub = movieResult.subtitles[0];
            console.log(`First subtitle URL: ${firstSub.url}`);
            console.log(`Provider: ${firstSub.provider}`);

            // Try downloading
            console.log('Attempting to download...');
            const filePath = await downloadSubtitle(firstSub.url);
            if (filePath) {
                console.log(`✅ Download successful: ${filePath}`);
            } else {
                console.error('❌ Download failed.');
            }
        }
    } catch (e) {
        console.error('Movie search failed:', e);
    }

    // Test with a known show (Stranger Things S1E1 - tt4574334)
    console.log('\n--- Testing Show (Stranger Things S1E1) ---');
    try {
        // Correct ID for Stranger Things is tt4574334
        const showResult = await searchSubtitles('tt4574334', 1, 1, 'en');
        console.log(`Found ${showResult.subtitles.length} subtitles for show.`);
        if (showResult.subtitles.length > 0) {
            const firstSub = showResult.subtitles[0];
            console.log(`First subtitle URL: ${firstSub.url}`);
            console.log(`Provider: ${firstSub.provider}`);

            // Try downloading
            console.log('Attempting to download...');
            const filePath = await downloadSubtitle(firstSub.url);
            if (filePath) {
                console.log(`✅ Download successful: ${filePath}`);
            } else {
                console.error('❌ Download failed.');
            }
        }
    } catch (e) {
        console.error('Show search failed:', e);
    }
}

testSubtitles().catch(console.error);
