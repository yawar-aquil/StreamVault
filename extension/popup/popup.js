/**
 * StreamVault Extension — Popup Script
 * Search, friends, settings, quick navigation
 */

document.addEventListener('DOMContentLoaded', init);

const TMDB_IMG = 'https://image.tmdb.org/t/p/w92';

async function init() {
    setupTabs();
    setupSearch();
    setupQuickLinks();
    setupSettings();
    loadUserInfo();
    loadFriends();

    document.getElementById('openSV').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: '/' });
        window.close();
    });
}

// ─── Tabs ────────────────────────────────────────────────────────────
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`tab-${target}`).classList.add('active');

            // Focus search input when switching to search tab
            if (target === 'search') {
                setTimeout(() => document.getElementById('searchInput').focus(), 100);
            }
        });
    });
}

// ─── Search ──────────────────────────────────────────────────────────
function setupSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    const quickLinks = document.getElementById('quickLinks');
    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (query.length < 2) {
            results.innerHTML = '';
            quickLinks.style.display = '';
            return;
        }

        quickLinks.style.display = 'none';
        results.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        debounceTimer = setTimeout(() => doSearch(query), 300);
    });

    // Focus search on popup open
    setTimeout(() => input.focus(), 100);
}

async function doSearch(query) {
    const results = document.getElementById('searchResults');

    try {
        // Try StreamVault API first via background
        const data = await chrome.storage.local.get(['baseUrl']);
        const base = data.baseUrl || 'https://streamvault.live';

        const resp = await fetch(
            `${base}/api/tmdb/search/multi?query=${encodeURIComponent(query)}`,
            { credentials: 'include' }
        );

        if (!resp.ok) throw new Error('API failed');
        const json = await resp.json();
        const items = json.results || [];

        if (items.length === 0) {
            results.innerHTML = '<div class="empty-state">No results found</div>';
            return;
        }

        results.innerHTML = items
            .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
            .slice(0, 8)
            .map(item => {
                const title = item.title || item.name || 'Unknown';
                const year = (item.release_date || item.first_air_date || '').substring(0, 4);
                const type = item.media_type;
                const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '';
                const rating = item.vote_average ? item.vote_average.toFixed(1) : '';

                return `
                    <div class="result-item" data-title="${escapeAttr(title)}" data-type="${type}">
                        <img class="result-poster" src="${poster}" onerror="this.style.display='none'" alt="">
                        <div class="result-info">
                            <div class="result-title">${escapeHtml(title)}</div>
                            <div class="result-meta">
                                <span class="result-type ${type}">${type === 'tv' ? 'TV' : 'Movie'}</span>
                                ${year ? ` · ${year}` : ''}
                                ${rating ? ` · ⭐ ${rating}` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        // Click handlers
        results.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', () => {
                const title = item.getAttribute('data-title');
                const type = item.getAttribute('data-type');
                const search = encodeURIComponent(title);
                const path = type === 'tv' ? `/shows?search=${search}` : `/movies?search=${search}`;
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path });
                window.close();
            });
        });
    } catch (err) {
        console.error('Search failed:', err);
        results.innerHTML = '<div class="empty-state">Search failed. Check connection.</div>';
    }
}

// ─── Quick Links ─────────────────────────────────────────────────────
function setupQuickLinks() {
    document.querySelectorAll('.quick-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const path = btn.getAttribute('data-path');
            chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path });
            window.close();
        });
    });
}

// ─── Settings ────────────────────────────────────────────────────────
async function setupSettings() {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });

    if (resp) {
        document.getElementById('adBlockToggle').checked = resp.adBlockEnabled;
        document.getElementById('notifToggle').checked = resp.notificationsEnabled;
        document.getElementById('themeSelect').value = resp.theme || 'dark';
    }

    // Ad block toggle
    document.getElementById('adBlockToggle').addEventListener('change', (e) => {
        chrome.runtime.sendMessage({
            type: 'SAVE_SETTINGS',
            settings: { adBlockEnabled: e.target.checked }
        });
    });

    // Notifications toggle
    document.getElementById('notifToggle').addEventListener('change', (e) => {
        chrome.runtime.sendMessage({
            type: 'SAVE_SETTINGS',
            settings: { notificationsEnabled: e.target.checked }
        });
    });

    // Theme select
    document.getElementById('themeSelect').addEventListener('change', (e) => {
        chrome.runtime.sendMessage({
            type: 'SET_THEME',
            theme: e.target.value
        });
    });
}

// ─── User Info ───────────────────────────────────────────────────────
async function loadUserInfo() {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_USER' });
    const userInfo = document.getElementById('userInfo');
    const statusDot = document.getElementById('statusDot');

    if (resp && resp.user) {
        const user = resp.user;
        userInfo.textContent = user.displayName || user.username;
        statusDot.classList.remove('offline');
        statusDot.title = 'Connected';
    } else {
        userInfo.textContent = 'Not logged in';
        statusDot.classList.add('offline');
        statusDot.title = 'Not connected';
    }
}

// ─── Friends Activity ────────────────────────────────────────────────
async function loadFriends() {
    const list = document.getElementById('friendsList');

    try {
        const data = await chrome.storage.local.get(['baseUrl']);
        const base = data.baseUrl || 'https://streamvault.live';

        const resp = await fetch(`${base}/api/friends`, { credentials: 'include' });
        if (!resp.ok) throw new Error('Not logged in');

        const friends = await resp.json();

        if (!friends || friends.length === 0) {
            list.innerHTML = '<div class="empty-state">No friends yet. Add some on StreamVault!</div>';
            return;
        }

        // Also try to get online users
        let onlineIds = new Set();
        try {
            const onlineResp = await fetch(`${base}/api/users/online`, { credentials: 'include' });
            if (onlineResp.ok) {
                const online = await onlineResp.json();
                onlineIds = new Set(online.map(u => u.id));
            }
        } catch { }

        list.innerHTML = friends.map(friend => {
            const isOnline = onlineIds.has(friend.id);
            const avatar = friend.avatarUrl || '';
            const initial = (friend.displayName || friend.username || '?')[0].toUpperCase();

            return `
                <div class="friend-item">
                    ${avatar
                    ? `<img class="friend-avatar" src="${avatar}" onerror="this.style.display='none'" alt="">`
                    : `<div class="friend-avatar" style="display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:#a1a1aa;">${initial}</div>`
                }
                    <div>
                        <div class="friend-name">${escapeHtml(friend.displayName || friend.username)}</div>
                        <div class="friend-status ${isOnline ? 'online' : ''}">${isOnline ? '● Online' : 'Offline'}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        list.innerHTML = '<div class="empty-state">Log in to StreamVault to see friends</div>';
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
