
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data/streamvault-data.json');
try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    data.badges.forEach((b: any) => {
        console.log(`${b.id}|${b.name}|${b.category}`);
    });
} catch (e) {
    console.error(e);
}
