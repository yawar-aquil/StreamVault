import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');

const movie = {
  id: randomUUID(),
  title: "Superman",
  slug: "superman-2025",
  description: "Superman, a journalist in Metropolis, embarks on a journey to reconcile his Kryptonian heritage with his human upbringing as Clark Kent.",
  posterUrl: "https://image.tmdb.org/t/p/w500/ldyfo0BKmz5rWtJJKCvwaNS4cJT.jpg",
  backdropUrl: "https://image.tmdb.org/t/p/original/yRBc6WY3r1Fz5Cjd6DhSvzqunED.jpg",
  year: 2025,
  rating: "PG-13",
  imdbRating: "7.4",
  genres: "Science Fiction, Adventure, Action",
  language: "English",
  duration: 130,
  cast: "David Corenswet, Rachel Brosnahan, Nicholas Hoult, Edi Gathegi, Nathan Fillion, Isabela Merced",
  directors: "James Gunn",
  googleDriveUrl: "https://drive.google.com/file/d/1WfDeRc-vbdPOgsFObUzPi8AmO1aM0M9c/preview",
  featured: true,
  trending: true,
  category: "action",
  castDetails: JSON.stringify([
    { name: "David Corenswet", character: "Superman", profileUrl: "https://image.tmdb.org/t/p/w185/qB0hBMu4wU1nPrqtdUQP3sQeN5t.jpg" },
    { name: "Rachel Brosnahan", character: "Lois Lane", profileUrl: "https://image.tmdb.org/t/p/w185/fgqhKKmHko115dbfHKWHmC83814.jpg" },
    { name: "Nicholas Hoult", character: "Lex Luthor", profileUrl: "https://image.tmdb.org/t/p/w185/laeAYQVBV9U3DkJ1B4Cn1XhpT8P.jpg" },
    { name: "Edi Gathegi", character: "Mr. Terrific", profileUrl: "https://image.tmdb.org/t/p/w185/dt8yMyycDlzxkjhmuuJJ4tXDbp4.jpg" },
    { name: "Nathan Fillion", character: "Guy Gardner", profileUrl: "https://image.tmdb.org/t/p/w185/q31mXXgnN5PsuIjEqaaAPvBDvHc.jpg" },
    { name: "Isabela Merced", character: "Hawkgirl", profileUrl: "https://image.tmdb.org/t/p/w185/7O5GWIH8IHwU4kGZIhC3JkGDiZr.jpg" },
    { name: "María Gabriela de Faría", character: "The Engineer", profileUrl: "https://image.tmdb.org/t/p/w185/joKXt8ai99udROK7VEFCDsBEm3Y.jpg" },
    { name: "Skyler Gisondo", character: "Jimmy Olsen", profileUrl: "https://image.tmdb.org/t/p/w185/vyalCuJUUP7Ht1vMWZQzhOrscXV.jpg" },
    { name: "Alan Tudyk", character: "Gary", profileUrl: "https://image.tmdb.org/t/p/w185/jUuUbPuMGonFT5E2pcs4alfqaCN.jpg" },
    { name: "Grace Chan", character: "Superman Robot #12 (voice)", profileUrl: "https://image.tmdb.org/t/p/w185/vs6aMdkXkR8A0sOCXK6AGIrVeHb.jpg" }
  ])
};

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Check if already exists
const exists = data.movies.some((m: any) => m.slug === movie.slug);
if (exists) {
  console.log('Movie already exists!');
  process.exit(0);
}

data.movies.push(movie);
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('✅ Added Superman (2025) to movies!');
console.log('ID:', movie.id);
