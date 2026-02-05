
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '../data/streamvault-data.json');

async function updateStoreNames() {
    if (!fs.existsSync(DATA_PATH)) {
        console.error('Data file not found at:', DATA_PATH);
        process.exit(1);
    }

    console.log('Reading data file...');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

    if (!data.badges) {
        console.error('No badges found in data file.');
        process.exit(1);
    }

    let updatedCount = 0;

    data.badges = data.badges.map((badge: any) => {
        if (badge.name === 'Neon') {
            console.log('Updating Neon -> Neon Skin');
            badge.name = 'Neon Skin';
            updatedCount++;
        } else if (badge.name === 'Gold') {
            console.log('Updating Gold -> Gold Skin');
            badge.name = 'Gold Skin';
            updatedCount++;
        }
        return badge;
    });

    if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} badges.`);
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        console.log('Data file saved.');
    } else {
        console.log('No badges needed updating.');
    }
}

updateStoreNames();
