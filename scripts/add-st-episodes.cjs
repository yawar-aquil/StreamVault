const fs = require('fs');

// Read the data
const data = JSON.parse(fs.readFileSync('./data/streamvault-data.json', 'utf8'));

const showId = '3a8ff251-ed95-41a9-9cac-8246ab2e59d5';

// Find index of episode 4 in season 5
const ep4Index = data.episodes.findIndex(e =>
    e.showId === showId && e.season === 5 && e.episodeNumber === 4
);

if (ep4Index === -1) {
    console.log('Episode 4 not found!');
    process.exit(1);
}

console.log('Found episode 4 at index:', ep4Index);

// New episodes to add
const newEpisodes = [
    {
        id: 'c5e71a9f-3b2d-4f8a-9c1e-5d6f7a8b9c0d',
        showId: showId,
        season: 5,
        episodeNumber: 5,
        title: 'Chapter Five: Shock Jock',
        description: "With Vecna's forces closing in, the gang must regroup and form a new plan. Hopper and Joyce face a difficult choice while the kids discover an unexpected ally.",
        thumbnailUrl: 'https://image.tmdb.org/t/p/w500/jnpSxSMdFAj4dtF59agzgmKM9fg.jpg',
        googleDriveUrl: '125Xr-hWsL0eN_GMv4UAGDbqL5qbG-rq_',
        videoUrl: null,
        airDate: '2025-11-26',
        duration: 65
    },
    {
        id: 'd6f82b0a-4c3e-5a9b-0d2f-6e7a8a9b0c1e',
        showId: showId,
        season: 5,
        episodeNumber: 6,
        title: 'Chapter Six: Escape from Hawkins',
        description: "The group races against time to escape Hawkins as Vecna's power grows. El makes a sacrifice that changes everything. The military closes in.",
        thumbnailUrl: 'https://image.tmdb.org/t/p/w500/dI8N4IQpZNKloK4Dw6MugpSrwMS.jpg',
        googleDriveUrl: '1lLTQhbaUl47zd3h7QZJVzkJnBY5a5I6_',
        videoUrl: null,
        airDate: '2025-11-26',
        duration: 70
    },
    {
        id: 'e7a93c1b-5d4f-6a0c-1e3a-7f8a9b0c2d3f',
        showId: showId,
        season: 5,
        episodeNumber: 7,
        title: 'Chapter Seven: The Battle of Starcourt',
        description: "The final battle begins as all the heroes unite to face Vecna. Sacrifices are made, alliances are tested, and the fate of Hawkins hangs in the balance.",
        thumbnailUrl: 'https://image.tmdb.org/t/p/w500/vBLzxoyZTbT0ImHXKWG2fe7j2om.jpg',
        googleDriveUrl: '1uoBtc2iJMnEiCjKidiwgoG0ppF0wOYUR',
        videoUrl: null,
        airDate: '2025-11-26',
        duration: 75
    }
];

// Insert after episode 4
data.episodes.splice(ep4Index + 1, 0, ...newEpisodes);

// Update the show's updatedAt timestamp so it appears in newsletter
const showIndex = data.shows.findIndex(s => s.id === showId);
if (showIndex !== -1) {
    data.shows[showIndex].updatedAt = new Date().toISOString();
    console.log('Updated show updatedAt timestamp');
}

fs.writeFileSync('./data/streamvault-data.json', JSON.stringify(data, null, 2));
console.log('Added 3 episodes successfully!');
console.log('New episodes at indexes:', ep4Index + 1, ep4Index + 2, ep4Index + 3);
