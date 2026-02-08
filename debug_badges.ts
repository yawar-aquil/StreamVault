
import { storage } from "./server/storage";
import { convertToUser } from "./shared/utils"; // If needed, or just mock
import { checkAndAwardAchievements } from "./server/achievements";

async function debug() {
    console.log("--- START DEBUG ---");

    // 1. Create User
    const user = await storage.createUser({
        username: "debug_user_" + Date.now(),
        email: "debug_" + Date.now() + "@test.com",
        password: "password123", // Encrypted in logic? createUser takes plain pw in interface? 
        // Wait, createUser takes Omit<User...>
        // User interface has passwordHash.
        // Let's use createUser which handles this?
        // storage.createUser args: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
        // It expects passwordHash.
        passwordHash: "hashed_dummy",
        badges: "[]"
    });
    console.log(`Created user: ${user.id} (${user.username})`);

    // 2. Check initial badges (should be empty array)
    let fetchedUser = await storage.getUserById(user.id);
    console.log("Initial badges:", fetchedUser?.badges);

    // 3. Add 'new-comer' badge via addBadge directly
    console.log("Adding 'new-comer' badge...");
    await storage.addBadge(user.id, {
        id: "new-comer",
        name: "New Comer",
        description: "Test Badge",
        icon: "star",
        earnedAt: new Date().toISOString()
    });

    // 4. Verify persist in memory
    fetchedUser = await storage.getUserById(user.id);
    console.log("Badges after addBadge:", fetchedUser?.badges);

    // Parse to verify
    const badges = JSON.parse(fetchedUser?.badges || "[]");
    const hasBadge = badges.find((b: any) => b.id === "new-comer");
    console.log("Has 'new-comer' in JSON?", !!hasBadge);

    // 5. Run checkAndAwardAchievements (simulating loop)
    // This function checks if user has badges. If not, it awards them.
    // 'new-comer' condition is always true.
    console.log("Running checkAndAwardAchievements...");
    const awarded = await checkAndAwardAchievements(user.id);
    console.log("Awarded in this run:", awarded);

    // If 'new-comer' was awarded AGAIN, it means it wasn't valid before.
    if (awarded.includes("New Comer")) {
        console.error("FAIL: 'New Comer' was awarded again! Detection failed.");
    } else {
        console.log("SUCCESS: 'New Comer' was skipped (already detected).");
    }

    // 6. Test persistence (Save/Load) relies on file system which this script shares
    // we can't easily restart the process in script, but we can check internal Maps.
    // console.log("UserBadges Map Size:", storage['userBadges'].size); 
    // Access private property logic... disallowed in TS strictly but JS works.

    console.log("--- END DEBUG ---");
}

debug().catch(console.error).finally(() => process.exit());
