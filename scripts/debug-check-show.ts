
import { readFileSync } from 'fs';
import { join } from 'path';

const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');

try {
    console.log('Reading database...');
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    console.log(`Loaded ${data.shows?.length} shows.`);

    const st = data.shows?.find((s: any) => s.title === 'Stranger Things' || s.title.toLowerCase().includes('stranger things'));

    if (st) {
        console.log('✅ Found Stranger Things!');
        console.log('ID:', st.id);
        console.log('Title:', st.title);
        console.log('Slug:', st.slug);
        console.log('Type:', 'show');
    } else {
        console.log('❌ Stranger Things NOT FOUND in shows.');
    }

    const movie = data.movies?.find((m: any) => m.title === 'Stranger Things' || m.title.toLowerCase().includes('stranger things'));
    if (movie) {
        console.log('✅ Found Stranger Things as Movie!');
        console.log('ID:', movie.id);
    }

} catch (e) {
    console.error('Error reading DB:', e);
}
