import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Comment {
  id: string;
  episodeId: string | null;
  movieId: string | null;
  userName: string;
  comment: string;
  createdAt: string;
}

interface Data {
  shows: any[];
  episodes: any[];
  movies: any[];
  comments: Comment[];
  watchlist: any[];
  progress: any[];
  contentRequests: any[];
  issueReports: any[];
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addComment() {
  console.log('💬 Adding comment to Sex Education S1E1...\n');

  const dataPath = join(process.cwd(), 'data', 'streamvault-data.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  const data: Data = JSON.parse(rawData);

  const episodeId = '24f61c62-f6b0-4743-9db8-9744d9dc64aa'; // Sex Education S1E1

  // Create comment with timestamp from about 7 hours ago
  const sevenHoursAgo = new Date();
  sevenHoursAgo.setHours(sevenHoursAgo.getHours() - 7);

  const newComment: Comment = {
    id: generateId(),
    episodeId: episodeId,
    movieId: null,
    userName: 'SEXYYGIRL💋💋',
    comment: 'Knowledge is safety 😊...must watch!!',
    createdAt: sevenHoursAgo.toISOString()
  };

  data.comments.push(newComment);

  console.log('✅ Comment added:');
  console.log(`   User: ${newComment.userName}`);
  console.log(`   Comment: ${newComment.comment}`);
  console.log(`   Episode ID: ${newComment.episodeId}`);
  console.log(`   Posted: ${new Date(newComment.createdAt).toLocaleString()}`);

  // Save updated data
  console.log('\n💾 Saving data...');
  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ Comment added successfully!');
  console.log(`\n📊 Total comments in database: ${data.comments.length}`);
}

addComment();
