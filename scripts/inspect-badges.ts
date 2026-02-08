
import { storage } from '../server/storage';

async function inspectBadges() {
    console.log("🔍 Inspecting Badges...");
    const badges = await storage.getBadges();
    badges.forEach(b => {
        console.log(`[${b.id}] Name: '${b.name}', Category: '${b.category}'`);
    });
    console.log("✅ Done.");
    process.exit(0);
}

inspectBadges();
