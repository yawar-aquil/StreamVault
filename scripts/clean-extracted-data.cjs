const fs = require('fs');
const path = require('path');

const EXTRACTED_FILE = path.join(__dirname, '..', 'english-seasons_non_drive_category.json');
const COMPARISON_FILE = path.join(__dirname, '..', 'show_comparison_results.json');

console.log('🗑️  Removing Already Added Shows from Extracted Data');
console.log('='.repeat(80));

// Load files
const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));
const comparisonData = JSON.parse(fs.readFileSync(COMPARISON_FILE, 'utf-8'));

console.log(`\n📊 Current extracted data: ${Object.keys(extractedData).length} shows`);

// Get list of ONLY the 11 new shows that were just added
const showsToRemove = comparisonData.new_shows; // Only the 11 new shows

console.log(`\n🗑️  Removing ${showsToRemove.length} NEW shows that were just added:\n`);

// Remove shows
let removedCount = 0;
for (const showName of showsToRemove) {
    if (extractedData[showName]) {
        delete extractedData[showName];
        removedCount++;
        console.log(`   ✓ Removed: ${showName}`);
    }
}

// Save cleaned data
fs.writeFileSync(EXTRACTED_FILE, JSON.stringify(extractedData, null, 2));

console.log(`\n✅ COMPLETED!`);
console.log(`   Shows removed: ${removedCount}`);
console.log(`   Shows remaining: ${Object.keys(extractedData).length}`);
console.log(`\n💾 Updated: english-seasons_non_drive_category.json`);
