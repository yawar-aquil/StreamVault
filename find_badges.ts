
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data/streamvault-data.json');
try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log('--- TARGET BADGES ---');
    data.badges.forEach((b: any) => {
        if (b.name.toLowerCase().includes('neon') || b.name.toLowerCase().includes('gold')) {
            console.log(JSON.stringify(b, null, 2));
        }
    });
    console.log('---------------------');
} catch (e) {
    console.error(e);
}
