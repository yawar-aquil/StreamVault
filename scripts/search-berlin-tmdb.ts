import { config } from "dotenv";

config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function searchShow(title: string) {
  const url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  const response = await fetch(url);
  const data = await response.json();
  
  console.log(`\n🔍 Search results for "${title}":\n`);
  
  if (data.results && data.results.length > 0) {
    data.results.slice(0, 5).forEach((show: any, index: number) => {
      console.log(`${index + 1}. ${show.name} (${show.first_air_date?.split('-')[0] || 'N/A'})`);
      console.log(`   ID: ${show.id}`);
      console.log(`   Overview: ${show.overview.substring(0, 100)}...`);
      console.log('');
    });
  } else {
    console.log('No results found.');
  }
}

searchShow('Berlin').catch(console.error);
