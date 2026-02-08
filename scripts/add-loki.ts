import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');

// Convert view links to preview links
function toPreviewUrl(viewUrl: string): string {
  const match = viewUrl.match(/\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return viewUrl;
}

const showId = randomUUID();

const show = {
  id: showId,
  title: "Loki",
  slug: "loki",
  description: "After stealing the Tesseract during the events of \"Avengers: Endgame,\" an alternate version of Loki is brought to the mysterious Time Variance Authority, a bureaucratic organization that exists outside of time and space and monitors the timeline. They give Loki a choice: face being erased from existence due to being a \"time variant\" or help fix the timeline and stop a greater threat.",
  posterUrl: "https://image.tmdb.org/t/p/w500/oJdVHUYrjdS2IqiNztVIP4GPB1p.jpg",
  backdropUrl: "https://image.tmdb.org/t/p/original/N1hWzVPpZ8lIQvQskgdQogxdsc.jpg",
  year: 2021,
  rating: "TV-14",
  imdbRating: "8.2",
  genres: "Drama, Sci-Fi & Fantasy",
  language: "English",
  totalSeasons: 2,
  cast: "Tom Hiddleston, Sophia Di Martino, Owen Wilson, Wunmi Mosaku, Gugu Mbatha-Raw, Ke Huy Quan",
  creators: "Michael Waldron",
  featured: false,
  trending: false,
  category: "sci-fi",
  castDetails: JSON.stringify([
    { name: "Tom Hiddleston", character: "Loki Laufeyson", profileUrl: "https://image.tmdb.org/t/p/w185/mclHxMm8aPlCPKptP67257F5GPo.jpg" },
    { name: "Sophia Di Martino", character: "Sylvie / The Variant", profileUrl: "https://image.tmdb.org/t/p/w185/qZdFp18btpQJfDoknxr7DgfRpcB.jpg" },
    { name: "Owen Wilson", character: "Mobius M. Mobius", profileUrl: "https://image.tmdb.org/t/p/w185/op8sGD20k3EQZLR92XtaHoIbW0o.jpg" },
    { name: "Wunmi Mosaku", character: "Hunter B-15", profileUrl: "https://image.tmdb.org/t/p/w185/yWM19CjCv66MqNkwHBp6Dpvtn9x.jpg" },
    { name: "Gugu Mbatha-Raw", character: "Judge Ravonna Renslayer", profileUrl: "https://image.tmdb.org/t/p/w185/sHAnv0kw5JHzWBOP7gAezwqgl8J.jpg" },
    { name: "Ke Huy Quan", character: "Ouroboros 'OB'", profileUrl: "https://image.tmdb.org/t/p/w185/iestHyn7PLuVowj5Jaa1SGPboQ4.jpg" },
    { name: "Eugene Cordero", character: "Casey / Hunter K-5E", profileUrl: "https://image.tmdb.org/t/p/w185/waruLSR8lXBjhAFL0J6ihuVY62d.jpg" },
    { name: "Tara Strong", character: "Miss Minutes (voice)", profileUrl: "https://image.tmdb.org/t/p/w185/8Z86FfWbnUJnyFTcLa9MpVVFhMh.jpg" }
  ])
};

// Season 1 episodes
const s1Episodes = [
  { ep: 1, name: "Glorious Purpose", overview: "After stealing the Tesseract in \"Avengers: Endgame,\" Loki lands before the Time Variance Authority.", still: "/gxh0k3aADsYkt9tgkfm2kGn2qQj.jpg", runtime: 53, url: "https://drive.google.com/file/d/15IPd8bBem9gNc1NuFYAAwc_FJb2yQw-R/view?usp=drive_link" },
  { ep: 2, name: "The Variant", overview: "Mobius puts Loki to work, but not everyone at TVA is thrilled about the God of Mischief's presence.", still: "/gqpcfkdmSsm6xiX2EsLkwUvA8g8.jpg", runtime: 56, url: "https://drive.google.com/file/d/1c86Ew_kEl-8RzhHMAfKkmgUagvEAN99I/view?usp=drive_link" },
  { ep: 3, name: "Lamentis", overview: "Loki finds out The Variant's plans, but he has his own that will forever alter both their destinies.", still: "/aTjfWml9Prd8cUB9cfk8yOAEh7v.jpg", runtime: 44, url: "https://drive.google.com/file/d/1cnm-0uU8kB4-1tTeDUKhT6fp-jeGUY6h/view?usp=drive_link" },
  { ep: 4, name: "The Nexus Event", overview: "Frayed nerves and paranoia infiltrate the TVA as Mobius and Hunter B-15 search for Loki and Sylvie.", still: "/niIXLqEr98mnQuYuMuEvq9Y6OQa.jpg", runtime: 50, url: "https://drive.google.com/file/d/1tybo5SWNNPdtpcOEOub9jAI_4JCYjgRQ/view?usp=drive_link" },
  { ep: 5, name: "Journey Into Mystery", overview: "Loki tries to escape The Void, a desolate purgatory where he meets variant versions of himself.", still: "/5fRAAO13URmteku8mb39V9YPJBb.jpg", runtime: 51, url: "https://drive.google.com/file/d/1-pK24WksPQTePv2E6KQaTwgmNwY2Brpc/view?usp=drive_link" },
  { ep: 6, name: "For All Time. Always.", overview: "The clock is ticking in the season finale which finds Loki and Sylvie on a date with destiny.", still: "/98hGgYbNFP8GnZhJzAar22bWIAT.jpg", runtime: 48, url: "https://drive.google.com/file/d/1rnbi0mFku3eLcZNFgSbA2q5wTjEJCb40/view?usp=drive_link" }
];

// Season 2 episodes
const s2Episodes = [
  { ep: 1, name: "Ouroboros", overview: "Loki finds himself lost to time and torn, quite literally, between past, present and future.", still: "/aIJvoQAal0TDDIl5plfKfSnAish.jpg", runtime: 48, url: "https://drive.google.com/file/d/1rAF7CQzr50fzYbEy0fUu6ufmBKWxMwvv/view?usp=drive_link" },
  { ep: 2, name: "Breaking Brad", overview: "With the TVA on the verge of a temporal meltdown, Loki & Mobius will stop at nothing to find Sylvie.", still: "/cNyNfCWMdLpTXquuGzUvZwhBaVJ.jpg", runtime: 52, url: "https://drive.google.com/file/d/1mxINNYZDTl0WUHCXgafMFpmdYF-fjGYT/view?usp=drive_link" },
  { ep: 3, name: "1893", overview: "Loki & Mobius go on the hunt to find everyone's favorite cartoon clock as they try to save the TVA.", still: "/1LWyxNX7B5TWfJUB6gw3UFPZOF2.jpg", runtime: 56, url: "https://drive.google.com/file/d/1qWaW8_dAmyrsSYvemwgtWT012CHcHKty/view?usp=drive_link" },
  { ep: 4, name: "Heart of the TVA", overview: "The TVA's Loom nears catastrophic failure but Loki, Mobius and Sylvie have a He Who Remains variant.", still: "/3NUiKf3CEoZtXB4EaBPOHVEPUxR.jpg", runtime: 51, url: "https://drive.google.com/file/d/1dewsy5dkM5XMw2iKcgiei-W_K4ydqDDB/view?usp=drive_link" },
  { ep: 5, name: "Science/Fiction", overview: "Loki traverses dying timelines in an attempt to find his friends, but Reality is not what it seems.", still: "/ygWEp4FRGPx5VDpOCcWMQzgqEf7.jpg", runtime: 47, url: "https://drive.google.com/file/d/1gyhg13EafJhWf6oJUQKJGh4whzJ4mh-I/view?usp=drive_link" },
  { ep: 6, name: "Glorious Purpose", overview: "Loki learns the true nature of 'glorious purpose' as he rectifies the past.", still: "/rd64rjCOPoFSYpRlc2wOQXnSoUP.jpg", runtime: 59, url: "https://drive.google.com/file/d/1T8IlZ2VMANPSyyD1PBSowAn4lc7HgBXb/view?usp=drive_link" }
];

const episodes = [
  ...s1Episodes.map(e => ({
    id: randomUUID(),
    showId,
    season: 1,
    episodeNumber: e.ep,
    title: e.name,
    description: e.overview,
    thumbnailUrl: `https://image.tmdb.org/t/p/w500${e.still}`,
    duration: e.runtime,
    googleDriveUrl: toPreviewUrl(e.url)
  })),
  ...s2Episodes.map(e => ({
    id: randomUUID(),
    showId,
    season: 2,
    episodeNumber: e.ep,
    title: e.name,
    description: e.overview,
    thumbnailUrl: `https://image.tmdb.org/t/p/w500${e.still}`,
    duration: e.runtime,
    googleDriveUrl: toPreviewUrl(e.url)
  }))
];

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Check if show already exists
const exists = data.shows.some((s: any) => s.slug === show.slug);
if (exists) {
  console.log('Show already exists!');
  process.exit(0);
}

data.shows.push(show);
data.episodes.push(...episodes);

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('✅ Added Loki show with', episodes.length, 'episodes!');
console.log('Show ID:', showId);
