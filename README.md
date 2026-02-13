# 🎬 StreamVault - Premium Streaming Platform

A professional Netflix-inspired streaming platform for both TV shows and movies, built with modern web technologies and featuring Google Drive video integration.

![StreamVault](https://img.shields.io/badge/StreamVault-Premium-E50914?style=for-the-badge&logo=netflix)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js)

---

## ✨ Features

### 🎥 **Video Streaming**
- Netflix-style video player with Google Drive integration
- Support for TV shows, movies, **and anime**
- Progress tracking with resume functionality
- Auto-play next episode for shows and anime
- Continue watching section
- Episode selection with season navigation
- Season-level trailers from TMDB

### 💰 **Store & Economy (NEW!)**
- **StreamCoins** - Earn virtual currency through activity, referrals, or purchases
- **Digital Store** - Buy premium badges, animated stickers, and profile frames
- **Gifting System** - Send badges and gifts to friends directly or in chat
- **Wallet** - Track transaction history and coin balance
- **Bulk Gifting** - Send gifts to multiple users at once

### 🛠️ **Admin Dashboard (NEW!)**
- **Analytics** - Visualize user growth, revenue, and content popularity
- **Moderation** - Review and act on user reports for comments/reviews
- **Badge Management** - View user badges directly in moderation panels
- **Content Management** - Add/Edit/Delete shows, movies, and anime
- **System Health** - Monitor server status and database metrics

### 📝 **SEO Blog System**
- Auto-generated blog articles for every show, movie, **and anime**
- Rich content: plot summaries, cast info, trivia, awards
- Production company logos and website backlinks
- External links: IMDb, MAL, Facebook, Twitter, Instagram
- SEO-optimized meta tags and structured data
- Season details with trailers for TV shows and anime

### 🔍 **Advanced SEO**
- Dynamic sitemap for multi-domain support (.live and .in)
- Domain-aware robots.txt
- Canonical tags to prevent duplicate content
- Schema.org structured data (Movie, TVSeries)
- Open Graph and Twitter Card meta tags

### 🎨 **Beautiful UI**
- Netflix-inspired design
- Dark/Light theme support
- Responsive layout (mobile-first)
- Smooth animations and hover effects
- Professional components (shadcn/ui)
- Production company logos with backlinks
- Social media link buttons

### 🔍 **Discovery**
- Advanced search with filters (genre, year range)
- Live search in header with instant results
- Category/genre filtering with anime support
- Separate browse pages for shows, movies, **and anime**
- Trending content sections
- Featured hero carousel with auto-play
- TMDB integration for rich metadata

### 📱 **User Features**
- Unified watchlist for shows and movies
- Viewing progress tracking per episode
- Share functionality for shows and movies
- Comments section on watch pages
- Content request and issue reporting
- Session-based data storage
- Fully mobile responsive

### 🎬 **Watch Together**
- **Real-time co-watching** - Watch shows/movies with friends
- **Video Sync** - Host controls sync play, pause, seek for all viewers
- **Change Episode** - Host can switch episodes without leaving room
- **Live chat** with emojis, GIFs (Tenor API), and file attachments
- **Voice chat** - WebRTC-powered real-time audio communication
- **Floating reactions** - React with emojis visible to all viewers
- **Host controls** - Mute/unmute participants
- **Session persistence** - Reconnect within 2-min grace period if disconnected
- **Mobile landscape mode** - Optimized viewing experience
- **Speaking indicators** - See who's talking in voice chat
- **Room sharing** - Easy room code sharing via link

### 👥 **Social Features**
- **Friend System** - Add friends, view online status, and track what they're watching
- **Direct Messaging** - Real-time private chat with friends
- **Rich Chat** - Send GIFs, emojis, and file attachments
- **Activity Feed** - See your friends' activity directly on the dashboard
- **User Profiles** - Customizable profiles with avatars, social links & favorite content
- **Profile Favorites** - Showcase your favorite shows, movies, and anime on your profile
- **Notifications** - Real-time alerts for friend requests and messages

### ⚙️ **Settings & Preferences**
- **Dedicated Settings Page** - `/settings` for all app preferences
- **Chatbot Toggle** - Enable/disable AI assistant
- **Theme Selection** - Light/Dark/System themes
- **Notification Controls** - Push and email notification toggles
- **Privacy Settings** - Control friend activity visibility
- **Playback Preferences** - Default video quality and autoplay settings

### 🏆 **Gamification & Community**
- **Badge System V2** - Sort by equip date, auto-healing logic, "Stream King" animated badge
- **Leaderboard** - Track top viewers by XP, levels, and watch streaks
- **Daily Challenges** - Earn XP by completing daily and weekly watch tasks
- **Achievements** - Unlock badges for milestones (e.g., "Binge Elite", "Night Owl")
- **Community Polls** - Vote on trending topics and future content additions
- **Reviews & Ratings** - Rate and review content with spoiler tags
- **Release Calendar** - Track upcoming episodes and movie releases

### 🛠️ **Tech Stack**
- **Frontend:** React 18 + TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **Backend:** Express.js + Node.js
- **Database:** Drizzle ORM (PostgreSQL ready)
- **Build:** Vite
- **State:** TanStack Query
- **SEO:** React Helmet Async

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yawarquil/streamvault.git
cd streamvault

# Install dependencies
npm install

# Start development server
npm run dev
```

### Open in Browser
```
http://localhost:5000
```

**That's it! Your StreamVault is running!** 🎉

---

## 📁 Project Structure

```
StreamVault/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   ├── home.tsx           # Homepage with hero carousel
│   │   │   ├── show-detail.tsx    # Show details page
│   │   │   ├── watch.tsx          # Video player page
│   │   │   ├── search.tsx         # Search results
│   │   │   └── category.tsx       # Category browsing
│   │   ├── components/    # Reusable components
│   │   │   ├── hero-carousel.tsx  # Auto-playing hero slider
│   │   │   ├── content-row.tsx    # Horizontal content rows
│   │   │   ├── show-card.tsx      # Show card component
│   │   │   ├── header.tsx         # Navigation header
│   │   │   ├── footer.tsx         # Footer component
│   │   │   └── ui/                # shadcn/ui components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities
│   │   └── index.css      # Global styles
│   └── index.html
├── server/                # Backend Express API
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API route handlers
│   ├── storage.ts        # Data storage layer
│   └── vite.ts           # Vite integration
├── shared/               # Shared TypeScript types
│   └── schema.ts         # Database schema (Drizzle)
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🎯 Available Scripts

### Development
```bash
npm run dev          # Start dev server (http://localhost:5000)
npm run check        # TypeScript type checking
```

### Content Management
```bash
npm run add-show        # Add show from TMDB
npm run add-movie       # Add movie from TMDB
npm run add-top-movies  # Add top 200 movies
npm run update-shows    # Update show metadata
```

### Database
```bash
npm run db:push         # Push schema to PostgreSQL
```

### Production
```bash
npm run build        # Build for production
npm start            # Start production server
```

---

## 🎨 Features in Detail

### Hero Carousel
- Auto-playing slider (5-second intervals)
- Large backdrop images with gradients
- Featured show information
- Play Now & More Info buttons
- Navigation arrows and dots
- Responsive on all devices

### Content Discovery
- **Trending Now** - Popular shows
- **Continue Watching** - Resume where you left off
- **Categories** - Action, Drama, Comedy, Horror
- **Search** - Find shows by title, actor, or genre

### Video Player
- Google Drive video embedding
- Custom controls overlay
- Progress tracking
- Auto-save watch position
- Up Next sidebar
- Keyboard shortcuts

### Watchlist
- Add/remove shows
- Session-based storage
- Quick access from header
- Persistent across sessions

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in root:

```env
# Database (Optional - uses in-memory by default)
DATABASE_URL=postgresql://user:password@host:5432/streamvault

# Server
NODE_ENV=development
PORT=5000
```

### Customization

#### Change Site Name
Edit `client/src/components/header.tsx`:
```tsx
<span className="text-xl font-bold">YourSiteName</span>
```

#### Change Colors
Edit `client/src/index.css`:
```css
:root {
  --primary: 0 0% 8%;        /* Background */
  --accent: 0 91% 47%;       /* Netflix Red */
}
```

#### Add Content
Edit `server/storage.ts` - add shows to the `shows` array

---

## 📊 API Endpoints

### Shows
- `GET /api/shows` - Get all shows
- `GET /api/shows/search?q=query` - Search shows
- `GET /api/shows/:slug` - Get show by slug

### Movies
- `GET /api/movies` - Get all movies
- `GET /api/movies/:slug` - Get movie by slug

### Episodes
- `GET /api/episodes/:showId` - Get episodes for a show

### Anime
- `GET /api/anime` - Get all anime
- `GET /api/anime/:slug` - Get anime by slug
- `GET /api/anime-episodes/:animeId` - Get episodes for an anime

### Watchlist
- `GET /api/watchlist` - Get user watchlist (shows + movies)
- `POST /api/watchlist` - Add to watchlist (showId or movieId)
- `DELETE /api/watchlist/show/:showId` - Remove show from watchlist
- `DELETE /api/watchlist/movie/:movieId` - Remove movie from watchlist

### Progress
- `GET /api/progress` - Get viewing progress
- `POST /api/progress` - Update progress

### Categories
- `GET /api/categories` - Get all categories

### Gamification & Community
- `GET /api/leaderboard` - Get user leaderboard
- `GET /api/challenges` - Get active challenges
- `GET /api/polls` - Get community polls
- `POST /api/polls/:id/vote` - Vote on a poll
- `GET /api/achievements` - Get all achievements

### Store (NEW!)
- `GET /api/store/products` - Get all store items
- `POST /api/store/purchase` - Purchase item with coins
- `POST /api/store/gift` - Gift item to friend
- `GET /api/store/my-badges` - Get owned badges

---

## 🎬 Sample Content

The platform comes pre-loaded with 10 popular shows:
1. Stranger Things
2. Breaking Bad
3. The Crown
4. Money Heist
5. The Office
6. Dark
7. Peaky Blinders
8. Narcos
9. The Witcher
10. Friends

Each show includes:
- Multiple seasons
- Episode data
- Cast information
- High-quality images
- **Working video playback** (placeholder)

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy dist folder
```

### Railway/Render
1. Connect GitHub repository
2. Build command: `npm run build`
3. Start command: `npm start`

---

## 📚 Documentation

- **[Quick Setup](QUICK_SETUP.md)** - Get started in 5 minutes
- **[Improvements Plan](IMPROVEMENTS_PLAN.md)** - Feature roadmap
- **[Architecture](replit.md)** - Full system documentation
- **[Design Guidelines](design_guidelines.md)** - UI/UX standards

---

## 🛠️ Tech Stack Details

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Radix UI** - Accessible primitives
- **TanStack Query** - Server state management
- **Wouter** - Lightweight routing
- **Lucide React** - Icon library

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime
- **Drizzle ORM** - Database toolkit
- **TypeScript** - Type safety

### Database (Ready)
- **PostgreSQL** - Production database
- **Neon** - Serverless Postgres
- **In-Memory** - Development fallback

---

## 🎯 Key Features

✅ **Professional UI** - Netflix-quality design  
✅ **Working Videos** - Placeholder video integrated  
✅ **Responsive** - Mobile, tablet, desktop  
✅ **Dark/Light Mode** - Theme toggle  
✅ **Search** - Real-time search  
✅ **Watchlist** - Save favorites  
✅ **Progress Tracking** - Resume watching  
✅ **Categories** - Browse by genre  
✅ **Session Management** - User data persistence  
✅ **Type Safe** - Full TypeScript  

---

## 📈 Performance

- **Fast Load Times** - < 2 seconds
- **Optimized Bundle** - Code splitting
- **Lazy Loading** - Images & routes
- **Caching** - TanStack Query
- **Responsive** - Mobile-first

---

## 🔐 Security

- Session-based data isolation
- Input validation with Zod
- Type-safe API contracts
- CORS configuration
- Environment variables

---

## 🤝 Contributing

This is a personal project, but feel free to:
1. Fork the repository
2. Create feature branch
3. Make improvements
4. Submit pull request

---

## 📝 License

MIT License - feel free to use for personal or commercial projects

---

## 🎉 What's New

### Latest Updates (v5.4) - February 14, 2026
- ✅ **Domain & SSL** - `streamvault.live` live with HTTPS & automated setup
- ✅ **Advanced Chat** - Message reactions, replies, link previews, & jumbo emojis
- ✅ **Voice 2.0** - Real-time audio visualizers & compact player UI
- ✅ **Repository Cleanup** - Organized codebase with `dev-utils` & improved gitignore
- ✅ **Stability** - Fixed friends page blank screen & login cookie issues

### Latest Updates (v5.3) - February 2026
- ✅ **Badge Sorting Fixes** - Badges now sort correctly by equipped date everywhere
- ✅ **Store & Economy** - Full purchasing and gifting system with StreamCoins live
- ✅ **Admin Dashboard Enhancements** - Badge management in moderation panels
- ✅ **Performance** - Optimized badge rendering across frontend
- ✅ **Bug Fixes** - Fixed badge timestamps in API endpoints

### Latest Updates (v5.2) - January 26, 2026
- ✅ **Forgot Password Flow** - Secure email recovery with Resend integration
- ✅ **Profile UI Redesign** - Stunning Hero Card layout & refined streak display
- ✅ **Badge System Overhaul** - Admin tools for bulk awarding, live search & revocation
- ✅ **New Badges** - "Founder" (Golden S) & "Stream King" (Animated)
- ✅ **Smart Achievements** - Auto-healing logic for missing badges

### Latest Updates (v5.1) - January 2026
- ✅ **Settings Page** - Dedicated `/settings` page with app preferences
- ✅ **Chatbot Toggle** - Disable AI assistant from settings
- ✅ **Profile Favorites** - Display favorite shows/movies/anime on your profile
- ✅ **Profile Social Links** - Add Twitter, Instagram, YouTube, TikTok, Discord
- ✅ **Friend Activity Fix** - Joiner activity no longer shows as "Unknown"
- ✅ **Activity Cleanup** - Activity properly clears when users disconnect
- ✅ **Content by ID APIs** - New `/api/shows/:id`, `/api/movies/:id`, `/api/anime/:id` endpoints

### Previous Updates (v5.0) - January 2026
- ✅ **Anime Support** - Full anime integration with 98+ titles
- ✅ **Anime Streaming** - Dedicated anime pages with episode players
- ✅ **Anime Blog Posts** - Rich blog content with season trailers
- ✅ **Category Integration** - Anime in all genre category pages
- ✅ **Anime Search** - Global search includes anime titles
- ✅ **Browse & Filter** - Anime tab in browse page
- ✅ **Sitemap & SEO** - Anime URLs in sitemap and robots.txt

### Previous Updates (v4.0) - January 2026
- ✅ **Watch Together** - Real-time co-watching with friends
- ✅ **Video Sync** - Host-controlled playback sync (play, pause, seek, speed)
- ✅ **Change Episode** - Switch episodes in Watch Together without leaving room
- ✅ **Voice Chat** - WebRTC audio communication in watch rooms
- ✅ **Live Chat** - Emojis, GIFs (Tenor API), file attachments
- ✅ **Floating Reactions** - Emoji reactions visible to all viewers
- ✅ **Host Controls** - Mute/unmute participants
- ✅ **Session Persistence** - 2-min grace period for reconnection
- ✅ **Speaking Indicators** - Visual feedback for active speakers
- ✅ **Mobile Landscape Overlay** - Prompts users to rotate for better viewing
- ✅ **Audio Autoplay Unlock** - Handles browser autoplay restrictions

### Previous Updates (v3.5) - January 2026 (Mid-Month)
- ✅ **Friend System** - Add/Remove friends, online status tracking
- ✅ **Direct Messaging** - Private real-time chat with friends
- ✅ **Notification Links** - Admin broadcast notifications now support custom destination links
- ✅ **Subtitle Improvements** - Enhanced subtitle fetching reliability with fallback providers
- ✅ **User Avatars** - Custom user avatars in comments

### Previous Updates (v3.0) - December 2024
- ✅ **SEO Blog System** - Auto-generated rich blog articles for all content
- ✅ **Production Companies** - Logos and official website backlinks
- ✅ **External Links** - IMDb, Facebook, Twitter, Instagram buttons
- ✅ **Season Trailers** - YouTube trailers for each TV season from TMDB
- ✅ **Multi-Domain Support** - Dynamic sitemap for .live and .in domains
- ✅ **SEO Optimization** - Canonical tags, robots.txt, structured data
- ✅ **Comments** - User comments on video pages
- ✅ **Content Requests** - Users can request shows/movies
- ✅ **Issue Reporting** - Report broken links or issues

### Previous Updates (v2.0)
- ✅ **Full Movie Support** - Browse, watch, and manage movies
- ✅ **Unified Watchlist** - Combined shows and movies with tabs
- ✅ **Enhanced Search** - Filter by genre, year, with scrollable sidebar
- ✅ **TMDB Integration** - Rich metadata from The Movie Database
- ✅ **600+ Content Items** - Movies and TV shows pre-loaded
- ✅ **Category Pages** - Browse by genre with show/movie filtering

---

## 🚀 Next Steps

1. **Run the app** - `npm run dev`
2. **Explore features** - Browse shows, search, add to watchlist
3. **Customize** - Change branding, colors, content
4. **Deploy** - Push to production
5. **Improve** - See `IMPROVEMENTS_PLAN.md`

---

## 📞 Support

- **Documentation:** Check the docs folder
- **Issues:** Review code comments
- **Architecture:** See `replit.md`
- **Design:** See `design_guidelines.md`

---

## 🌐 Connect With Us

[![X (Twitter)](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://twitter.streamvault.in)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.streamvault.in)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://facebook.streamvault.in)
[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://telegram.streamvault.in)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.streamvault.in)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yawarquil/streamvault)

---

## 🌟 Highlights

**This is a production-ready streaming platform with:**
- Professional Netflix-inspired design
- Modern React + TypeScript architecture
- Beautiful UI with shadcn/ui components
- Working video playback
- Comprehensive feature set
- Full documentation
- Easy to customize and deploy

---

**Built with ❤️ for StreamVault**

*Your Premium Web Series Destination*

---

## 🎥 Demo Video

See StreamVault in action:

![Website Demo](./screenshots/website-demo.webp)

---

## 📸 Screenshots

### 🏠 Homepage
Beautiful Netflix-inspired homepage with hero carousel and trending content rows.

![Homepage](./screenshots/homepage.png)

---

### 🎥 Movies Page
Browse all movies with clean card design, ratings, and hover effects.

![Movies Page](./screenshots/movies-page.png)

---

### 📺 Show Detail Page
Comprehensive show information with seasons, episodes, cast, and production companies.

![Show Detail](./screenshots/show-detail.png)

---

### 📝 Blog Article Page
SEO-optimized blog articles with trailers, cast info, trivia, and external links.

![Blog Article](./screenshots/blog-article.png)

---

### 🎬 Watch Together
Real-time co-watching with friends featuring voice chat, live messaging with GIFs, reactions, and host controls.

![Watch Together](./screenshots/watch-together.png)

---

**Ready to stream? Run `npm run dev` and visit http://localhost:5000** 🎬
