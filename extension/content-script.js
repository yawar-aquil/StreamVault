/**
 * StreamVault Watch Together - Content Script
 * Injected into Google Drive video pages to control playback
 * Simplified version - just syncs when receiving commands from StreamVault
 */

console.log('[StreamVault] Content script loaded on Google Drive');

let videoElement = null;
let isHost = false;
let isSyncing = false;
let connected = false;

// Find the video element
function findVideoElement() {
    // Google Drive video player
    videoElement = document.querySelector('video');

    if (videoElement) {
        console.log('[StreamVault] Found video element');
        setupVideoListeners();
        showNotification('Video found! Open StreamVault extension to sync.');
        chrome.runtime.sendMessage({ type: 'VIDEO_FOUND' }).catch(() => { });
        return true;
    }

    return false;
}

// Setup listeners on the video element
function setupVideoListeners() {
    if (!videoElement) return;

    videoElement.addEventListener('play', () => {
        if (!isSyncing && isHost && connected) {
            sendVideoEvent('play', videoElement.currentTime);
        }
    });

    videoElement.addEventListener('pause', () => {
        if (!isSyncing && isHost && connected) {
            sendVideoEvent('pause', videoElement.currentTime);
        }
    });

    videoElement.addEventListener('seeked', () => {
        if (!isSyncing && isHost && connected) {
            sendVideoEvent('seek', videoElement.currentTime);
        }
    });

    console.log('[StreamVault] Video listeners attached');
}

// Send video event to background
function sendVideoEvent(action, time) {
    chrome.runtime.sendMessage({
        type: 'VIDEO_EVENT',
        action: action,
        time: time
    }).catch(console.error);
}

// Handle sync command
function handleSyncCommand(data) {
    if (!videoElement) {
        console.log('[StreamVault] No video to sync');
        return;
    }

    console.log('[StreamVault] Syncing:', data);
    isSyncing = true;

    try {
        switch (data.action) {
            case 'play':
                if (Math.abs(videoElement.currentTime - data.time) > 2) {
                    videoElement.currentTime = data.time;
                }
                videoElement.play().catch(e => {
                    showNotification('Click video to enable autoplay');
                });
                break;

            case 'pause':
                videoElement.pause();
                if (Math.abs(videoElement.currentTime - data.time) > 2) {
                    videoElement.currentTime = data.time;
                }
                break;

            case 'seek':
            case 'timesync':
                if (Math.abs(videoElement.currentTime - data.time) > 3) {
                    videoElement.currentTime = data.time;
                    showNotification(`Synced to ${formatTime(data.time)}`);
                }
                break;
        }
    } catch (e) {
        console.error('[StreamVault] Sync error:', e);
    }

    setTimeout(() => { isSyncing = false; }, 500);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[StreamVault] Received:', message);

    switch (message.type) {
        case 'ROOM_CONNECTED':
            connected = true;
            showNotification('Connected to room: ' + message.roomCode);
            break;

        case 'ROOM_DISCONNECTED':
            connected = false;
            showNotification('Disconnected from room');
            break;

        case 'SYNC_COMMAND':
            handleSyncCommand(message);
            break;

        case 'SET_HOST':
            isHost = message.isHost;
            showNotification(isHost ? 'You are the HOST - your controls sync to others' : 'You are a VIEWER - syncing to host');
            break;

        case 'PING':
            sendResponse({ hasVideo: !!videoElement, currentTime: videoElement?.currentTime });
            break;
    }

    return true;
});

// Show notification
function showNotification(text, persistent = false) {
    console.log('[StreamVault] Notification:', text);

    const existing = document.getElementById('streamvault-notif');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'streamvault-notif';
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #DC2626, #ef4444);
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 2147483647;
        box-shadow: 0 8px 32px rgba(220, 38, 38, 0.5);
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    notif.textContent = '🎬 ' + text;
    document.body.appendChild(notif);

    if (!persistent) {
        setTimeout(() => notif.remove(), 5000);
    }
}

// Initialize
function init() {
    if (!findVideoElement()) {
        // Wait for video to appear
        const observer = new MutationObserver(() => {
            if (findVideoElement()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Retry periodically
        setTimeout(() => findVideoElement(), 2000);
        setTimeout(() => findVideoElement(), 5000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
