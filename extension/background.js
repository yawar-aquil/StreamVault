/**
 * StreamVault Extension — Background Service Worker
 * Handles: ad blocking (subscription-gated), Watch Together state,
 *          user auth via cookies, global shortcuts
 */

console.log('[StreamVault] Background service worker initialized');

// ─── State ───────────────────────────────────────────────────────────
let currentRoom = null;
let isConnected = false;
let isHost = false;


const SV_TAB_URLS = [
    '*://streamvault.live/*', '*://www.streamvault.live/*',
    '*://streamvault.in/*', '*://www.streamvault.in/*',
    '*://localhost:5000/*', '*://localhost:3000/*', '*://localhost:5173/*'
];

// ─── Installation / Update ───────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[StreamVault] Extension installed/updated:', details.reason);

    const defaults = {
        adBlockEnabled: false,
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

    chrome.alarms.create('updateUser', { periodInMinutes: 15 });
    await fetchAndCacheUser();
});

// ─── Cookie-based Auth ───────────────────────────────────────────────
// ─── Cookie-based Auth ───────────────────────────────────────────────
async function getAuthData() {
    // Check production domains
    const domains = ['streamvault.live', 'www.streamvault.live', 'streamvault.in', 'www.streamvault.in'];
    for (const d of domains) {
        try {
            const url = `https://${d}`;
            const cookie = await chrome.cookies.get({ url, name: 'authToken' });
            if (cookie?.value) return { token: cookie.value, apiBase: url };
        } catch { }
    }

    // Check localhost ports
    const localPorts = [5000, 3000, 5173];
    for (const port of localPorts) {
        try {
            const url = `http://localhost:${port}`;
            const cookie = await chrome.cookies.get({ url, name: 'authToken' });
            if (cookie?.value) return { token: cookie.value, apiBase: 'http://localhost:5000' }; // API usually on 5000 even if FE is 3000
        } catch { }
    }

    return null;
}

async function authedFetch(path, opts = {}) {
    const auth = await getAuthData();
    if (!auth) throw new Error('Not authenticated');

    // Use the domain where found, or fallback to storage, or default
    const stored = await chrome.storage.local.get(['baseUrl']);
    // If we found a token on a specific domain, prefer that domain for API calls
    // (Exception: localhost FE -> localhost:5000 API assumed above)
    const base = auth.apiBase || stored.baseUrl || 'https://streamvault.live';

    const resp = await fetch(`${base}${path}`, {
        ...opts,
        headers: {
            ...(opts.headers || {}),
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!resp.ok) throw new Error(`API ${resp.status}`);
    return resp.json();
}

// ─── User Fetching & Caching ─────────────────────────────────────────
async function fetchAndCacheUser() {
    try {
        const json = await authedFetch('/api/auth/me');
        const user = json.user;

        if (!user) {
            await chrome.storage.local.set({ cachedUser: null });
            return null;
        }

        const isSubscribed = !!(user.adFreeUntil && new Date(user.adFreeUntil) > new Date());

        const cached = {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            avatarUrl: user.avatarUrl,
            level: user.level,
            xp: user.xp,
            coins: user.coins,
            adFreeUntil: user.adFreeUntil,
            subscriptionType: user.subscriptionType,
            isSubscribed,
            badges: user.badges
        };

        await chrome.storage.local.set({ cachedUser: cached, lastUserUpdate: Date.now() });

        // Force disable ad blocker for non-subscribers
        if (!isSubscribed) {
            await setAdBlockEnabled(false);
        }

        chrome.action.setBadgeText({ text: '' });
        return cached;
    } catch (e) {
        console.log('[StreamVault] User fetch failed:', e.message);
        await chrome.storage.local.set({ cachedUser: null });
        chrome.action.setBadgeText({ text: '' });
        return null;
    }
}

// ─── Ad Blocking (Subscription-gated) ────────────────────────────────
async function setAdBlockEnabled(enabled) {
    await chrome.storage.local.set({ adBlockEnabled: enabled });
    try {
        if (enabled) {
            await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['ad_rules'] });
        } else {
            await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['ad_rules'] });
        }
    } catch (e) {
        console.log('[StreamVault] Ruleset update failed:', e.message);
    }
    broadcastToStreamVaultTabs({ type: 'AD_BLOCK_TOGGLE', enabled });
    console.log('[StreamVault] Ad blocking:', enabled ? 'ON' : 'OFF');
}

// ─── Global Keyboard Shortcuts ───────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
    switch (command) {
        case 'quick-search':
            chrome.action.openPopup();
            break;
        case 'open-watchlist':
            openStreamVaultPath('/watchlist');
            break;
    }
});

// ─── Alarms ──────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'updateUser') await fetchAndCacheUser();
});

// ─── Message Routing ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true;
});

