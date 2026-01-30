/**
 * StreamVault Watch Together - StreamVault Page Bridge
 * Runs on StreamVault watch-together pages
 * Bridges the extension with the page's Socket.io connection
 * Also detects embedded video players and shows notifications
 */

console.log('[StreamVault Bridge] Content script loaded on StreamVault');

// Show notification on the StreamVault page
function showNotification(text, type = 'info') {
    console.log('[StreamVault Bridge] Notification:', text);

    const existing = document.getElementById('streamvault-ext-notif');
    if (existing) existing.remove();

    const colors = {
        info: { bg: 'linear-gradient(135deg, #3b82f6, #60a5fa)', shadow: 'rgba(59, 130, 246, 0.5)' },
        success: { bg: 'linear-gradient(135deg, #22c55e, #4ade80)', shadow: 'rgba(34, 197, 94, 0.5)' },
        host: { bg: 'linear-gradient(135deg, #DC2626, #ef4444)', shadow: 'rgba(220, 38, 38, 0.5)' }
    };

    const color = colors[type] || colors.info;

    const notif = document.createElement('div');
    notif.id = 'streamvault-ext-notif';
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${color.bg};
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 2147483647;
        box-shadow: 0 8px 32px ${color.shadow};
        animation: svSlideIn 0.3s ease;
        max-width: 320px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    // Add animation keyframes if not already added
    if (!document.getElementById('sv-ext-styles')) {
        const style = document.createElement('style');
        style.id = 'sv-ext-styles';
        style.textContent = `
            @keyframes svSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes svSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    notif.innerHTML = `<span style="font-size: 18px;">🎬</span><span>${text}</span>`;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'svSlideOut 0.3s ease forwards';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

// Detect embedded video player (Google Drive iframe)
function detectVideoPlayer() {
    // Look for Drive iframe
    const driveIframe = document.querySelector('iframe[src*="drive.google.com"]');

    if (driveIframe) {
        console.log('[StreamVault Bridge] Found Google Drive video player!');
        showNotification('Video player detected! Extension is ready to sync.', 'success');

        // Send detection to background
        chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED_ON_PAGE' }).catch(() => { });
        return true;
    }

    // Also check for JW Player or other video elements
    const videoElement = document.querySelector('video');
    const jwPlayer = document.querySelector('[id*="jwplayer"]');

    if (videoElement || jwPlayer) {
        console.log('[StreamVault Bridge] Found video element!');
        showNotification('Video player detected! Extension is ready to sync.', 'success');
        chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED_ON_PAGE' }).catch(() => { });
        return true;
    }

    return false;
}

// Forward video sync events from page to extension
window.addEventListener('message', (event) => {
    // Only accept messages from our own page
    if (event.source !== window) return;

    if (event.data?.source === 'streamvault-page' && event.data?.type === 'VIDEO_SYNC') {
        console.log('[StreamVault Bridge] Forwarding video sync to extension:', event.data);

        // Send to extension background
        chrome.runtime.sendMessage({
            type: 'STREAMVAULT_SYNC',
            action: event.data.action,
            time: event.data.time,
            playbackRate: event.data.playbackRate
        }).catch(err => {
            console.log('[StreamVault Bridge] Extension not available:', err);
        });
    }
});

// Listen for extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[StreamVault Bridge] Received from extension:', message);

    if (message.type === 'EXTENSION_VIDEO_EVENT') {
        // Forward to page's socket
        window.postMessage({
            source: 'streamvault-extension',
            type: 'VIDEO_SYNC',
            action: message.action,
            time: message.time,
            playbackRate: message.playbackRate
        }, '*');
        sendResponse({ success: true });
    }

    if (message.type === 'SET_HOST') {
        const hostText = message.isHost
            ? 'You are the HOST - your video controls will sync to all viewers'
            : 'You are a VIEWER - your video will sync to the host';
        showNotification(hostText, message.isHost ? 'host' : 'info');
    }

    return true;
});

// Notify extension that we're on a watch-together page
function notifyExtension() {
    let roomCode = null;

    // Get room code from URL or page
    // 1. Check URL path (most reliable for this app)
    const pathMatch = window.location.pathname.match(/\/watch-together\/([a-zA-Z0-9]{6})/i);
    if (pathMatch && pathMatch[1]) {
        roomCode = pathMatch[1].toUpperCase();
    }

    // 2. Check query param (fallback)
    if (!roomCode) {
        const urlParams = new URLSearchParams(window.location.search);
        roomCode = urlParams.get('room');
    }

    // 3. Check page content (legacy/fallback)
    if (!roomCode) {
        const roomDisplay = document.querySelector('[class*="room"]');
        if (roomDisplay) {
            const match = roomDisplay.textContent?.match(/[A-Z0-9]{6}/);
            if (match) roomCode = match[0];
        }
    }

    if (roomCode) {
        console.log('[StreamVault Bridge] Room detected:', roomCode);
        showNotification(`Connected to room: ${roomCode}`, 'success');

        chrome.runtime.sendMessage({
            type: 'STREAMVAULT_TAB_READY',
            roomCode: roomCode
        }).then(() => {
            console.log('[StreamVault Bridge] Extension connected');
            chrome.runtime.sendMessage({ type: 'BRIDGE_CONNECTED' }).catch(() => { });
        }).catch(err => {
            console.log('[StreamVault Bridge] Extension not available');
        });
    }
}

// Initialize - detect video and notify extension
function init() {
    console.log('[StreamVault Bridge] Initializing...');

    // Detect video player
    if (!detectVideoPlayer()) {
        // If not found, watch for it to appear
        const observer = new MutationObserver(() => {
            if (detectVideoPlayer()) {
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Also retry periodically
        setTimeout(() => detectVideoPlayer(), 3000);
        setTimeout(() => detectVideoPlayer(), 6000);
    }

    // Notify extension about room
    notifyExtension();
}

// Wait for page to load then initialize
if (document.readyState === 'complete') {
    setTimeout(init, 1500);
} else {
    window.addEventListener('load', () => setTimeout(init, 1500));
}

console.log('[StreamVault Bridge] Ready');
