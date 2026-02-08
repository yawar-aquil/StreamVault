# StreamVault Watch Together Extension

A Chrome extension to sync Google Drive video playback in StreamVault Watch Together rooms.

## Features

- 🎬 Sync Google Drive video playback (play, pause, seek, speed)
- 👥 Works with StreamVault Watch Together rooms
- 🎯 Host/Viewer modes
- 🔄 Automatic time sync every 5 seconds
- 🔔 Visual notifications when connected

## Installation

### From Source (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this repository
5. The extension icon should appear in your toolbar

### From Chrome Web Store
*(Coming soon)*

## How to Use

### Host (Controls the video for everyone)

1. Open a Google Drive video in Chrome
2. Click the StreamVault extension icon
3. Enter the Watch Together room code from StreamVault
4. Toggle **"I am the host"** ON
5. Click **Join Room**
6. Play/pause/seek the video - all viewers will sync!

### Viewer (Syncs to the host)

1. Open the same Google Drive video in Chrome
2. Click the StreamVault extension icon
3. Enter the same room code
4. Toggle **"I am the host"** OFF
5. Click **Join Room**
6. Your video will automatically sync with the host

## Synced Actions

| Action | Host | Viewer |
|--------|------|--------|
| Play | Sends to all | Receives & plays |
| Pause | Sends to all | Receives & pauses |
| Seek | Sends to all | Receives & seeks |
| Speed | Sends to all | Receives & changes speed |
| Time Sync | Every 5s | Corrects drift |

## Technical Details

- Uses Chrome Manifest V3
- WebSocket connection to StreamVault server
- Content script injects into Google Drive video pages
- Background service worker manages WebSocket connection

## Supported Pages

- `drive.google.com/file/d/*/preview`
- `drive.google.com/file/d/*/view`

## Troubleshooting

### Video not syncing?
- Make sure you're on a Google Drive video page
- Check that the room code is correct
- Verify the extension is connected (green dot in popup)

### Extension not loading?
- Refresh the Google Drive page
- Check Chrome console for errors
- Try reloading the extension

## Development

```bash
# Clone the repo
git clone https://github.com/shakirali78690/StreamVault.git

# The extension is in the /extension folder
cd StreamVault/extension

# Make changes, then reload in chrome://extensions
```

## License

MIT License - See main repository for details.
