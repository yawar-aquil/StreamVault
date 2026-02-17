/**
 * StreamVault Watch Together - StreamVault Page Bridge
 * Runs on StreamVault pages (streamvault.live, streamvault.in, localhost)
 * Bridges the extension with the page's Socket.io connection
 * Shows notifications and enables sync with external Drive tabs
 * 
 * KEY: Handles SPA navigation - monitors URL changes and re-detects
 * video players when the user navigates to a watch-together room
 */

console.log('[StreamVault Bridge] Content script loaded on StreamVault');

let hasShownInitialNotification = false;
let detectedVideoType = null;
let currentUrl = window.location.href;
let videoCheckInterval = null;
let observer = null;

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
    // Look for Drive iframe (check multiple possible src patterns)
    const driveIframe = document.querySelector('iframe[src*="drive.google.com"]') ||
        document.querySelector('iframe[data-app-iframe="gdrive"]');
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

// Check if current URL is a watch-together page
function isWatchTogetherPage() {
    return window.location.pathname.includes('/watch-together');
}

// Detect if the current user is the host by reading the page DOM
function detectHostStatus() {
    // Method 1: Look for the host badge with Crown icon (most reliable)
    // The badge is a div with "You're the host" text and a Crown SVG icon
    const badges = document.querySelectorAll('div');
    for (const el of badges) {
        // Only check leaf-level divs that directly contain the host text
        // The badge element has an SVG (Crown) + text "You're the host"
        if (el.children.length <= 2 && el.innerText?.trim() === "You're the host") {
            console.log('[StreamVault Bridge] Host badge detected on page!');
            return true;
        }
    }

    // Method 2: Check for the host badge via its specific styling class
    // The badge has bg-primary and rounded-full classes
    const styledBadges = document.querySelectorAll('.bg-primary.rounded-full');
    for (const el of styledBadges) {
        if (el.textContent?.includes("host")) {
            console.log('[StreamVault Bridge] Host badge detected via class!');
            return true;
        }
    }

    return false;
}

// Notify extension that we're on a watch-together page (with host status)
function notifyExtension() {
    const roomCode = getRoomCode();

    if (roomCode) {
        const isHost = detectHostStatus();
        console.log('[StreamVault Bridge] Room detected:', roomCode, 'isHost:', isHost);

        // Send room connection with host status
        chrome.runtime.sendMessage({
            type: 'JOIN_ROOM',
            roomCode: roomCode,
            isHost: isHost
        }).then(() => {
            console.log('[StreamVault Bridge] Extension connected to room:', roomCode, 'as', isHost ? 'HOST' : 'VIEWER');
            chrome.runtime.sendMessage({ type: 'BRIDGE_CONNECTED' }).catch(() => { });

            if (isHost) {
                showNotification('👑 Connected as HOST', 'host', 3000);
            } else {
                showNotification('👁️ Connected as VIEWER', 'info', 3000);
            }
        }).catch(err => {
            console.log('[StreamVault Bridge] Extension not available:', err);
        });

        // Also keep monitoring for host status changes (host might change dynamically)
        startHostStatusMonitor(roomCode);

        return roomCode;
    }

    return null;
}

// Monitor for host status changes on the page
let hostMonitorInterval = null;
let lastKnownHostStatus = null;

function startHostStatusMonitor(roomCode) {
    if (hostMonitorInterval) {
        clearInterval(hostMonitorInterval);
    }

    lastKnownHostStatus = detectHostStatus();

    // Check every 2 seconds if host status changed
    hostMonitorInterval = setInterval(() => {
        if (!isWatchTogetherPage()) {
            clearInterval(hostMonitorInterval);
            hostMonitorInterval = null;
            return;
        }

        const currentHostStatus = detectHostStatus();
        if (currentHostStatus !== lastKnownHostStatus) {
            lastKnownHostStatus = currentHostStatus;
            console.log('[StreamVault Bridge] Host status changed to:', currentHostStatus);

            // Update extension with new host status
            chrome.runtime.sendMessage({
                type: 'JOIN_ROOM',
                roomCode: roomCode,
                isHost: currentHostStatus
            }).catch(() => { });

            if (currentHostStatus) {
                showNotification('👑 You are now the HOST', 'host', 3000);
            } else {
                showNotification('👁️ You are now a VIEWER', 'info', 3000);
            }
        }
    }, 2000);
}

