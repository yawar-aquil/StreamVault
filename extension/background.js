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

// ─── URL Helpers ─────────────────────────────────────────────────────
// Production domains behind Cloudflare — need VPS IP bypass for API calls
const PRODUCTION_DOMAINS = ['streamvault.live', 'www.streamvault.live', 'streamvault.in', 'www.streamvault.in'];
const VPS_API_BASE = 'http://13.205.136.45:5000'; // Direct Express, bypasses Cloudflare
const DEFAULT_API_BASE = VPS_API_BASE;

/**
 * Normalize a base URL: ensure HTTPS for production domains, strip trailing slash
 */
function normalizeBaseUrl(url) {
    if (!url) return url;
    url = url.trim().replace(/\/+$/, '');

    // Force HTTPS for production domains (HTTP causes redirect → CORS preflight failure)
    for (const domain of PRODUCTION_DOMAINS) {
        if (url === `http://${domain}` || url.startsWith(`http://${domain}/`)) {
            url = url.replace('http://', 'https://');
            break;
        }
    }
    return url;
}

/**
 * Resolve the actual API base to use for fetch requests.
 * Cloudflare-protected domains → VPS IP (bypasses Cloudflare bot protection).
 * Localhost / direct IP → use as-is.
 */
function resolveApiBase(url) {
    if (!url) return VPS_API_BASE;
    try {
        const u = new URL(url);
        if (PRODUCTION_DOMAINS.includes(u.hostname)) {
            console.log(`[StreamVault] Routing API through VPS IP (bypassing Cloudflare) for ${u.hostname}`);
            return VPS_API_BASE;
        }
    } catch { }
    return url;
}

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
async function getAuthData() {
    // First check stored base URL for cookie (user-configured, most important)
    const stored = await chrome.storage.local.get(['baseUrl']);
    const domainUrls = [];

    // Prioritize stored base URL
    if (stored.baseUrl) domainUrls.push(stored.baseUrl);

    // Then check common domains
    const defaults = [
        'https://streamvault.in',
        'https://www.streamvault.in',
        'https://streamvault.live',
        'https://www.streamvault.live',
        'http://localhost:5000',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://13.205.136.45:5000',
        'http://13.205.136.45'
    ];
    for (const d of defaults) {
        if (!domainUrls.includes(d)) domainUrls.push(d);
    }

    for (const url of domainUrls) {
        try {
            const cookie = await chrome.cookies.get({ url, name: 'authToken' });
            if (cookie?.value) {
                console.log('[StreamVault] Auth cookie found on:', url);
                return { token: cookie.value, apiBase: url };
            }
        } catch { }
    }

    // Fallback — search ALL cookies for authToken
    try {
        const allCookies = await chrome.cookies.getAll({ name: 'authToken' });
        if (allCookies.length > 0) {
            const svCookie = allCookies.find(c =>
                c.domain.includes('streamvault')
            ) || allCookies.find(c =>
                c.domain.includes('localhost') || c.domain.includes('127.0.0.1')
            ) || allCookies[0];

            if (svCookie?.value) {
                const protocol = svCookie.secure ? 'https' : 'http';
                const domain = svCookie.domain.startsWith('.') ? svCookie.domain.slice(1) : svCookie.domain;
                const apiBase = `${protocol}://${domain}`;
                console.log('[StreamVault] Auth cookie found via getAll on domain:', svCookie.domain, '→ apiBase:', apiBase);
                return { token: svCookie.value, apiBase };
            }
        }
    } catch (e) {
        console.log('[StreamVault] getAll cookies fallback failed:', e.message);
    }

    console.log('[StreamVault] No auth cookie found on any domain');
    return null;
}

// ─── User Fetching & Caching ─────────────────────────────────────────
async function fetchAndCacheUser() {
    // Step 1: Find an auth token (cookie)
    const auth = await getAuthData();

    if (!auth?.token) {
        console.log('[StreamVault] No auth token found, user not logged in');
        await chrome.storage.local.set({ cachedUser: null });
        chrome.action.setBadgeText({ text: '' });
        return null;
    }

    // Step 2: Determine where to send the API request
    // If cookie came from a Cloudflare domain → use VPS IP directly
    // If cookie came from localhost → use localhost
    const apiBase = resolveApiBase(auth.apiBase);
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
    };

    console.log(`[StreamVault] Fetching user from: ${apiBase} (token from: ${auth.apiBase})`);

    try {
        const resp = await fetch(`${apiBase}/api/auth/me`, { headers });

        if (!resp.ok) {
            console.log(`[StreamVault] ${apiBase}/api/auth/me returned ${resp.status}`);
            await chrome.storage.local.set({ cachedUser: null });
            chrome.action.setBadgeText({ text: '' });
            return null;
        }

        const json = await resp.json();
        const user = json.user;

        if (!user) {
            console.log(`[StreamVault] ${apiBase}/api/auth/me returned no user`);
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
        console.log('[StreamVault] User cached successfully:', cached.username);
        return cached;
    } catch (e) {
        console.log(`[StreamVault] User fetch from ${apiBase} failed:`, e.message);
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

                // Normalize & resolve — Cloudflare domains → VPS IP
                const configuredBase = normalizeBaseUrl(store.baseUrl) || 'https://streamvault.in';
                const apiBase = resolveApiBase(configuredBase);
                const query = new URLSearchParams({ title, year: year || '', type: type || '' }).toString();

                // Build auth headers — API key preferred, then Bearer token
                const reqHeaders = {};
                if (store.apiKey) {
                    reqHeaders['X-API-Key'] = store.apiKey;
                } else {
                    // Try cookie for the configured domain (not the resolved VPS IP)
                    try {
                        const cookie = await chrome.cookies.get({ url: configuredBase, name: 'authToken' });
                        if (cookie?.value) {
                            reqHeaders['Authorization'] = `Bearer ${cookie.value}`;
                        }
                    } catch { }

                    // If no cookie, try global auth
                    if (!reqHeaders['Authorization']) {
                        const auth = await getAuthData();
                        if (auth?.token) {
                            reqHeaders['Authorization'] = `Bearer ${auth.token}`;
                        }
                    }
                }

                console.log(`[StreamVault] Checking availability on: ${apiBase} (configured: ${configuredBase}, auth: ${reqHeaders['X-API-Key'] ? 'ApiKey' : reqHeaders['Authorization'] ? 'Bearer' : 'None'})`);

                try {
                    const resp = await fetch(`${apiBase}/api/external/availability?${query}`, { headers: reqHeaders });

                    if (resp.ok) {
                        const data = await resp.json();
                        if (data.url && !data.url.startsWith('http')) {
                            // Use the configured base (not VPS IP) for user-facing URLs
                            data.url = new URL(data.url, configuredBase).href;
                        }
                        data._debug = { usedBase: apiBase, configuredBase, authMethod: reqHeaders['X-API-Key'] ? 'ApiKey' : (reqHeaders['Authorization'] ? 'Bearer' : 'None') };
                        sendResponse(data);
                    } else {
                        sendResponse({ error: `API Error: ${resp.status}`, _debug: { usedBase: apiBase, configuredBase, status: resp.status } });
                    }
                } catch (e) {
                    sendResponse({ error: 'Network error', _debug: { usedBase: apiBase, configuredBase, details: e.message } });
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
