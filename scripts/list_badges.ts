
import * as fs from 'fs';
import * as path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'streamvault-data.json');

try {
    if (fs.existsSync(dataPath)) {
        console.log(`Reading ${dataPath}...`);
        const content = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(content);

        if (data.badges) {
            console.log('Found badges:');
            data.badges.forEach((b: any) => console.log(`- ${b.name} (ID: ${b.id}, Category: ${b.category})`));
        } else {
            console.log('No badges array found in data.');
        }
    }
} catch (error) {
    console.error('Error processing file:', error);
}