// Start looking for video players (called when navigating to watch-together)
function startVideoDetection() {
    // Reset detection state for fresh detection
    detectedVideoType = null;

    // Clear any existing intervals/observers
    if (videoCheckInterval) {
        clearInterval(videoCheckInterval);
        videoCheckInterval = null;
    }
    if (observer) {
        observer.disconnect();
        observer = null;
    }

    console.log('[StreamVault Bridge] Starting video detection...');

    // Immediately check
    const immediateResult = detectVideoPlayer();
    if (immediateResult.found) {
        onVideoDetected(immediateResult.type);
        return;
    }

    // Use MutationObserver to watch for dynamically added iframes/videos
    // This is the KEY fix: the observer stays active as long as we're on a watch-together page
    observer = new MutationObserver((mutations) => {
        if (detectedVideoType) return; // Already found

        // Check if any added nodes contain or are video elements / iframes
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                const el = node;
                // Check if the added element itself is an iframe or video
                if (el.tagName === 'IFRAME' || el.tagName === 'VIDEO' ||
                    el.querySelector?.('iframe, video, [id*="jwplayer"], .jwplayer')) {
                    const result = detectVideoPlayer();
                    if (result.found) {
                        onVideoDetected(result.type);
                        return;
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also poll periodically as a fallback (iframes might load content async)
    let pollCount = 0;
    videoCheckInterval = setInterval(() => {
        pollCount++;
        if (detectedVideoType) {
            clearInterval(videoCheckInterval);
            videoCheckInterval = null;
            return;
        }

        const result = detectVideoPlayer();
        if (result.found) {
            onVideoDetected(result.type);
            clearInterval(videoCheckInterval);
            videoCheckInterval = null;
            return;
        }

        // Keep polling for up to 2 minutes (every 2 seconds)
        if (pollCount >= 60) {
            clearInterval(videoCheckInterval);
            videoCheckInterval = null;
            console.log('[StreamVault Bridge] Stopped polling after 2 minutes');
        }
    }, 2000);
}

// Called when video is detected
function onVideoDetected(type) {
    console.log('[StreamVault Bridge] Video player detected:', type);
    showNotification(`✅ ${type} player detected - Ready to sync!`, 'success');
    chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED_ON_PAGE' }).catch(() => { });
}

// Monitor URL changes for SPA navigation
function monitorUrlChanges() {
    // Check URL periodically (handles React Router pushState navigation)
    setInterval(() => {
        const newUrl = window.location.href;
        if (newUrl !== currentUrl) {
            const oldUrl = currentUrl;
            currentUrl = newUrl;
            console.log('[StreamVault Bridge] URL changed:', oldUrl, '->', newUrl);
            onUrlChange();
        }
    }, 500);

    // Also listen for popstate (browser back/forward)
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            const newUrl = window.location.href;
            if (newUrl !== currentUrl) {
                currentUrl = newUrl;
                console.log('[StreamVault Bridge] URL changed via popstate');
                onUrlChange();
            }
        }, 100);
    });

    // Intercept pushState and replaceState for immediate detection
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        setTimeout(() => {
            const newUrl = window.location.href;
            if (newUrl !== currentUrl) {
                currentUrl = newUrl;
                console.log('[StreamVault Bridge] URL changed via pushState');
                onUrlChange();
            }
        }, 50);
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        setTimeout(() => {
            const newUrl = window.location.href;
            if (newUrl !== currentUrl) {
                currentUrl = newUrl;
                console.log('[StreamVault Bridge] URL changed via replaceState');
                onUrlChange();
            }
        }, 50);
    };
}

// Handle URL change (SPA navigation)
function onUrlChange() {
    if (isWatchTogetherPage()) {
        console.log('[StreamVault Bridge] Navigated to watch-together page');

        // Notify extension about the room
        notifyExtension();

        // Start detecting video players (they load dynamically)
        // Small delay to let React render the page first
        setTimeout(() => startVideoDetection(), 500);
    } else {
        // Left watch-together page, clean up
        detectedVideoType = null;
        if (videoCheckInterval) {
            clearInterval(videoCheckInterval);
            videoCheckInterval = null;
        }
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }
}

// Initialize
function init() {
    console.log('[StreamVault Bridge] Initializing...');

    // Show initial notification
    if (!hasShownInitialNotification) {
        hasShownInitialNotification = true;
        showNotification('🔌 StreamVault Extension Active', 'success', 3000);
    }

    // Start monitoring URL changes for SPA navigation
    monitorUrlChanges();

    // If already on a watch-together page, start detection immediately
    if (isWatchTogetherPage()) {
        notifyExtension();
        setTimeout(() => startVideoDetection(), 500);
    }
}

// Wait for page to load then initialize
if (document.readyState === 'complete') {
    setTimeout(init, 500);
} else {
    window.addEventListener('load', () => setTimeout(init, 500));
}

console.log('[StreamVault Bridge] Script ready');
