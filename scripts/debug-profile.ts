
import { storage } from '../server/storage';

async function debugProfile() {
    console.log("--- Starting Profile Debug ---");

    // 1. Get User (assuming admin exists, otherwise pick first user)
    const users = await storage.getAllUsers();
    const user = users.find(u => u.username === 'admin') || users[0];

    if (!user) {
        console.error("No users found to test.");
        return;
    }

    const userId = user.id;
    console.log(`Testing with user: ${user.username} (${userId})`);

    // 2. Get initial state
    let userProfile = await storage.getUserById(userId);
    let badges = JSON.parse(userProfile?.badges as string || "[]");
    let equippedSkin = badges.find((b: any) => b.equipped && (b.category === 'skin' || b.name.includes('Skin')));

    console.log("Initial Equipped Skin:", equippedSkin ? equippedSkin.name : "None");

    // 3. Find a skin to equip
    const userBadges = await storage.getUserBadges(userId);
    const skinBadge = userBadges.find(ub => ub.badge.category === 'skin' || ub.badge.name.includes('Skin'));

    if (!skinBadge) {
        console.error("User owns no skins. Cannot test toggle.");
        return;
    }

    console.log(`Found skin to toggle: ${skinBadge.badge.name} (Current Status: ${skinBadge.equipped})`);

    // 4. Toggle it
    const newStatus = !skinBadge.equipped;
    console.log(`Toggling to: ${newStatus}`);

    await storage.updateUserBadgeEquippedStatus(userId, skinBadge.badgeId, newStatus);

    // 5. Fetch immediately
    userProfile = await storage.getUserById(userId);
    badges = JSON.parse(userProfile?.badges as string || "[]");
    equippedSkin = badges.find((b: any) => b.equipped && (b.category === 'skin' || b.name.includes('Skin')));

    console.log("Post-Toggle Equipped Skin:", equippedSkin ? equippedSkin.name : "None");

    if (!!equippedSkin !== newStatus) {
        console.error("FAILED: Storage did not return updated state!");
    } else {
        console.log("SUCCESS: Storage returned updated state.");
    }

    // Revert
    console.log("Reverting...");
    await storage.updateUserBadgeEquippedStatus(userId, skinBadge.badgeId, !newStatus);
    console.log("Done.");
    process.exit(0);
}

debugProfile().catch(console.error);
