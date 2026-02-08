
import { storage } from "../server/storage";

async function fixGoldSkin() {
    console.log("🛠️ Fixing Gold Skin Category...");

    const badges = await storage.getBadges();
    const goldSkin = badges.find(b => b.name === "Gold Skin");

    if (!goldSkin) {
        console.error("❌ Gold Skin not found!");
        process.exit(1);
    }

    console.log(`Found Gold Skin. Current Category: '${goldSkin.category}'`);

    if (goldSkin.category !== 'skin') {
        const updated = await storage.updateBadge(goldSkin.id, {
            ...goldSkin,
            category: 'skin'
        });
        console.log(`✅ Updated Gold Skin category to: '${updated.category}'`);
    } else {
        console.log("no changes needed.");
    }

    process.exit(0);
}

fixGoldSkin().catch(console.error);
