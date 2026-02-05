const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');
const dataPath = path.join(__dirname, '../data/streamvault-data.json');

// Fix users.json
try {
    if (fs.existsSync(usersPath)) {
        console.log(`Reading ${usersPath}...`);
        const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        let updated = false;

        usersData.users.forEach(user => {
            if (user.badges) {
                let badges = [];
                try {
                    badges = typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges;
                } catch (e) {
                    console.error(`Error parsing badges for user ${user.username}:`, e);
                    return;
                }

                let userUpdated = false;
                badges.forEach(badge => {
                    if (badge.name === 'Neon Skin' && (!badge.category || badge.category === '')) {
                        console.log(`Fixing Neon Skin category for user: ${user.username}`);
                        badge.category = 'skin';
                        userUpdated = true;
                        updated = true;
                    }
                });

                if (userUpdated) {
                    user.badges = JSON.stringify(badges);
                }
            }
        });

        if (updated) {
            fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
            console.log(`✅ Successfully updated ${usersPath}`);
        } else {
            console.log(`No changes needed for ${usersPath}`);
        }
    } else {
        console.error(`❌ File not found: ${usersPath}`);
    }
} catch (error) {
    console.error(`❌ Error updating users.json:`, error);
}

// Fix streamvault-data.json
try {
    if (fs.existsSync(dataPath)) {
        console.log(`Reading ${dataPath}...`);
        const appData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        let dataUpdated = false;

        if (appData.badges) {
            appData.badges.forEach(badge => {
                if (badge.name === 'Neon Skin' && (!badge.category || badge.category === '')) {
                    console.log('Fixing Neon Skin category in source data');
                    badge.category = 'skin';
                    dataUpdated = true;
                }
            });
        }

        if (dataUpdated) {
            fs.writeFileSync(dataPath, JSON.stringify(appData, null, 2));
            console.log(`✅ Successfully updated ${dataPath}`);
        } else {
            console.log(`No changes needed for ${dataPath}`);
        }
    } else {
        console.error(`❌ File not found: ${dataPath}`);
    }
} catch (error) {
    console.error(`❌ Error updating streamvault-data.json:`, error);
}
