
import { storage } from "../server/storage";
import { logAndBroadcastActivity } from "../server/social";

async function testPersistence() {
    console.log("1. Starting Persistence Test...");

    // 1. Create a mock user if needed (omitted for brevity, assuming existing users or using separate logic)
    // We'll just use a random ID for now, or fetch the first user.
    // However, storage needs users loaded.

    // Force load data (storage loads on import usually, but valid to check)
    // Accessing private activities map via any cast if needed, or just use public methods.

    const users = await storage.getUserByUsername("admin"); // or just pick one
    const userId = "test-user-id-" + Date.now();

    console.log(`2. Logging 'coin_purchase' activity for user ${userId}...`);

    // Simulate coin purchase logging
    await logAndBroadcastActivity({
        userId: userId,
        type: 'coin_purchase',
        entityId: 'test-trans-id',
        entityType: 'transaction',
        metadata: JSON.stringify({
            amount: 500,
            cost: '$4.99'
        })
    });

    console.log("3. Activity logged. Checking in-memory Activities...");
    const activities = await storage.getActivities(100, 'all');
    const myActivity = activities.find(a => a.userId === userId && a.type === 'coin_purchase');

    if (myActivity) {
        console.log("✅ Activity found in memory:", myActivity);
    } else {
        console.error("❌ Activity NOT found in memory!");
    }

    // 4. Check file persistence
    // We can't easily "restart" the server process from here, but we can check if data/activities.json exists and contains our ID.
    const fs = await import('fs');
    const path = await import('path');
    const dataPath = "c:\\Users\\yawar\\Documents\\StreamVault\\data\\data.json";
    // Wait, I edited saveData to put it in the MAIN data.json. 
    // And I edited loadData to read from MAIN data.json.
    // So I shoud check data/data.json.

    console.log(`4. Checking ${dataPath} for persistence...`);

    if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const json = JSON.parse(fileContent);

        if (json.activities && Array.isArray(json.activities)) {
            const persisted = json.activities.find((a: any) => a.userId === userId);
            if (persisted) {
                console.log("✅ Activity found in data.json:", persisted);
            } else {
                console.error("❌ Activity NOT found in data.json! (Save might be throttled or failed)");
            }
        } else {
            console.error("❌ 'activities' key missing or invalid in data.json");
        }
    } else {
        console.error("❌ data.json does not exist!");
    }
}

testPersistence().catch(console.error);
