/**
 * StreamVault Watch Together - StreamVault Page Bridge
 * Runs on StreamVault watch-together pages
 * Bridges the extension with the page's Socket.io connection
 * Shows notifications and enables sync with external Drive tabs
 */

console.log('[StreamVault Bridge] Content script loaded on StreamVault');

let hasShownInitialNotification = false;
let detectedVideoType = null;

// Show notification on the StreamVault page
function showNotification(text, type = 'info', duration = 5000) {
    console.log('[StreamVault Bridge] Notification:', text);

    const existing = document.getElementById('streamvault-ext-notif');
    if (existing) existing.remove();

    const colors = {
        info: { bg: 'linear-gradient(135deg, #3b82f6, #60a5fa)', shadow: 'rgba(59, 130, 246, 0.5)' },
        success: { bg: 'linear-gradient(135deg, #22c55e, #4ade80)', shadow: 'rgba(34, 197, 94, 0.5)' },
        host: { bg: 'linear-gradient(135deg, #DC2626, #ef4444)', shadow: 'rgba(220, 38, 38, 0.5)' },
        warning: { bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)', shadow: 'rgba(245, 158, 11, 0.5)' }
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
        padding: 16px 24px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 8px 32px ${color.shadow}, 0 0 0 1px rgba(255,255,255,0.1);
        animation: svSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        max-width: 350px;
        display: flex;
        align-items: center;
        gap: 12px;
        backdrop-filter: blur(10px);
    `;

    // Add animation keyframes if not already added
    if (!document.getElementById('sv-ext-styles')) {
        const style = document.createElement('style');
        style.id = 'sv-ext-styles';
        style.textContent = `
            @keyframes svSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes svSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }
            @keyframes svPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }

    notif.innerHTML = `
        <span style="font-size: 20px; animation: svPulse 1s infinite;">🎬</span>
        <span>${text}</span>
    `;
    document.body.appendChild(notif);

    if (duration > 0) {
        setTimeout(() => {
            notif.style.animation = 'svSlideOut 0.3s ease forwards';
            setTimeout(() => notif.remove(), 300);
        }, duration);
    }
}

// Detect embedded video player (Google Drive iframe, JW Player, or HTML5 video)
function detectVideoPlayer() {
    // Look for Drive iframe
    const driveIframe = document.querySelector('iframe[src*="drive.google.com"]');
    if (driveIframe) {
        console.log('[StreamVault Bridge] Found Google Drive iframe!');
        detectedVideoType = 'drive';
        return { found: true, type: 'Google Drive' };
    }

    // Look for JW Player
    const jwPlayer = document.querySelector('[id*="jwplayer"], .jwplayer');
    if (jwPlayer) {
        console.log('[StreamVault Bridge] Found JW Player!');
        detectedVideoType = 'jwplayer';
        return { found: true, type: 'JW Player' };
    }

    // Look for HTML5 video element
    const videoElement = document.querySelector('video');
    if (videoElement) {
        console.log('[StreamVault Bridge] Found HTML5 video!');
        detectedVideoType = 'html5';
        return { found: true, type: 'Video' };
    }

    return { found: false, type: null };
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
        // Forward to page's React component via postMessage
        window.postMessage({
            source: 'streamvault-extension',
            type: 'VIDEO_SYNC',
            action: message.action,
            time: message.time,
            playbackRate: message.playbackRate
        }, '*');

        showNotification(`Syncing: ${message.action} at ${Math.floor(message.time || 0)}s`, 'info', 2000);
        sendResponse({ success: true });
    }

    if (message.type === 'SET_HOST') {
        const hostText = message.isHost
            ? '👑 You are the HOST - your controls sync to viewers'
            : '👁️ You are a VIEWER - syncing to host';
        showNotification(hostText, message.isHost ? 'host' : 'info');
    }

    if (message.type === 'ROOM_CONNECTED') {
        showNotification(`Connected to room: ${message.roomCode}`, 'success');
    }

    return true;
});

// Get room code from URL
function getRoomCode() {
    const pathMatch = window.location.pathname.match(/\/watch-together\/([a-zA-Z0-9]{6})/i);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1].toUpperCase();
    }

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room')?.toUpperCase() || null;
}

// Notify extension that we're on a watch-together page
function notifyExtension() {
    const roomCode = getRoomCode();

    if (roomCode) {
        console.log('[StreamVault Bridge] Room detected:', roomCode);

        chrome.runtime.sendMessage({
            type: 'STREAMVAULT_TAB_READY',
            roomCode: roomCode
        }).then(() => {
            console.log('[StreamVault Bridge] Extension connected to room:', roomCode);
            chrome.runtime.sendMessage({ type: 'BRIDGE_CONNECTED' }).catch(() => { });
        }).catch(err => {
            console.log('[StreamVault Bridge] Extension not available:', err);
        });

        return roomCode;
    }

    return null;
}

// Initialize - detect video and notify extension
function init() {
    console.log('[StreamVault Bridge] Initializing...');

    // Show initial notification
    if (!hasShownInitialNotification) {
        hasShownInitialNotification = true;
        showNotification('🔌 StreamVault Extension Active', 'success', 3000);
    }

    // Notify extension about room
    const roomCode = notifyExtension();

    // Detect video player with retries
    let attempts = 0;
    const maxAttempts = 10;

    const checkForVideo = () => {
        attempts++;
        const result = detectVideoPlayer();

        if (result.found) {
            console.log('[StreamVault Bridge] Video player detected:', result.type);
            showNotification(`✅ ${result.type} player detected - Ready to sync!`, 'success');

            chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED_ON_PAGE' }).catch(() => { });
        } else if (attempts < maxAttempts) {
            // Retry after a delay
            setTimeout(checkForVideo, 1000);
        } else {
            console.log('[StreamVault Bridge] No video player found after', maxAttempts, 'attempts');
            if (roomCode) {
                showNotification('⏳ Waiting for video player to load...', 'warning', 3000);
            }
        }
    };

    // Start checking for video
    setTimeout(checkForVideo, 500);

    // Also use MutationObserver for dynamic content
    const observer = new MutationObserver(() => {
        if (!detectedVideoType) {
            const result = detectVideoPlayer();
            if (result.found) {
                console.log('[StreamVault Bridge] Video player appeared:', result.type);
                showNotification(`✅ ${result.type} player detected - Ready to sync!`, 'success');
                chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED_ON_PAGE' }).catch(() => { });
                observer.disconnect();
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Disconnect observer after 30 seconds to prevent memory leaks
    setTimeout(() => observer.disconnect(), 30000);
}

// Wait for page to load then initialize
if (document.readyState === 'complete') {
    setTimeout(init, 500);
} else {
    window.addEventListener('load', () => setTimeout(init, 500));
}

console.log('[StreamVault Bridge] Script ready');
