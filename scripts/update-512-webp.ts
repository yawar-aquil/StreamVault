
import { storage } from "../server/storage";

async function update512Badge() {
    try {
        const badgeId = "badge-512";
        console.log("Updating '512' badge to use WebP...");

        await storage.updateBadge(badgeId, {
            imageUrl: "/badges/512.webp",
        });

        console.log("✅ 512 Badge updated to WebP successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error updating badge:", error);
        process.exit(1);
    }
}

update512Badge();
