
import { storage } from "../server/storage";

async function seedPremiumItems() {
    console.log("Seeding premium items...");

    const items = [
        {
            name: "Animated Avatar Pack",
            description: "Unlock the ability to use animated GIFs as your profile picture!",
            imageUrl: "https://cdn-icons-png.flaticon.com/512/10479/10479887.png", // GIF/Video icon
            category: "feature",
            price: 500,
            isForSale: true,
            giftable: true,
            displayPriority: 100,
            stock: null // Unlimited
        },
        {
            name: "Neon Skin",
            description: "A glowing neon theme for your profile.",
            imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=60", // Neon aesthetics
            category: "skin",
            price: 250,
            isForSale: true,
            giftable: true,
            displayPriority: 90,
            stock: null
        },
        {
            name: "Gold Skin",
            description: "A luxurious gold theme for your profile.",
            imageUrl: "https://images.unsplash.com/photo-1610375461757-5ad971bab175?w=500&auto=format&fit=crop&q=60", // Gold texture
            category: "skin",
            price: 500,
            isForSale: true,
            giftable: true,
            displayPriority: 91,
            stock: null
        }
    ];

    for (const item of items) {
        try {
            const existing = await storage.getBadges();
            const duplicate = existing.find(b => b.name === item.name);

            if (duplicate) {
                console.log(`Skipping ${item.name} (already exists)`);
                continue;
            }

            await storage.createBadge(item);
            console.log(`Created ${item.name}`);
        } catch (error) {
            console.error(`Failed to create ${item.name}:`, error);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seedPremiumItems();
