
import * as fs from 'fs';
import * as path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function migrate() {
    console.log("Starting migration on", USERS_FILE);
    if (!fs.existsSync(USERS_FILE)) {
        console.error("Users file not found");
        return;
    }

    try {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const data = JSON.parse(raw);
        let updatedCount = 0;

        // Ensure data.users exists and is an array
        if (data.users && Array.isArray(data.users)) {
            data.users.forEach((user: any) => {
                if (user.badges) {
                    let badges = user.badges;
                    let isString = typeof badges === 'string';
                    let badgeArray;

                    try {
                        badgeArray = isString ? JSON.parse(badges) : badges;
                    } catch (e) {
                        return; // Skip invalid JSON
                    }

                    if (!Array.isArray(badgeArray)) return;

                    let userChanged = false;

                    // Migrate Neon -> Neon Skin
                    badgeArray.forEach((b: any) => {
                        if (b.name === "Neon") {
                            b.name = "Neon Skin";
                            userChanged = true;
                        }
                        if (b.name === "Gold") {
                            b.name = "Gold Skin";
                            userChanged = true;
                        }
                    });

                    if (userChanged) {
                        user.badges = isString ? JSON.stringify(badgeArray) : badgeArray;
                        updatedCount++;
                    }
                }
            });

            if (updatedCount > 0) {
                fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
                console.log(`Migrated ${updatedCount} users successfully.`);
            } else {
                console.log("No migration needed.");
            }
        } else {
            console.log("No users array found in data.");
        }

    } catch (e) {
        console.error("Error migrating:", e);
    }
}

migrate();
