/**
 * StreamVault Extension — Background Service Worker
 * Handles: ad blocking toggle, global shortcuts, badge updates,
 *          episode alerts, and Watch Together message routing
 */

console.log('[StreamVault] Background service worker initialized');

// ─── State ───────────────────────────────────────────────────────────
let currentRoom = null;
let isConnected = false;
let isHost = false;

// ─── Installation / Update ───────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[StreamVault] Extension installed/updated:', details.reason);

    // Set default settings
    const defaults = {
        adBlockEnabled: true,
        theme: 'dark',
        notificationsEnabled: true,
        baseUrl: null
    };

    const existing = await chrome.storage.local.get(Object.keys(defaults));
    const toSet = {};
    for (const [key, val] of Object.entries(defaults)) {
        if (existing[key] === undefined) toSet[key] = val;
    }
    if (Object.keys(toSet).length > 0) {
        await chrome.storage.local.set(toSet);
    }

    // Set up periodic alarm for badge updates (every 30 min)
    chrome.alarms.create('updateBadge', { periodInMinutes: 30 });
    // Episode check alarm (every 2 hours)
    chrome.alarms.create('checkEpisodes', { periodInMinutes: 120 });

    // Initial badge update
    updateBadge();
});

// ─── Ad Blocking Toggle ──────────────────────────────────────────────
async function setAdBlockEnabled(enabled) {
    await chrome.storage.local.set({ adBlockEnabled: enabled });

    // Enable or disable the declarativeNetRequest ruleset
    if (enabled) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: ['ad_rules']
        });
    } else {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: ['ad_rules']
        });
    }

    // Notify all StreamVault content scripts
    broadcastToStreamVaultTabs({ type: 'AD_BLOCK_TOGGLE', enabled });

    console.log('[StreamVault] Ad blocking:', enabled ? 'ON' : 'OFF');
}

// ─── Global Keyboard Shortcuts ───────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
    console.log('[StreamVault] Command:', command);

    const STREAMVAULT_URLS = [
        '*://streamvault.live/*',
        '*://www.streamvault.live/*',
        '*://streamvault.in/*',
        '*://www.streamvault.in/*',
        '*://localhost:5000/*'
    ];

    switch (command) {
        case 'quick-search':
            // Open popup for search (or focus StreamVault search)
            chrome.action.openPopup();
            break;

        case 'open-dms':
            openStreamVaultPath('/messages');
            break;

        case 'open-watchlist':
            openStreamVaultPath('/watchlist');
            break;
    }
});

// ─── Badge Updates ───────────────────────────────────────────────────
async function updateBadge() {
    try {
        const data = await chrome.storage.local.get(['baseUrl']);
        const base = data.baseUrl || 'https://streamvault.live';

        const resp = await fetch(`${base}/api/auth/me`, { credentials: 'include' });
        if (!resp.ok) {
            chrome.action.setBadgeText({ text: '' });
            return;
        }

        const userData = await resp.json();
        const user = userData.user;

        if (!user) {
            chrome.action.setBadgeText({ text: '' });
            return;
        }

        // Store user data for popup/newtab
        await chrome.storage.local.set({
            cachedUser: {
                id: user.id,
                username: user.username,
                displayName: user.displayName || user.username,
                avatarUrl: user.avatarUrl,
                level: user.level,
                xp: user.xp,
                subscription: user.subscription
            },
            lastUserUpdate: Date.now()
        });

        // For now just show a small dot to indicate logged in status
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setBadgeBackgroundColor({ color: '#DC2626' });

    } catch (e) {
        console.log('[StreamVault] Badge update failed:', e.message);
    }
}

// ─── Alarms ──────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'updateBadge') {
        await updateBadge();
    }
    if (alarm.name === 'checkEpisodes') {
        await checkNewEpisodes();
    }
});

async function checkNewEpisodes() {
    try {
        const settings = await chrome.storage.local.get(['notificationsEnabled']);
        if (!settings.notificationsEnabled) return;

        // Future: check for new episodes and show notifications
        console.log('[StreamVault] Checking for new episodes...');
    } catch (e) {
        console.log('[StreamVault] Episode check failed:', e.message);
    }
}

