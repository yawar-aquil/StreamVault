
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { log } from "./vite";

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

export async function cleanupAvatars(dryRun = false) {
    log("Starting avatar cleanup task...");

    if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
        log("Avatar upload directory does not exist. Skipping cleanup.");
        return;
    }

    try {
        // 1. Get all files in the avatars directory
        const files = fs.readdirSync(AVATAR_UPLOAD_DIR);
        if (files.length === 0) {
            log("No avatar files found. Skipping.");
            return;
        }

        // 2. Get all active avatar URLs from users
        const users = await storage.getAllUsers();
        const activeAvatarFilenames = new Set<string>();

        for (const user of users) {
            if (user.avatarUrl && (user.avatarUrl.includes("/uploads/avatars/") || user.avatarUrl.includes("avatars/"))) {
                // Extract filename from URL (e.g., "/uploads/avatars/123.png" -> "123.png")
                const filename = path.basename(user.avatarUrl);
                activeAvatarFilenames.add(filename);
            }
        }

        log(`Found ${users.length} users. Identified ${activeAvatarFilenames.size} active custom avatars.`);

        let deletedCount = 0;
        let reclaimedBytes = 0;
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        for (const file of files) {
            // Skip if file is currently used
            if (activeAvatarFilenames.has(file)) {
                continue;
            }

            const filePath = path.join(AVATAR_UPLOAD_DIR, file);

            try {
                const stats = fs.statSync(filePath);

                // Safety check: Skip if file was modified less than 1 hour ago (in-progress upload or recent change)
                if (now - stats.mtimeMs < ONE_HOUR) {
                    continue;
                }

                if (!dryRun) {
                    fs.unlinkSync(filePath);
                    reclaimedBytes += stats.size;
                    deletedCount++;
                } else {
                    log(`[Dry Run] Would delete: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
                }
            } catch (err) {
                console.error(`Error processing file ${file}:`, err);
            }
        }

        if (deletedCount > 0 || dryRun) {
            const reclaimedMB = (reclaimedBytes / (1024 * 1024)).toFixed(2);
            log(`Avatar cleanup complete. Deleted ${deletedCount} orphaned files. Reclaimed ${reclaimedMB} MB.`);
        } else {
            log("Avatar cleanup complete. No orphaned files found to delete.");
        }

    } catch (error) {
        console.error("Error during avatar cleanup:", error);
    }
}

export function startCleanupSchedule() {
    log("Initializing avatar cleanup schedule...");

    // Run once shortly after startup (e.g., 5 minutes) to clean up old junk
    setTimeout(() => {
        cleanupAvatars().catch(err => console.error("Initial cleanup failed:", err));
    }, 5 * 60 * 1000);

    // Schedule every 24 hours
    setInterval(() => {
        cleanupAvatars().catch(err => console.error("Scheduled cleanup failed:", err));
    }, 24 * 60 * 60 * 1000);
}
