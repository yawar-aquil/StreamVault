
import { storage } from "../server/storage";
import { randomUUID } from "crypto";

async function create512Badge() {
    try {
        const badgeId = "badge-512";

        // Check if exists
        const existing = await storage.getBadge(badgeId);
        if (existing) {
            console.log("Badge '512' already exists. Updating...");
            await storage.updateBadge(badgeId, {
                imageUrl: "/badges/512.gif",
            });
        } else {
            console.log("Creating '512' badge...");
            await storage.createBadge({
                id: badgeId,
                name: "The 512",
                description: "An exclusive animated badge.",
                icon: "zap", // fallback
                imageUrl: "/badges/512.gif",
            });
        }

        console.log("✅ 512 Badge created/updated successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error creating badge:", error);
        process.exit(1);
    }
}

create512Badge();
