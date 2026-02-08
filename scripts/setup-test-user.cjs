const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

try {
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const adminUser = usersData.users.find(u => u.username === 'admin');
    const debugUser = usersData.users.find(u => u.username.startsWith('debug_user'));

    if (adminUser && debugUser) {
        let adminBadges = typeof adminUser.badges === 'string' ? JSON.parse(adminUser.badges) : adminUser.badges;
        let debugBadges = typeof debugUser.badges === 'string' ? JSON.parse(debugUser.badges) : debugUser.badges;

        const neonSkin = adminBadges.find(b => b.name === 'Neon Skin');
        const goldSkin = adminBadges.find(b => b.name === 'Gold Skin');

        if (neonSkin) {
            // Check if debug user already has it
            if (!debugBadges.find(b => b.name === 'Neon Skin')) {
                debugBadges.push(neonSkin);
                console.log('Added Neon Skin to debug user');
            }
        }

        if (goldSkin) {
            if (!debugBadges.find(b => b.name === 'Gold Skin')) {
                debugBadges.push(goldSkin);
                console.log('Added Gold Skin to debug user');
            }
        }

        debugUser.badges = JSON.stringify(debugBadges);
        fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
        console.log(`✅ Successfully updated debug user badges in ${usersPath}`);
        console.log('Debug User Credentials:', debugUser.username, debugUser.password);

    } else {
        console.error('Admin or Debug user not found');
    }
} catch (error) {
    console.error('Error updating users.json:', error);
}
