
import { storage } from "../server/storage";

async function update512Metadata() {
  try {
    const badgeId = "badge-512";
    console.log("Updating '512' badge metadata (Simple Version)...");
    
    await storage.updateBadge(badgeId, {
      name: "Stream King",
      description: "You watch everything!",
    });

    console.log("✅ Badge updated to 'Stream King' successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating badge:", error);
    process.exit(1);
  }
}

update512Metadata();
