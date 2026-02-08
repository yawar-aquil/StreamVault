# 🚀 StreamVault v5.1 Release Notes

**Release Date:** January 22, 2026

---

## ✨ New Features

### ⚙️ Settings Page
A dedicated settings page at `/settings` with comprehensive app preferences:

- **AI Chatbot Toggle** - Enable/disable the Vault AI assistant
- **Theme Selection** - Light, Dark, or System preference
- **Notification Controls** - Push and email notification toggles
- **Privacy Settings** - Control friend activity visibility
- **Playback Preferences** - Default video quality (Auto/1080p/720p/480p)
- **Autoplay Controls** - Toggle trailer autoplay and subtitles

### ❤️ Profile Favorites
Showcase your favorite content on your user profile:

- Select up to **5 favorites** per category (Shows, Movies, Anime)
- Search and add content with instant preview
- Visible to friends who view your profile
- Clean grid display with poster images

### 🔗 Profile Social Links
Connect your social media accounts:

- Twitter/X
- Instagram
- YouTube
- TikTok
- Discord

---

## 🐛 Bug Fixes

### Friend Activity "Unknown" Fix
- **Issue:** When a third user joined a watch-together room, their activity showed as "Unknown" to friends
- **Fix:** Added `contentTitle`, `contentPoster`, and `episodeTitle` to the `room:joined` event for all joiners

### Stale Activity Cleanup
- **Issue:** After host left a room, friend activity remained "Unknown" instead of clearing
- **Fix:** Enhanced disconnect handler to clear `userActivities` and broadcast changes to friends

### Profile Data Not Showing
- **Issue:** Logged-in user's profile didn't display their saved social links and favorites
- **Fix:** Updated `/api/auth/me` endpoint to include `socialLinks` and `favorites` in response

---

## 📡 API Additions

New endpoints for content retrieval by ID:

| Endpoint | Description |
|----------|-------------|
| `GET /api/shows/:id` | Get show by ID |
| `GET /api/movies/:id` | Get movie by ID |
| `GET /api/anime/:id` | Get anime by ID |

---

## 📁 Files Changed

### New Files
- `client/src/pages/settings.tsx` - Settings page component

### Modified Files
- `server/routes.ts` - Added content-by-ID endpoints, fixed `/api/auth/me`
- `server/watch-together.ts` - Fixed `room:joined` event payload
- `server/social.ts` - Enhanced disconnect handler for activity cleanup
- `client/src/components/header.tsx` - Added Settings menu item
- `client/src/components/chatbot.tsx` - Respects chatbot toggle setting
- `client/src/components/favorites-picker.tsx` - Fixed initial data loading
- `client/src/pages/profile.tsx` - Integrated favorites and social links
- `client/src/App.tsx` - Added `/settings` route
- `README.md` - Updated with v5.1 features

---

## 🔧 Technical Details

### Settings Storage
- Settings stored in `localStorage` under key `streamvault_settings`
- Custom event `settings-changed` dispatched for real-time component updates
- Components subscribe to setting changes automatically

### Favorites Picker Logic
- Tracks `lastLoadedKeyRef` to prevent duplicate fetches
- Compares `totalFavorites` vs `totalSelected` to detect server vs user changes
- Properly syncs with parent component state

---

## ⬆️ Upgrade Notes

This is a **non-breaking** update. Simply pull the latest changes and restart:

```bash
git pull origin main
npm install
npm run dev
```

No database migrations required.

---

## 📊 Stats

- **10 files changed**
- **~500 insertions**
- **~20 deletions**

---

**Full Changelog:** [v5.0...v5.1](https://github.com/shakirali78690/StreamVault/compare/v5.0...v5.1)
