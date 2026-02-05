
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data/streamvault-data.json');

try {
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found at:', dataPath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    if (!data.badges || !Array.isArray(data.badges)) {
        console.error('Invalid data format: badges array missing.');
        process.exit(1);
    }

    let updatedCount = 0;
    const updates = [];

    data.badges = data.badges.map((badge) => {
        let updated = false;

        // Update Neon/Neon Skin
        if (badge.name === 'Neon' || badge.name === 'Neon Skin') {
            if (badge.name !== 'Neon Skin' || badge.category !== 'skin') {
                updates.push(`Updating Neon: Name -> Neon Skin, Category -> skin`);
                badge.name = 'Neon Skin';
                badge.category = 'skin';
                updated = true;
            }
        }

        // Update Gold/Gold Skin
        if (badge.name === 'Gold' || badge.name === 'Gold Skin') {
            if (badge.name !== 'Gold Skin' || badge.category !== 'skin') {
                updates.push(`Updating Gold: Name -> Gold Skin, Category -> skin`);
                badge.name = 'Gold Skin';
                badge.category = 'skin';
                updated = true;
            }
        }

        if (updated) updatedCount++;
        return badge;
    });

    if (updatedCount > 0) {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log('✅ Successfully updated ' + updatedCount + ' badges.');
        updates.forEach(u => console.log(' - ' + u));
    } else {
        console.log('✨ No updates needed. Badges are already correct.');
    }

} catch (error) {
    console.error('Error processing data:', error);
}
