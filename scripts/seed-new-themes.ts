
import { storage } from "../server/storage";
import { THEME_MAPPING, THEME_PREVIEWS } from "../client/src/lib/theme-data";

const NEW_THEMES = [
    "Vaporwave Theme",
    "OLED Theme",
    "Nord Theme",
    "Golden Theme"
];

async function seedNewThemes() {
    console.log("🎨 Seeding ONLY new app-wide themes...");

    const existingBadges = await storage.getBadges();

    for (const themeName of NEW_THEMES) {
        const themeId = THEME_MAPPING[themeName];
        if (!themeId) {
            console.error(`❌ No mapping found for ${themeName}`);
            continue;
        }

        const existing = existingBadges.find(b => b.name === themeName);
        const displayName = themeName.replace(' Theme', '');

        const badgeData = {
            name: themeName,
            description: `Apply the ${displayName} theme to your StreamVault interface. Changes the entire app color palette.`,
            imageUrl: THEME_PREVIEWS[themeId],
            price: 1000, // Premium pricing for full themes
            category: "theme",
            isForSale: true,
            giftable: true,
            limited: false,
            stock: null, // Unlimited stock
            isSpecial: false,
            displayPriority: 10,
        };

        if (existing) {
            console.log(`⚠️ Theme already exists (skipping): ${themeName}`);
        } else {
            console.log(`✨ Creating new theme: ${themeName}`);
            await storage.createBadge(badgeData);
        }
    }

    console.log("✅ New themes seeded successfully!");
    process.exit(0);
}

seedNewThemes().catch(console.error);
