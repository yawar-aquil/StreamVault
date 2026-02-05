
import { storage } from '../server/storage';

async function cleanupGhostBadges() {
    console.log("👻 Checking for ghost badges...");

    // valid badges
    const validBadgeIds = new Set((await storage.getBadges()).map(b => b.id));

    // get all users and check their badges
    // Note: memstorage doesn't expose getAllUserBadges directly easily without modifying storage.ts
    // But we can iterate users -> enrichUser -> but enrichUser *creates* the fake badge in memory!
    // We need to access the raw userBadges map if possible, but we can't from outside.
    // However, storage.ts has a 'deleteBadge' which cleans up userBadges.
    // If we can identify the IDs of the ghost badges, we can call deleteBadge(id) which will clean up the userBadges even if the badge itself doesn't exist in the map (it tries to delete from badge map, then filters userBadges).

    // Wait, storage.enrichUser actually ADDS the fake badge to this.badges!
    // line 1600: this.badges.set(ub.badgeId, badgeDefinition);
    // So if the server has been running and a user profile was loaded, the ghost badge might now be in `storage.badges`!

    const allBadges = await storage.getBadges();
    const ghostBadges = allBadges.filter(b => {
        // Identifying ghost badges: they have UUID names usually, or we know the specific ID from the user report
        // ID: 221e1512-545c-467d-a130-c4a3db38739b
        return b.id === '221e1512-545c-467d-a130-c4a3db38739b' ||
            (b.name.includes(b.id) && b.description === "Awarded Badge");
    });

    if (ghostBadges.length === 0) {
        console.log("No ghost badges found in memory (rendering might have created them but they might not be persisted yet or were missed).");
        // We know the ID explicitly.
        const knownGhostId = '221e1512-545c-467d-a130-c4a3db38739b';
        console.log(`Forcing deletion of known ghost ID: ${knownGhostId}`);
        await storage.deleteBadge(knownGhostId);
    } else {
        for (const ghost of ghostBadges) {
            console.log(`Found ghost badge: ${ghost.name} (${ghost.id})`);
            await storage.deleteBadge(ghost.id);
        }
    }

    console.log("✅ Ghost listing cleanup complete.");
    process.exit(0);
}

cleanupGhostBadges();
