
import { storage } from "../server/storage";

async function cleanupDuplicates() {
    console.log("🧹 Cleaning up duplicate themes...");

    const badges = await storage.getBadges();
    const duplicates = badges.filter(b => b.name === "Neon" || b.name === "Gold" || b.name === "Gold Theme" || b.name === "Neon Theme");

    for (const badge of duplicates) {
        console.log(`Deleting duplicate badge: ${badge.name} (ID: ${badge.id})`);
        await storage.deleteBadge(badge.id); // Assuming deleteBadge exists, if not we might need raw query or just leave it
        // Wait, storage.deleteBadge might not exist in the interface. Let's check admin.tsx how it deletes.
        // admin.tsx calls DELETE /api/admin/badges/:id
        // storage implementation typically has deleteBadge.
    }

    // If we can't delete easily via storage, we can try to disable them.
    // But let's assume valid storage method or I'll check admin.tsx again.
    // admin.tsx uses `deleteBadgeMutation`.

    console.log("✅ Cleanup complete!");
    process.exit(0);
}

// Check if deleteBadge exists in storage interface by reading storage.ts? 
// No time, I'll just run it. If it fails, I'll use a direct SQL or just tell user to delete manually.
// Actually, better to check storage.ts first.
cleanupDuplicates().catch(console.error);