// ─── Message Routing ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
    switch (message.type) {
        // ── Ad Blocking ──
        case 'GET_AD_BLOCK_STATUS':
            const adData = await chrome.storage.local.get(['adBlockEnabled']);
            sendResponse({ enabled: adData.adBlockEnabled !== false });
            break;

        case 'SET_AD_BLOCK':
            await setAdBlockEnabled(message.enabled);
            sendResponse({ success: true });
            break;

        // ── User Data ──
        case 'GET_USER':
            const userData = await chrome.storage.local.get(['cachedUser', 'lastUserUpdate']);
            // Refresh if stale (> 5 min)
            if (!userData.cachedUser || Date.now() - (userData.lastUserUpdate || 0) > 300000) {
                await updateBadge(); // This refreshes cachedUser
                const fresh = await chrome.storage.local.get(['cachedUser']);
                sendResponse({ user: fresh.cachedUser || null });
            } else {
                sendResponse({ user: userData.cachedUser || null });
            }
            break;

        // ── Settings ──
        case 'GET_SETTINGS':
            const settings = await chrome.storage.local.get([
                'adBlockEnabled', 'theme', 'notificationsEnabled'
            ]);
            sendResponse({
                adBlockEnabled: settings.adBlockEnabled !== false,
                theme: settings.theme || 'dark',
                notificationsEnabled: settings.notificationsEnabled !== false
            });
            break;

        case 'SAVE_SETTINGS':
            await chrome.storage.local.set(message.settings);
            if (message.settings.adBlockEnabled !== undefined) {
                await setAdBlockEnabled(message.settings.adBlockEnabled);
            }
            sendResponse({ success: true });
            break;

        // ── Theme ──
        case 'SET_THEME':
            await chrome.storage.local.set({ theme: message.theme });
            broadcastToStreamVaultTabs({ type: 'THEME_CHANGE', theme: message.theme });
            sendResponse({ success: true });
            break;

        // ── Navigation ──
        case 'OPEN_STREAMVAULT':
            await openStreamVaultPath(message.path || '/');
            sendResponse({ success: true });
            break;

        // ── Watch Together (Legacy) ──
        case 'JOIN_ROOM':
            currentRoom = message.roomCode;
            isHost = message.isHost || false;
            chrome.storage.local.set({ currentRoom, isHost });
            broadcastToDriveTabs({ type: 'ROOM_CONNECTED', roomCode: currentRoom });
            broadcastToDriveTabs({ type: 'SET_HOST', isHost });
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
            if (isHost) {
                broadcastToStreamVaultTabs({
                    type: 'EXTENSION_VIDEO_EVENT',
                    action: message.action,
                    time: message.time
                });
            }
            sendResponse({ success: true });
            break;

        case 'STREAMVAULT_SYNC':
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
            sendResponse({ error: 'Unknown message type' });
    }
}

// ─── Helper: Open StreamVault Path ───────────────────────────────────
async function openStreamVaultPath(path) {
    const data = await chrome.storage.local.get(['baseUrl']);
    const base = data.baseUrl || 'https://streamvault.live';
    const fullUrl = `${base}${path}`;

    const svUrls = [
        '*://streamvault.live/*',
        '*://www.streamvault.live/*',
        '*://streamvault.in/*',
        '*://www.streamvault.in/*',
        '*://localhost:5000/*'
    ];

    const tabs = await chrome.tabs.query({ url: svUrls });
    if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, { url: fullUrl, active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
        await chrome.tabs.create({ url: fullUrl });
    }
}

// ─── Helper: Broadcast to Drive Tabs ─────────────────────────────────
async function broadcastToDriveTabs(message) {
    try {
        const tabs = await chrome.tabs.query({
            url: ['*://drive.google.com/*', '*://docs.google.com/*']
        });
        for (const tab of tabs) {
            try { await chrome.tabs.sendMessage(tab.id, message); } catch { }
        }
    } catch { }
}

// ─── Helper: Broadcast to StreamVault Tabs ───────────────────────────
async function broadcastToStreamVaultTabs(message) {
    try {
        const tabs = await chrome.tabs.query({
            url: [
                '*://streamvault.live/*', '*://www.streamvault.live/*',
                '*://streamvault.in/*', '*://www.streamvault.in/*',
                '*://localhost:5000/*'
            ]
        });
        for (const tab of tabs) {
            try { await chrome.tabs.sendMessage(tab.id, message); } catch { }
        }
    } catch { }
}

// ─── Restore State on Startup ────────────────────────────────────────
chrome.storage.local.get(['currentRoom', 'isHost'], (data) => {
    if (chrome.runtime.lastError) return;
    if (data?.currentRoom) {
        currentRoom = data.currentRoom;
        isHost = data.isHost || false;
        isConnected = true;
    }
});
