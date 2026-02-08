import { storage } from "../server/storage.js";

async function addJohnWick() {
  console.log('🎬 Adding John Wick...\n');

  const movie = await storage.createMovie({
    title: "John Wick",
    slug: "john-wick",
    description: "An ex-hit-man comes out of retirement to track down the gangsters that killed his dog and took everything from him.",
    posterUrl: "https://image.tmdb.org/t/p/original/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/umC04Cozevu8nn3JTDJ1pc7PVTn.jpg",
    year: 2014,
    rating: "R",
    imdbRating: "7.4",
    genres: "Action, Thriller",
    language: "English",
    duration: 101,
    cast: "Keanu Reeves, Michael Nyqvist, Alfie Allen, Willem Dafoe, Dean Winters",
    directors: "Chad Stahelski",
    googleDriveUrl: "https://drive.google.com/file/d/1rINEy-LaGUDXAodLSI240wV7nTL9O_bU/preview",
    featured: true,
    trending: true,
    category: "action",
  });

  console.log('✅ John Wick added successfully!');
  console.log(`   ID: ${movie.id}`);
  console.log(`   Slug: ${movie.slug}`);
  console.log(`   URL: http://localhost:5000/movie/${movie.slug}\n`);
}

addJohnWick();
