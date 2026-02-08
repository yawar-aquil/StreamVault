
import fs from 'fs';
import path from 'path';

const content = fs.readFileSync(path.join(process.cwd(), 'server', 'routes.ts'), 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('/api/messages') || line.includes('markMessagesAsRead')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
