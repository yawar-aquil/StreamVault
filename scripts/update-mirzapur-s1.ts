import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'streamvault-data.json');

// Extract file ID from Google Drive URL
function extractFileId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

// New episode links for Mirzapur Season 1
const episodeLinks: Record<number, string> = {
  1: 'https://drive.google.com/file/d/14lXDWx6_ty7HrA47ZN5VILcrXHWifkgq/view?usp=drive_link',
  4: 'https://drive.google.com/file/d/1UKUKJE0-BxbIH12wWURokoG57lWAln_F/view?usp=drive_link',
  5: 'https://drive.google.com/file/d/1c8rR67CsuzT8m16Y6IpxxpEwAJTptSRs/view?usp=drive_link',
  6: 'https://drive.google.com/file/d/1B5C2z-Aj1hXwqzfFvtj8uT-14rkzreV6/view?usp=drive_link',
  7: 'https://drive.google.com/file/d/1h31TUDLSlLtbMtfpN0M0aCwhQqMED2MI/view?usp=drive_link',
  8: 'https://drive.google.com/file/d/1PyWNJajYA-WWkX9bJoSILSKVPT7-gtxT/view?usp=drive_link',
  9: 'https://drive.google.com/file/d/1oCUD9Yca-hYfqqa9xdOvI0WL4VN3Nak-/view?usp=drive_link',
};

async function updateMirzapurS1() {
  console.log('Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  // Find Mirzapur show
  const mirzapur = data.shows.find((s: any) => 
    s.title.toLowerCase().includes('mirzapur')
  );

  if (!mirzapur) {
    console.error('Mirzapur show not found!');
    return;
  }

  console.log(`Found Mirzapur: ${mirzapur.title} (ID: ${mirzapur.id})`);

  // Update episodes
  let updatedCount = 0;
  for (const episode of data.episodes) {
    if (episode.showId === mirzapur.id && episode.season === 1) {
      const epNum = episode.episodeNumber;
      if (episodeLinks[epNum]) {
        const fileId = extractFileId(episodeLinks[epNum]);
        console.log(`Updating S1E${epNum}: ${episode.title} -> ${fileId}`);
        episode.googleDriveUrl = fileId;
        updatedCount++;
      }
    }
  }

  console.log(`\nUpdated ${updatedCount} episodes`);

  // Save data
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('Data saved successfully!');
}

updateMirzapurS1().catch(console.error);
