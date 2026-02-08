
import { storage } from "../server/storage";

async function main() {
    try {
        console.log("Creating VIP Badge...");

        const badge = await storage.createBadge({
            name: "VIP",
            description: "Exclusive VIP Status",
            imageUrl: "/badges/vip_v2.svg",
            category: "achievement",
            active: true,
            icon: "crown"
        });

        console.log("VIP Badge created successfully!");
        console.log(badge);
        process.exit(0);
    } catch (error) {
        console.error("Failed to create badge:", error);
        process.exit(1);
    }
}

main();