async function handleMessage(message, sender, sendResponse) {
    try {
        switch (message.type) {
            // ── User ──
            case 'GET_USER': {
                const data = await chrome.storage.local.get(['cachedUser', 'lastUserUpdate']);
                if (!data.cachedUser || Date.now() - (data.lastUserUpdate || 0) > 300000) {
                    const user = await fetchAndCacheUser();
                    sendResponse({ user });
                } else {
                    sendResponse({ user: data.cachedUser });
                }
                break;
            }

            // ── Ad Blocking ──
            case 'GET_AD_BLOCK_STATUS': {
                const adData = await chrome.storage.local.get(['adBlockEnabled']);
                sendResponse({ enabled: adData.adBlockEnabled === true });
                break;
            }

            case 'SET_AD_BLOCK': {
                const uData = await chrome.storage.local.get(['cachedUser']);
                if (message.enabled && !uData.cachedUser?.isSubscribed) {
                    sendResponse({ success: false, error: 'Subscription required' });
                    return;
                }
                await setAdBlockEnabled(message.enabled);
                sendResponse({ success: true });
                break;
            }

            // ── Settings ──
            case 'GET_SETTINGS': {
                const settings = await chrome.storage.local.get(['adBlockEnabled', 'notificationsEnabled']);
                const uCheck = await chrome.storage.local.get(['cachedUser']);
                sendResponse({
                    adBlockEnabled: settings.adBlockEnabled === true,
                    notificationsEnabled: settings.notificationsEnabled !== false,
                    isSubscribed: uCheck.cachedUser?.isSubscribed || false
                });
                break;
            }

            case 'SAVE_SETTINGS': {
                if (message.settings.adBlockEnabled !== undefined) {
                    const uCheck = await chrome.storage.local.get(['cachedUser']);
                    if (message.settings.adBlockEnabled && !uCheck.cachedUser?.isSubscribed) {
                        sendResponse({ success: false, error: 'Subscription required for ad blocker' });
                        return;
                    }
                    await setAdBlockEnabled(message.settings.adBlockEnabled);
                }
                const toSave = { ...message.settings };
                delete toSave.adBlockEnabled;
                if (Object.keys(toSave).length > 0) {
                    await chrome.storage.local.set(toSave);
                }
                sendResponse({ success: true });
                break;
            }

            // ── External Integrations ──
            case 'CHECK_AVAILABILITY': {
                const { title, year, type } = message.payload;
                const store = await chrome.storage.local.get(['apiKey', 'baseUrl']);
                const auth = await getAuthData();

                // Use API Key if available, otherwise fall back to Auth Cookie
                const headers = {};
                if (store.apiKey) {
                    headers['X-API-Key'] = store.apiKey;
                } else if (auth?.token) {
                    headers['Authorization'] = `Bearer ${auth.token}`;
                } else {
                    sendResponse({ error: 'No API Key or login session found' });
                    return;
                }

                const base = auth?.apiBase || store.baseUrl || 'https://streamvault.live';
                const query = new URLSearchParams({ title, year: year || '', type: type || '' }).toString();

                try {
                    const resp = await fetch(`${base}/api/external/availability?${query}`, { headers });
                    if (resp.ok) {
                        const data = await resp.json();
                        sendResponse(data);
                    } else {
                        sendResponse({ error: `API Error: ${resp.status}` });
                    }
                } catch (e) {
                    sendResponse({ error: 'Network error' });
                }
                break;
            }

            // ── Navigation ──
            case 'OPEN_STREAMVAULT': {
                await openStreamVaultPath(message.path || '/');
                sendResponse({ success: true });
                break;
            }

            // ── Watch Together ──
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
            case 'BRIDGE_CONNECTED':
                // No badge — room status shown in popup UI
                break;

            default:
                sendResponse({ error: 'Unknown message type' });
        }
    } catch (e) {
        console.error('[StreamVault] Message handler error:', e);
        sendResponse({ error: e.message });
    }
}

// ─── Helper: Open StreamVault Path ───────────────────────────────────
// ─── Helper: Open StreamVault Path ───────────────────────────────────
async function openStreamVaultPath(path) {
    // Try to find where the user is logged in
    const auth = await getAuthData();
    const stored = await chrome.storage.local.get(['baseUrl']);

    // Priority: 1. Authenticated domain, 2. Stored base URL, 3. Default
    const base = auth?.apiBase || stored.baseUrl || 'https://streamvault.live';

    // If localhost API (port 5000), we probably want the frontend (port 3000)
    // This is a heuristic for local dev
    const feBase = base === 'http://localhost:5000' ? 'http://localhost:3000' : base;
    const fullUrl = `${feBase}${path}`;

    try {
        // Check if we already have a tab open with this domain
        const tabs = await chrome.tabs.query({ url: SV_TAB_URLS });

        // Filter tabs to match the target base URL if possible
        const matchingTab = tabs.find(t => t.url.startsWith(feBase));

        if (matchingTab) {
            await chrome.tabs.update(matchingTab.id, { url: fullUrl, active: true });
            await chrome.windows.update(matchingTab.windowId, { focused: true });
        } else if (tabs.length > 0) {
            // Fallback to any StreamVault tab
            await chrome.tabs.update(tabs[0].id, { url: fullUrl, active: true });
            await chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            await chrome.tabs.create({ url: fullUrl });
        }
    } catch {
        await chrome.tabs.create({ url: fullUrl });
    }
}

// ─── Broadcast Helpers ───────────────────────────────────────────────
async function broadcastToDriveTabs(message) {
    try {
        const tabs = await chrome.tabs.query({ url: ['*://drive.google.com/*', '*://docs.google.com/*'] });
        for (const tab of tabs) {
            try { await chrome.tabs.sendMessage(tab.id, message); } catch { }
        }
    } catch { }
}

async function broadcastToStreamVaultTabs(message) {
    try {
        const tabs = await chrome.tabs.query({ url: SV_TAB_URLS });
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

fetchAndCacheUser();
