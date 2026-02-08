const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');
const dataPath = path.join(__dirname, '../data/streamvault-data.json');

console.log('--- Verifying users.json ---');
try {
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const adminUser = usersData.users.find(u => u.username === 'admin');
    if (adminUser) {
        let badges = typeof adminUser.badges === 'string' ? JSON.parse(adminUser.badges) : adminUser.badges;
        const neonSkin = badges.find(b => b.name === 'Neon Skin');
        const goldSkin = badges.find(b => b.name === 'Gold Skin');

        console.log('Admin User Neon Skin:', neonSkin ? JSON.stringify(neonSkin, null, 2) : 'Not Found');
        console.log('Admin User Gold Skin:', goldSkin ? JSON.stringify(goldSkin, null, 2) : 'Not Found');
    } else {
        console.log('Admin user not found');
    }
} catch (e) {
    console.error('Error reading users.json', e);
}

console.log('\n--- Verifying streamvault-data.json ---');
try {
    const appData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    if (appData.badges) {
        const neonSkin = appData.badges.find(b => b.name === 'Neon Skin');
        const goldSkin = appData.badges.find(b => b.name === 'Gold Skin');

        console.log('Source Neon Skin:', neonSkin ? JSON.stringify(neonSkin, null, 2) : 'Not Found');
        console.log('Source Gold Skin:', goldSkin ? JSON.stringify(goldSkin, null, 2) : 'Not Found');
    } else {
        console.log('No badges found in streamvault-data.json');
    }
} catch (e) {
    console.error('Error reading streamvault-data.json', e);
}
