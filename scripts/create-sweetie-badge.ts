import { storage } from "../server/storage";

async function main() {
    console.log("Creating 'Sweetie' badge...");

    // Check if it already exists to avoid duplicates
    const badges = await storage.getBadges();
    const existing = badges.find(b => b.name === "Sweetie");

    if (existing) {
        console.log(`⚠️  Badge 'Sweetie' already exists (ID: ${existing.id}). Updating image URL...`);
        await storage.updateBadge(existing.id, {
            imageUrl: "/badges/sweetie.svg",
            description: "For the one who makes my heart skip a beat. 💖"
        });
        console.log("✅ Badge updated.");
    } else {
        const badge = await storage.createBadge({
            name: "Sweetie",
            description: "For the one who makes my heart skip a beat. 💖",
            category: "achievement",
            imageUrl: "/badges/sweetie.svg",
            icon: "heart",
            active: true
        });
        console.log(`✅ Badge '${badge.name}' created with ID: ${badge.id}`);
    }

    process.exit(0);
}

main().catch(console.error);
