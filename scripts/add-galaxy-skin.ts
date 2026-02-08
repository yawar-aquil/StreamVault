
import { storage } from "../server/storage";

async function addGalaxySkin() {
    console.log("🌌 Adding Galaxy Skin...");

    const existingBadges = await storage.getBadges();
    const galaxySkinName = "Galaxy Skin";
    const existing = existingBadges.find(b => b.name === galaxySkinName);

    if (existing) {
        console.log("⚠️ Galaxy Skin already exists! Skipping.");
        process.exit(0);
    }

    const badgeData = {
        name: galaxySkinName,
        description: "Apply the Galaxy theme to your StreamVault interface. Deep space visuals with twinkling stars.",
        imageUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80",
        price: 500,
        category: "skin",
        isForSale: true,
        giftable: true,
        limited: true,
        stock: 100,
        isSpecial: false,
        displayPriority: 25, // Higher priority to show near top/new
    };

    const newBadge = await storage.createBadge(badgeData);
    console.log(`✅ Galaxy Skin created with ID: ${newBadge.id}`);
    process.exit(0);
}

addGalaxySkin().catch(console.error);
