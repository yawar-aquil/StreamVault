#!/usr/bin/env node

/**
 * Migration Script: Add createdAt/updatedAt to existing movies and shows
 * Uses blog post createdAt as reference (since blogs were created when content was added)
 * Falls back to year-based estimation for content without blog posts
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

console.log('📅 Adding createdAt/updatedAt to existing content...\n');

// Load data
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Build a map of contentId -> blog createdAt
const blogDateMap = new Map();
for (const blog of data.blogPosts || []) {
    if (blog.contentId && blog.createdAt) {
        blogDateMap.set(blog.contentId, blog.createdAt);
    }
}

console.log(`📝 Found ${blogDateMap.size} blog posts with createdAt dates\n`);

let showsUpdated = 0;
let moviesUpdated = 0;
let showsFromBlog = 0;
let moviesFromBlog = 0;

// Default fallback date
const fallbackDate = '2024-01-01T00:00:00.000Z';

// Add createdAt to shows
for (const show of data.shows || []) {
    if (!show.createdAt) {
        // Try to get date from blog post
        if (blogDateMap.has(show.id)) {
            show.createdAt = blogDateMap.get(show.id);
            show.updatedAt = blogDateMap.get(show.id);
            showsFromBlog++;
        } else {
            // Use year-based fallback
            const yearDate = show.year ? `${show.year}-06-01T00:00:00.000Z` : fallbackDate;
            show.createdAt = yearDate;
            show.updatedAt = yearDate;
        }
        showsUpdated++;
    }
}

// Add createdAt to movies
for (const movie of data.movies || []) {
    if (!movie.createdAt) {
        // Try to get date from blog post
        if (blogDateMap.has(movie.id)) {
            movie.createdAt = blogDateMap.get(movie.id);
            movie.updatedAt = blogDateMap.get(movie.id);
            moviesFromBlog++;
        } else {
            // Use year-based fallback
            const yearDate = movie.year ? `${movie.year}-06-01T00:00:00.000Z` : fallbackDate;
            movie.createdAt = yearDate;
            movie.updatedAt = yearDate;
        }
        moviesUpdated++;
    }
}

// Save updated data
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

console.log(`✅ Updated ${showsUpdated} shows (${showsFromBlog} from blog dates)`);
console.log(`✅ Updated ${moviesUpdated} movies (${moviesFromBlog} from blog dates)`);
console.log('\n📝 Note:');
console.log('   - Content with blog posts uses blog createdAt date');
console.log('   - Content without blogs uses release year as estimate');
console.log('   - New content added via scripts will have current date');
console.log('   - Adding episodes will update the show\'s updatedAt');
