/**
 * StreamVault Watch Together - Background Service Worker
 * Routes messages between StreamVault and Google Drive tabs
 */

console.log('[StreamVault Extension] Background initialized');

let currentRoom = null;
let isConnected = false;
let isHost = false;

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[StreamVault BG] Message:', message.type, 'from:', sender.tab?.url?.substring(0, 50));

    switch (message.type) {
        case 'JOIN_ROOM':
            currentRoom = message.roomCode;
            isHost = message.isHost || false;

            // Save to storage
            chrome.storage.local.set({ currentRoom, isHost });

            // Tell all tabs we're connected
            broadcastToDriveTabs({ type: 'ROOM_CONNECTED', roomCode: currentRoom });
            broadcastToDriveTabs({ type: 'SET_HOST', isHost: isHost });
            isConnected = true;

            sendResponse({ success: true });
            break;

        case 'LEAVE_ROOM':
            currentRoom = null;
            isConnected = false;
            isHost = false;
            chrome.storage.local.remove(['currentRoom', 'isHost']);
            broadcastToDriveTabs({ type: 'ROOM_DISCONNECTED' });
            sendResponse({ success: true });
            break;

        case 'GET_STATUS':
            sendResponse({ connected: isConnected, roomCode: currentRoom, isHost });
            break;

        case 'VIDEO_EVENT':
            // From Google Drive content script (host)
            if (isHost) {
                // Forward to StreamVault tabs
                broadcastToStreamVaultTabs({
                    type: 'EXTENSION_VIDEO_EVENT',
                    action: message.action,
                    time: message.time
                });
            }
            sendResponse({ success: true });
            break;

        case 'STREAMVAULT_SYNC':
            // From StreamVault page - forward to Google Drive tabs
            console.log('[StreamVault BG] Syncing to Drive tabs:', message);
            broadcastToDriveTabs({
                type: 'SYNC_COMMAND',
                action: message.action,
                time: message.time,
                playbackRate: message.playbackRate
            });
            sendResponse({ success: true });
            break;

        case 'STREAMVAULT_TAB_READY':
            currentRoom = message.roomCode;
            isConnected = true;
            broadcastToDriveTabs({ type: 'ROOM_CONNECTED', roomCode: message.roomCode });
            sendResponse({ success: true });
            break;

        case 'VIDEO_FOUND':
            if (sender.tab) {
                chrome.action.setBadgeText({ text: 'ON', tabId: sender.tab.id });
                chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: sender.tab.id });
            }
            break;

        case 'VIDEO_DETECTED_ON_PAGE':
            if (sender.tab) {
                chrome.action.setBadgeText({ text: 'SYNC', tabId: sender.tab.id });
                chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: sender.tab.id });
            }
            break;

        case 'BRIDGE_CONNECTED':
            if (sender.tab) {
                chrome.action.setBadgeText({ text: 'ROOM', tabId: sender.tab.id });
                chrome.action.setBadgeBackgroundColor({ color: '#3b82f6', tabId: sender.tab.id });
            }
            break;

        default:
            sendResponse({ error: 'Unknown message' });
    }

    return true;
});

// Broadcast to Google Drive tabs
async function broadcastToDriveTabs(message) {
    try {
        const tabs = await chrome.tabs.query({
            url: ['*://drive.google.com/*', '*://docs.google.com/*']
        });

        console.log('[StreamVault BG] Broadcasting to', tabs.length, 'Drive tabs');

        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, message);
            } catch (e) {
                // Tab might not have content script
            }
        }
    } catch (e) {
        console.error('[StreamVault BG] Broadcast error:', e);
    }
}

// Broadcast to StreamVault tabs
async function broadcastToStreamVaultTabs(message) {
    try {
        const tabs = await chrome.tabs.query({
            url: ['*://streamvault.live/*', '*://localhost:5000/*']
        });

        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, message);
            } catch (e) {
                // Tab might not have content script
            }
        }
    } catch (e) {
        console.error('[StreamVault BG] Broadcast error:', e);
    }
}

// Restore state on startup
// Restore state on startup
chrome.storage.local.get(['currentRoom', 'isHost'], (data) => {
    if (chrome.runtime.lastError) {
        console.log('[StreamVault BG] Storage error:', chrome.runtime.lastError);
        return;
    }

    if (data && data.currentRoom) {
        currentRoom = data.currentRoom;
        isHost = data.isHost || false;
        isConnected = true;
        console.log('[StreamVault BG] Restored room:', currentRoom);
    }
});
