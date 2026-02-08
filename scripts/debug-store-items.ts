
import { storage } from "../server/storage";

async function main() {
    try {
        const badges = await storage.getBadges();
        const forSale = badges.filter(b => b.isForSale);

        console.log("--- Items For Sale ---");
        if (forSale.length === 0) {
            console.log("No items are currently marked isForSale: true");
        } else {
            forSale.forEach(b => {
                console.log(`- [${b.category}] ${b.name} (Price: ${b.price})`);
            });
        }

        console.log("\n--- All Categories Found in DB ---");
        const categories = new Set(badges.map(b => b.category));
        console.log(Array.from(categories));

        console.log("\n--- Sample Badge Categories ---");
        badges.slice(0, 5).forEach(b => {
            console.log(`- ${b.name}: ${b.category} (For Sale: ${b.isForSale})`);
        });

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

main().catch(console.error);
