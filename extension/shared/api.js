/**
 * StreamVault Shared API Helper
 * Used by popup, newtab, and background scripts
 */

const STREAMVAULT_DOMAINS = [
    'https://streamvault.live',
    'https://streamvault.in',
    'http://localhost:5000'
];

/**
 * Get the active StreamVault base URL
 * Checks storage first, then tries each domain
 */
async function getBaseUrl() {
    try {
        const data = await chrome.storage.local.get(['baseUrl']);
        if (data.baseUrl) return data.baseUrl;
    } catch { }

    // Try each domain
    for (const url of STREAMVAULT_DOMAINS) {
        try {
            const resp = await fetch(`${url}/api/auth/me`, {
                credentials: 'include',
                signal: AbortSignal.timeout(3000)
            });
            if (resp.ok || resp.status === 401) {
                chrome.storage.local.set({ baseUrl: url });
                return url;
            }
        } catch { }
    }

    return STREAMVAULT_DOMAINS[0]; // fallback
}

/**
 * Make an authenticated API request to StreamVault
 */
async function svFetch(endpoint, options = {}) {
    const base = await getBaseUrl();
    const url = `${base}${endpoint}`;

    const resp = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });

    if (!resp.ok) {
        throw new Error(`API ${resp.status}: ${resp.statusText}`);
    }

    return resp.json();
}

/**
 * Get current user info
 */
async function getCurrentUser() {
    try {
        const data = await svFetch('/api/auth/me');
        return data.user || null;
    } catch {
        return null;
    }
}

/**
 * Search content on StreamVault
 * Uses TMDB-style search since StreamVault fetches from TMDB
 */
async function searchContent(query) {
    if (!query || query.trim().length < 2) return [];

    const base = await getBaseUrl();
    // StreamVault uses TMDB API for search — hit the proxy endpoint
    const resp = await fetch(
        `${base}/api/tmdb/search/multi?query=${encodeURIComponent(query)}`,
        { credentials: 'include' }
    );

    if (!resp.ok) return [];
    const data = await resp.json();
    return data.results || [];
}

/**
 * Get trending content
 */
async function getTrending() {
    try {
        const base = await getBaseUrl();
        const resp = await fetch(`${base}/api/tmdb/trending/all/day`, { credentials: 'include' });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.results || [];
    } catch {
        return [];
    }
}

/**
 * Get user's friends list
 */
async function getFriends() {
    try {
        return await svFetch('/api/friends');
    } catch {
        return [];
    }
}

/**
 * Get online users
 */
async function getOnlineUsers() {
    try {
        return await svFetch('/api/users/online');
    } catch {
        return [];
    }
}

/**
 * Open a StreamVault page in a new tab or focus existing one
 */
async function openStreamVault(path = '/') {
    const base = await getBaseUrl();
    const fullUrl = `${base}${path}`;

    // Check if a StreamVault tab already exists
    const tabs = await chrome.tabs.query({
        url: STREAMVAULT_DOMAINS.map(d => `${d}/*`)
    });

    if (tabs.length > 0) {
        // Focus existing tab and navigate
        await chrome.tabs.update(tabs[0].id, { url: fullUrl, active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
        await chrome.tabs.create({ url: fullUrl });
    }
}
