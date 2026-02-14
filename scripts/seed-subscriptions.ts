
import { storage } from '../server/storage';

async function seedSubscriptions() {
    console.log("Seeding subscription badges...");

    const subscriptions = [
        {
            name: "Ad-Free Monthly",
            description: "Remove ads for 30 days",
            category: "subscription",
            imageUrl: "/assets/badges/ad-free-monthly.png", // Ensure this asset exists or use a placeholder
            price: 500, // 500 StreamCoins ~ $5
            isForSale: true,
            displayPriority: 100,
            requirements: JSON.stringify({ durationDays: 30 }),
            limited: false
        },
        {
            name: "Ad-Free Yearly",
            description: "Remove ads for 365 days (Best Value!)",
            category: "subscription",
            imageUrl: "/assets/badges/ad-free-yearly.png",
            price: 5000, // 5000 StreamCoins ~ $50 (2 months free)
            isForSale: true,
            displayPriority: 101,
            requirements: JSON.stringify({ durationDays: 365 }),
            limited: false
        }
    ];

    for (const sub of subscriptions) {
        // Check if exists by name to avoid duplicates
        const allBadges = await storage.getBadges();
        const existing = allBadges.find(b => b.name === sub.name);

        if (!existing) {
            console.log(`Creating: ${sub.name}`);
            await storage.createBadge(sub);
        } else {
            console.log(`Skipping: ${sub.name} (already exists)`);
            // Optional: Update price/details if needed
            // await storage.updateBadge(existing.id, sub);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seedSubscriptions().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
