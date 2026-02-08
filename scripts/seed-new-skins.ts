
import { storage } from "../server/storage";
import { THEME_MAPPING, THEME_PREVIEWS } from "../client/src/lib/theme-data";

const NEW_SKINS = [
    "Glitch Skin",
    "Retro Skin",
    "Crystal Skin",
    "Anime Skin",
    "Wanted Skin"
];

async function seedNewSkins() {
    console.log("🌱 Seeding ONLY new premium skins...");

    const existingBadges = await storage.getBadges();

    for (const skinName of NEW_SKINS) {
        const themeId = THEME_MAPPING[skinName];
        if (!themeId) {
            console.error(`❌ No mapping found for ${skinName}`);
            continue;
        }

        const existing = existingBadges.find(b => b.name === skinName);
        const displayName = skinName.replace(' Skin', '');

        const badgeData = {
            name: skinName,
            description: `Apply the ${displayName} skin to your StreamVault interface. Features unique animations and styles.`,
            imageUrl: THEME_PREVIEWS[themeId],
            price: 500,
            category: "skin",
            isForSale: true,
            giftable: true,
            limited: true,
            stock: 100,
            isSpecial: false,
            displayPriority: 25, // Slightly higher priority than standard themes
        };

        if (existing) {
            console.log(`⚠️ Skin already exists (skipping to preserve data): ${skinName}`);
        } else {
            console.log(`✨ Creating new skin: ${skinName}`);
            await storage.createBadge(badgeData);
        }
    }

    console.log("✅ New skins seeded successfully!");
    process.exit(0);
}

seedNewSkins().catch(console.error);
