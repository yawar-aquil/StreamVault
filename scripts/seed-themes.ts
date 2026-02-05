
import { storage } from "../server/storage";
import { THEME_MAPPING, THEME_PREVIEWS } from "../client/src/lib/theme-data";

async function seedThemes() {
    console.log("🌱 Seeding premium themes...");

    const existingBadges = await storage.getBadges();

    for (const [themeName, themeId] of Object.entries(THEME_MAPPING)) {
        const existing = existingBadges.find(b => b.name === themeName);

        // Capitalize for description
        const displayName = themeName.replace(' Theme', '');

        const badgeData = {
            name: themeName,
            description: `Apply the ${displayName} theme to your StreamVault interface. Premium look and feel.`,
            imageUrl: THEME_PREVIEWS[themeId],
            price: 500, // Fixed price as per user expectation
            category: themeName.includes("Skin") ? "skin" : "theme",
            isForSale: true,
            giftable: true,
            limited: true,
            stock: 100, // 100 Left
            isSpecial: false,
            displayPriority: 20,
        };

        if (existing) {
            console.log(`Updating existing theme: ${themeName}`);
            await storage.updateBadge(existing.id, {
                ...badgeData,
                stock: existing.stock === null ? 100 : existing.stock // Ensure stock is set if it was null
            });
        } else {
            console.log(`Creating new theme: ${themeName}`);
            await storage.createBadge(badgeData);
        }
    }

    console.log("✅ Themes seeded successfully!");
    process.exit(0);
}

seedThemes().catch(console.error);
