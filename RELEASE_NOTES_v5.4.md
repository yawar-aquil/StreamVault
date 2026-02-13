# 🚀 StreamVault Release Notes v5.4

**Date:** February 14, 2026
**Version:** v5.4.0

---

## 🌟 Highlights

### 🌐 Domain & Production Ready
- **`streamvault.live`** is now live!
- **HTTPS/SSL** fully configured with Let's Encrypt.
- **Nginx** reverse proxy setup for optimal performance.
- New **Setup Automation** scripts (`setup-server.sh`, `deploy.sh`) for easy deployment.

### 💬 Enhanced Social Experience
- **Message Reactions**: React to DMs with any emoji (Instagram-style).
- **Reply System**: Reply directly to specific messages in chat.
- **Link Previews**: Rich Open Graph previews for shared links (YouTube, articles, etc.).
- **Jumbo Emojis**: Messages containing only emojis are displayed larger.
- **Grouped Messages**: Chat bubbles now group intelligently for a cleaner look.

### 🎙️ Voice Message 2.0
- **Audio Visualizer**: Real-time waveform visualization for voice messages.
- **Compact UI**: Sleeker, less intrusive voice message player.
- **Preview Mode**: Listen to your voice note before sending it.

---

## 🛠️ Technical Improvements

### 🔒 Security & Persistence
- **Cookie Security**: Configurable `secure` flag for production cookies.
- **Data Persistence**: Verified JSON storage persistence across server restarts.
- **Environment Config**: Improved `.env` handling for secrets.

### 🧹 Codebase Cleanup
- **`dev-utils/`**: Moved non-production scripts and temp files to a dedicated folder.
- **`.gitignore`**: Updated to keep the repository clean.
- **Admin Automation**: Scheduled job to auto-delete inactive/temp user avatars.

---

## 🐛 Bug Fixes

- **Friends Page**: Fixed blank screen issue caused by invalid HTML nesting.
- **Social Socket**: Fixed `removeListener` crash in `useSocialSocket`.
- **Login Session**: Resolved issues with session cookies in some environments.
- **Server Crash**: Fixed intermittent crashes related to socket event handling.

---

## 📈 API Updates

- **Rate Limit Upgrades**: New endpoints to purchase higher API rate limits with StreamCoins.
- **Link Preview API**: New `/api/preview-link` endpoint for fetching metadata.
