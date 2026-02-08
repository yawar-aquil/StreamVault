
import * as fs from 'fs';
import * as path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');

try {
    if (fs.existsSync(dataPath)) {
        console.log(`Reading ${dataPath}...`);
        const content = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(content);

        if (data.badges) {
            let updated = false;
            data.badges = data.badges.map((badge: any) => {
                if (badge.name === 'Neon') {
                    console.log('Renaming "Neon" to "Neon Skin"');
                    badge.name = 'Neon Skin';
                    updated = true;
                }
                if (badge.name === 'Gold') {
                    console.log('Renaming "Gold" to "Gold Skin"');
                    badge.name = 'Gold Skin';
                    updated = true;
                }
                return badge;
            });

            if (updated) {
                console.log('Writing updated data back to file...');
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                console.log('Done.');
            } else {
                console.log('No badges named "Neon" or "Gold" found.');
            }
        } else {
            console.log('No badges array found in data.');
        }
    } else {
        console.error(`File not found: ${dataPath}`);
    }
} catch (error) {
    console.error('Error processing file:', error);
}
