
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data/streamvault-data.json');
try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log('--- ALL BADGES ---');
    data.badges.forEach((b: any) => {
        console.log(`ID: ${b.id}, Name: "${b.name}", Category: "${b.category}"`);
    });
    console.log('------------------');
} catch (e) {
    console.error(e);
}
