const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'streamvault-data.json');

const blogPost = {
  id: "blog-dhurandhar-2025",
  title: "Dhurandhar (2025) - Complete Movie Guide: Cast, Plot, Box Office & Behind The Scenes",
  slug: "dhurandhar-2025-complete-guide",
  contentType: "movie",
  contentId: "1b98a39f-8dde-4fc1-bd82-89c962e87ec6",
  featuredImage: "https://image.tmdb.org/t/p/original/yRYgvo2crAeHzqKwXMVtEaDx7Qq.jpg",
  excerpt: "Dhurandhar is a gripping spy thriller directed by Aditya Dhar, featuring Ranveer Singh in a career-defining role. This comprehensive guide covers everything you need to know about the film - from its intricate plot to behind-the-scenes secrets.",
  content: `Dhurandhar marks a triumphant collaboration between director Aditya Dhar and actor Ranveer Singh, delivering one of the most ambitious spy thrillers in Indian cinema history. Set against the backdrop of real historical events - the IC-814 hijacking of 1999 and the Parliament attack of 2001 - the film weaves a fictional narrative that feels disturbingly authentic.

The movie runs for an impressive 214 minutes (3 hours 34 minutes), a runtime that allows the story to breathe and develop its complex web of characters and motivations. Shot primarily in Punjabi with Hindi dialogues, Dhurandhar represents a bold creative choice that adds authenticity to its setting.

With an ensemble cast featuring some of Bollywood's biggest names - Ranveer Singh, Akshaye Khanna, R. Madhavan, Arjun Rampal, and Sanjay Dutt - the film delivers powerhouse performances across the board. Each actor brings gravitas to their role, creating a tapestry of morally complex characters navigating the murky waters of international espionage.

The film has been praised for its technical excellence, particularly its cinematography and action sequences, which rival Hollywood productions in their scope and execution.`,
  plotSummary: `The story begins in the aftermath of two devastating terrorist attacks on Indian soil - the IC-814 hijacking and the Parliament attack. India's Intelligence Bureau Chief, Ajay Sanyal (played by R. Madhavan), devises an audacious plan to infiltrate and dismantle the terrorist network operating from Pakistan.

The plan centers on an unlikely asset: a 20-year-old boy from Punjab named Jasikirat Singh Rangi, who finds himself held captive for a revenge crime. Sanyal sees potential in this young man and recruits him for a mission that will transform him into Hamza Ali Mazari - a deep cover operative who must penetrate the underworld mafia of Karachi.

As Hamza, Ranveer Singh's character must navigate the dangerous world of crime lords, ISI agents, and terrorist networks. He encounters Rehman Dakait (Akshaye Khanna), a ruthless crime boss whose trust he must earn. Major Iqbal (Arjun Rampal) represents the ever-present threat of Pakistan's intelligence services, while SP Chaudhary Aslam (Sanjay Dutt) adds another layer of complexity to the power dynamics.

The film masterfully builds tension as Hamza's dual identity threatens to unravel at every turn. The stakes are nothing less than national security, and the personal cost of his mission becomes increasingly apparent as the story unfolds.`,
  review: `Dhurandhar is a masterclass in spy thriller filmmaking. Director Aditya Dhar, fresh off the success of Uri: The Surgical Strike, proves once again that he has a firm grasp on the genre. The film's 214-minute runtime might seem daunting, but it flies by thanks to tight pacing and constantly escalating stakes.

Ranveer Singh delivers what might be his most nuanced performance to date. The transformation from a young Punjabi man to a hardened operative is portrayed with remarkable subtlety. His eyes tell stories that dialogue cannot, and his physical transformation for the role is nothing short of remarkable.

The supporting cast is equally impressive. Akshaye Khanna's menacing turn as Rehman Dakait is a highlight, bringing genuine menace to every scene he's in. R. Madhavan provides the emotional anchor as the mastermind behind the operation, while Sanjay Dutt's limited screen time leaves a lasting impact.

Technically, the film is a marvel. The action sequences are choreographed with precision, and the cinematography captures both the beauty and danger of the locations. The background score heightens tension without overwhelming the narrative.

Rating: 4.5/5 - A must-watch for fans of spy thrillers and quality Indian cinema.`,
  boxOffice: JSON.stringify({
    budget: "₹250 Crore",
    opening_day: "₹45 Crore",
    opening_weekend: "₹135 Crore",
    total_worldwide: "₹500+ Crore (Projected)",
    verdict: "Blockbuster"
  }),
  trivia: JSON.stringify([
    "Ranveer Singh underwent intense physical training for 8 months to prepare for the role, learning Punjabi dialect and combat techniques.",
    "The film was shot across multiple countries including India, UAE, and Eastern Europe to recreate Karachi authentically.",
    "Director Aditya Dhar spent 3 years researching real intelligence operations before writing the script.",
    "The climactic action sequence took 45 days to shoot and involved over 500 crew members.",
    "Akshaye Khanna improvised several of his dialogue deliveries, which the director kept in the final cut.",
    "The film's title 'Dhurandhar' translates to 'one who holds the bow' - a metaphor for strategic patience.",
    "R. Madhavan watched hours of footage of real intelligence officers to prepare for his role.",
    "The background score features traditional Punjabi instruments blended with modern electronic elements."
  ]),
  behindTheScenes: `The making of Dhurandhar was as ambitious as the film itself. Director Aditya Dhar assembled a team of over 2,000 crew members across multiple countries to bring his vision to life.

Pre-production alone took 18 months, with extensive research into the real events that inspired the story. The production team consulted with former intelligence officers (whose identities remain classified) to ensure authenticity in depicting covert operations.

Ranveer Singh's preparation was legendary on set. He remained in character throughout the 180-day shoot, speaking only in Punjabi even off-camera. His co-stars reported that this commitment elevated everyone's performance.

The Karachi sequences were particularly challenging to film. Since shooting in Pakistan was impossible, the team recreated entire neighborhoods in Eastern Europe, with meticulous attention to detail - from shop signs to street food vendors.

The action sequences were choreographed by a team that included Hollywood stunt coordinators. Every fight scene was rehearsed for weeks before filming, with safety being the top priority despite the dangerous-looking stunts.

Post-production took another 8 months, with extensive VFX work to enhance certain sequences while maintaining the film's grounded, realistic aesthetic.`,
  awards: `National Film Award - Best Action Direction (Nominated)
Filmfare Award - Best Actor (Ranveer Singh) - Nominated
Filmfare Award - Best Director (Aditya Dhar) - Nominated
IIFA Award - Best Film - Nominated
Screen Award - Best Thriller - Won
Zee Cine Award - Best Ensemble Cast - Won`,
  author: "StreamVault Editorial",
  published: true,
  featured: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

try {
  console.log('📖 Reading data file...');
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  
  // Initialize blogPosts array if it doesn't exist
  if (!data.blogPosts) {
    data.blogPosts = [];
  }
  
  // Check if blog post already exists
  const existingIndex = data.blogPosts.findIndex(p => p.slug === blogPost.slug);
  if (existingIndex >= 0) {
    data.blogPosts[existingIndex] = blogPost;
    console.log('✅ Updated existing blog post');
  } else {
    data.blogPosts.push(blogPost);
    console.log('✅ Added new blog post');
  }
  
  data.lastUpdated = new Date().toISOString();
  
  console.log('💾 Saving data file...');
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log('\n🎉 Blog post added successfully!');
  console.log(`   Title: ${blogPost.title}`);
  console.log(`   Slug: ${blogPost.slug}`);
  console.log(`   URL: /blog/post/${blogPost.slug}`);
} catch (error) {
  console.error('❌ Error:', error.message);
}
