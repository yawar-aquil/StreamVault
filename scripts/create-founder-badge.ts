import { storage } from "../server/storage";

async function main() {
    console.log("Creating 'Founder' badge...");

    // Check if it already exists to avoid duplicates
    const badges = await storage.getBadges();
    const existing = badges.find(b => b.name === "Founder");

    if (existing) {
        console.log(`⚠️  Badge 'Founder' already exists (ID: ${existing.id}). Updating image URL...`);
        await storage.updateBadge(existing.id, {
            imageUrl: "/badges/founder.svg",
            description: "The visionary who started it all. 🏆"
        });
        console.log("✅ Badge updated.");
    } else {
        const badge = await storage.createBadge({
            name: "Founder",
            description: "The visionary who started it all. 🏆",
            category: "achievement",
            imageUrl: "/badges/founder.svg",
            icon: "crown",
            active: true
        });
        console.log(`✅ Badge '${badge.name}' created with ID: ${badge.id}`);
    }

    process.exit(0);
}

main().catch(console.error);
