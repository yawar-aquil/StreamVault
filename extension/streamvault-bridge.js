/**
 * StreamVault Watch Together - StreamVault Page Bridge
 * Runs on StreamVault watch-together pages
 * Bridges the extension with the page's Socket.io connection
 */

console.log('[StreamVault Bridge] Content script loaded on StreamVault');

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

// Wait for page to load then notify
if (document.readyState === 'complete') {
    setTimeout(notifyExtension, 2000);
} else {
    window.addEventListener('load', () => setTimeout(notifyExtension, 2000));
}

console.log('[StreamVault Bridge] Ready');
