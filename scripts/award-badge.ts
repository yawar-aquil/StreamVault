
import { storage } from "../server/storage";

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: npm run script scripts/award-badge.ts <username> <badge_name>");
        process.exit(1);
    }

    const [username, badgeName] = args;

    console.log(`🔍 Looking for user '${username}'...`);
    const user = await storage.getUserByUsername(username);
    if (!user) {
        console.error(`❌ User '${username}' not found.`);
        process.exit(1);
    }

    console.log(`🔍 Looking for badge '${badgeName}'...`);
    const badges = await storage.getBadges();
    const badge = badges.find(b => b.name.toLowerCase() === badgeName.toLowerCase());

    if (!badge) {
        console.error(`❌ Badge '${badgeName}' not found.`);
        console.log("Available badges:", badges.map(b => b.name).join(", "));
        process.exit(1);
    }

    console.log(`✨ Awarding badge '${badge.name}' to user '${user.username}'...`);

    // Check if already has badge
    const userBadges = await storage.getUserBadges(user.id);
    if (userBadges.some(ub => ub.badgeId === badge.id)) {
        console.log(`⚠️  User already has this badge.`);
    } else {
        await storage.awardBadge(user.id, badge.id);
        console.log(`✅ Badge awarded successfully!`);

        // Also create a notification
        await storage.createNotification({
            userId: user.id,
            type: 'achievement', // reusing achievement type
            title: 'New Badge Earned! 🏅',
            message: `You have been awarded the "${badge.name}" badge!`,
            data: { badgeId: badge.id, name: badge.name, icon: 'award' },
            read: false
        });
        console.log(`📢 Notification sent.`);
    }

    process.exit(0);
}

main().catch(console.error);
