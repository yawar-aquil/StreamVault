/**
 * Update Cashero show episode Google Drive URLs
 * Run with: node scripts/update-cashero-links.cjs
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/streamvault-data.json');

// Episode links (converted from /view to /preview)
const episodeLinks = {
    1: { // Season 1
        1: 'https://drive.google.com/file/d/1TWQhk1c_1WU7lptQB8eVib3Z7h2EVA9F/preview',
        2: 'https://drive.google.com/file/d/1PM4dAtJ0i-_0mN-wKUXvCfLTZvVXOvUk/preview',
        3: 'https://drive.google.com/file/d/1vKaLV88nHiIIw4c4EAg-IUH0pSh3kGJt/preview',
        4: 'https://drive.google.com/file/d/1TBipMmSjQVrYx41siBry5mcAeyU3EhFa/preview',
        5: 'https://drive.google.com/file/d/1mET23YUe9AK9vtUt2Dhs87X95p1phGUM/preview',
        6: 'https://drive.google.com/file/d/1tk9fbPIBBr2EqsNzIz7rYVvyeneHfVWO/preview',
        7: 'https://drive.google.com/file/d/1v00u8lUUPSkFJjP0-qCstcXQ_Qv60VVa/preview',
        8: 'https://drive.google.com/file/d/1DOgUgJoO2Sb2oe7ydZTdAYvJfkdnCAxc/preview',
    },
};

async function updateLinks() {
    console.log('📺 Updating Cashero episode links...\n');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

    const show = data.shows.find(s => s.slug === 'cashero' || s.title.toLowerCase().includes('cashero'));
    if (!show) {
        console.log('❌ Show not found!');
        return;
    }

    const SHOW_ID = show.id;
    console.log(`Found show: ${show.title} (${SHOW_ID})\n`);

    let updated = 0;

    for (const episode of data.episodes) {
        if (episode.showId === SHOW_ID) {
            const season = episode.season;
            const epNum = episode.episodeNumber;

            if (episodeLinks[season] && episodeLinks[season][epNum]) {
                const newUrl = episodeLinks[season][epNum];
                const oldUrl = episode.googleDriveUrl;

                if (oldUrl !== newUrl) {
                    episode.googleDriveUrl = newUrl;
                    console.log(`✅ S${season}E${epNum}: ${episode.title}`);
                    updated++;
                }
            }
        }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`\n✅ Updated ${updated} episodes`);
    console.log('💾 Saved!');
}

updateLinks().catch(console.error);
