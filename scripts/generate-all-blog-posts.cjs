const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

// Generate detailed blog content for a movie/show
function generateBlogContent(item, type) {
  const isMovie = type === 'movie';
  const title = item.title;
  const year = item.year;
  const genres = item.genres || '';
  const cast = item.cast || '';
  const directors = item.directors || item.creators || '';
  const description = item.description || '';
  const language = item.language || 'English';
  const rating = item.rating || 'NR';
  const imdbRating = item.imdbRating || 'N/A';
  const duration = item.duration || 0;

  const slug = `${item.slug}-${year}-complete-guide`;

  const excerpt = `${title} (${year}) is a ${genres.split(',')[0]?.trim() || 'captivating'} ${isMovie ? 'movie' : 'TV series'} that has captured audiences worldwide. This comprehensive guide covers everything you need to know - from plot details to behind-the-scenes insights.`;

  const content = `${title} stands as one of the most ${genres.includes('Action') ? 'thrilling' : genres.includes('Drama') ? 'emotionally compelling' : genres.includes('Comedy') ? 'entertaining' : 'captivating'} ${isMovie ? 'films' : 'series'} of ${year}. ${isMovie ? `With a runtime that allows the story to fully develop, this ${genres.split(',')[0]?.trim()?.toLowerCase() || ''} masterpiece` : `Spanning multiple episodes, this ${genres.split(',')[0]?.trim()?.toLowerCase() || ''} series`} delivers an unforgettable viewing experience.

${description}

The ${isMovie ? 'film' : 'show'} features an impressive ensemble cast including ${cast || 'talented performers'}, each bringing depth and authenticity to their roles. ${directors ? `Under the direction of ${directors}, the production achieves a perfect balance of storytelling and visual spectacle.` : ''}

Available in ${language}, ${title} has garnered critical acclaim${imdbRating !== 'N/A' ? ` with an IMDb rating of ${imdbRating}/10` : ''}, cementing its place as a must-watch ${isMovie ? 'film' : 'series'} for fans of ${genres || 'quality entertainment'}.`;

  const plotSummary = `${title} takes viewers on an extraordinary journey through its ${genres.includes('Action') ? 'action-packed' : genres.includes('Drama') ? 'emotionally rich' : genres.includes('Thriller') ? 'suspenseful' : 'compelling'} narrative.

${description}

The story unfolds with masterful pacing, keeping audiences engaged from ${isMovie ? 'the opening scene to the final credits' : 'the first episode to the season finale'}. Each character is carefully developed, with their arcs interweaving to create a rich tapestry of human experience.

${isMovie ? 'The film' : 'The series'} explores themes of ${genres.includes('Romance') ? 'love and relationships' : genres.includes('Action') ? 'courage and perseverance' : genres.includes('Drama') ? 'human connection and growth' : genres.includes('Thriller') ? 'tension and mystery' : 'life and its complexities'}, resonating deeply with viewers across all demographics.`;

  const review = `${title} (${year}) delivers exactly what fans of ${genres || 'quality entertainment'} are looking for. ${directors ? `Director ${directors.split(',')[0]?.trim()} demonstrates` : 'The creative team demonstrates'} a clear vision that translates beautifully to the screen.

The performances are uniformly excellent. ${cast ? cast.split(',').slice(0, 2).join(' and ') : 'The lead actors'} deliver standout performances that anchor the ${isMovie ? 'film' : 'series'} emotionally. The supporting cast provides equally impressive work, creating a fully realized world.

Technically, the production values are top-notch. The cinematography captures both intimate moments and grand spectacles with equal skill. The score complements the visuals perfectly, enhancing the emotional impact of key scenes.

${imdbRating !== 'N/A' ? `With an IMDb rating of ${imdbRating}/10, audience reception has been overwhelmingly positive.` : 'Audience reception has been positive across the board.'}

**Our Rating: ${imdbRating !== 'N/A' ? (parseFloat(imdbRating) >= 8 ? '5/5 - Masterpiece' : parseFloat(imdbRating) >= 7 ? '4/5 - Highly Recommended' : parseFloat(imdbRating) >= 6 ? '3.5/5 - Worth Watching' : '3/5 - Decent') : '4/5 - Recommended'}**`;

  const boxOffice = isMovie && duration > 0 ? JSON.stringify({
    runtime: `${duration} minutes`,
    language: language,
    rating: rating,
    status: "Available for Streaming"
  }) : null;

  const trivia = JSON.stringify([
    `${title} was released in ${year} and quickly became a fan favorite.`,
    `The ${isMovie ? 'film' : 'series'} features ${cast ? cast.split(',').length : 'multiple'} talented actors in key roles.`,
    `${genres ? `It belongs to the ${genres} genre${genres.includes(',') ? 's' : ''}.` : 'It spans multiple genres.'}`,
    `${language !== 'English' ? `Originally produced in ${language}, it has been appreciated by international audiences.` : 'The production showcases Hollywood-level quality.'}`,
    `${imdbRating !== 'N/A' ? `It holds an impressive ${imdbRating} rating on IMDb.` : 'It has received positive reviews from critics and audiences alike.'}`
  ]);

  const behindTheScenes = `The making of ${title} involved a dedicated team of professionals working tirelessly to bring this vision to life.

${directors ? `${directors.split(',')[0]?.trim()} led the creative direction, ensuring every scene captured the intended emotional impact.` : 'The creative team worked collaboratively to achieve the final product.'}

The casting process was meticulous, with ${cast ? cast.split(',')[0]?.trim() : 'the lead actor'} being selected after an extensive search. The chemistry between cast members is evident on screen, a testament to the careful selection process.

Production took place across ${language === 'English' ? 'multiple locations' : `locations authentic to the ${language}-speaking world`}, with attention to detail that brings authenticity to every frame.

Post-production involved extensive work on visual effects, sound design, and editing to create the polished final product that audiences enjoy today.`;

  const awards = imdbRating !== 'N/A' && parseFloat(imdbRating) >= 7.5
    ? `Critically Acclaimed - IMDb ${imdbRating}/10\nAudience Favorite ${year}\nTop Rated ${genres.split(',')[0]?.trim() || ''} ${isMovie ? 'Film' : 'Series'}`
    : null;

  return {
    id: `blog-${item.slug}-${year}`,
    title: `${title} (${year}) - Complete ${isMovie ? 'Movie' : 'Series'} Guide: Cast, Plot & Review`,
    slug,
    contentType: type,
    contentId: item.id,
    featuredImage: item.backdropUrl || item.posterUrl,
    excerpt,
    content,
    plotSummary,
    review,
    boxOffice,
    trivia,
    behindTheScenes,
    awards,
    keywords: JSON.stringify(genres.split(',').map(g => g.trim().toLowerCase()).filter(Boolean)),
    productionCompanies: null,
    externalLinks: null,
    seasonDetails: !isMovie ? JSON.stringify([]) : null,
    author: "StreamVault Editorial",
    published: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

try {
  console.log('📖 Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  // Initialize blogPosts array if it doesn't exist
  if (!data.blogPosts) {
    data.blogPosts = [];
  }

  const existingSlugs = new Set(data.blogPosts.map(p => p.slug));
  let addedCount = 0;
  let skippedCount = 0;

  // Generate blog posts for all movies
  console.log(`\n🎬 Processing ${data.movies?.length || 0} movies...`);
  for (const movie of (data.movies || [])) {
    const blogPost = generateBlogContent(movie, 'movie');

    if (existingSlugs.has(blogPost.slug)) {
      skippedCount++;
      continue;
    }

    data.blogPosts.push(blogPost);
    existingSlugs.add(blogPost.slug);
    addedCount++;
  }

  // Generate blog posts for all shows
  console.log(`📺 Processing ${data.shows?.length || 0} shows...`);
  for (const show of (data.shows || [])) {
    const blogPost = generateBlogContent(show, 'show');

    if (existingSlugs.has(blogPost.slug)) {
      skippedCount++;
      continue;
    }

    data.blogPosts.push(blogPost);
    existingSlugs.add(blogPost.slug);
    addedCount++;
  }

  data.lastUpdated = new Date().toISOString();

  console.log('\n💾 Saving data file...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');

  console.log('\n🎉 Blog posts generation complete!');
  console.log(`   ✅ Added: ${addedCount} new blog posts`);
  console.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
  console.log(`   📊 Total blog posts: ${data.blogPosts.length}`);

} catch (error) {
  console.error('❌ Error:', error.message);
}
