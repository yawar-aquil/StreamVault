/**
 * StreamVault Extension — New Tab Dashboard Script
 * Greeting, search, trending, friends
 */

const TMDB_IMG = 'https://image.tmdb.org/t/p/w185';

document.addEventListener('DOMContentLoaded', init);

async function init() {
    setGreeting();
    setDate();
    setupSearch();
    setupQuickAccess();
    setupUserAvatar();
    loadTrending();
    loadFriends();
}

// ─── Greeting ────────────────────────────────────────────────────────
function setGreeting() {
    const h = new Date().getHours();
    let greeting;
    if (h < 5) greeting = 'Good night';
    else if (h < 12) greeting = 'Good morning';
    else if (h < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    // Try to get user name
    chrome.storage.local.get(['cachedUser'], (data) => {
        const user = data?.cachedUser;
        const name = user?.displayName || user?.username;
        document.getElementById('greeting').querySelector('h1').textContent =
            name ? `${greeting}, ${name}` : greeting;
    });
}

function setDate() {
    const now = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

// ─── User Avatar ─────────────────────────────────────────────────────
function setupUserAvatar() {
    chrome.storage.local.get(['cachedUser'], (data) => {
        const user = data?.cachedUser;
        const avatarEl = document.getElementById('userAvatar');

        if (user?.avatarUrl) {
            avatarEl.innerHTML = `<img src="${user.avatarUrl}" onerror="this.parentElement.textContent='${(user.displayName || user.username || '?')[0].toUpperCase()}'" alt="">`;
        } else if (user?.username) {
            avatarEl.textContent = user.username[0].toUpperCase();
        }

        avatarEl.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: '/profile' });
        });
    });
}

// ─── Search ──────────────────────────────────────────────────────────
function setupSearch() {
    const input = document.getElementById('searchInput');
    const overlay = document.getElementById('searchOverlay');
    const results = document.getElementById('searchResults');
    let debounce;

    input.addEventListener('input', () => {
        clearTimeout(debounce);
        const q = input.value.trim();

        if (q.length < 2) {
            overlay.style.display = 'none';
            return;
        }

        overlay.style.display = '';
        results.innerHTML = '<div class="loading-text" style="padding:16px;text-align:center;">Searching...</div>';

        debounce = setTimeout(() => searchContent(q), 300);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar') && !e.target.closest('.search-overlay')) {
            overlay.style.display = 'none';
        }
    });

    // Close on Escape
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            overlay.style.display = 'none';
            input.blur();
        }
    });
}

async function searchContent(query) {
    const results = document.getElementById('searchResults');

    try {
        const data = await chrome.storage.local.get(['baseUrl']);
        const base = data.baseUrl || 'https://streamvault.live';

        const resp = await fetch(
            `${base}/api/tmdb/search/multi?query=${encodeURIComponent(query)}`,
            { credentials: 'include' }
        );

        if (!resp.ok) throw new Error('Search failed');
        const json = await resp.json();
        const items = (json.results || [])
            .filter(i => i.media_type === 'movie' || i.media_type === 'tv')
            .slice(0, 8);

        if (items.length === 0) {
            results.innerHTML = '<div class="loading-text" style="padding:16px;text-align:center;">No results found</div>';
            return;
        }

        results.innerHTML = items.map(item => {
            const title = item.title || item.name || 'Unknown';
            const year = (item.release_date || item.first_air_date || '').substring(0, 4);
            const type = item.media_type;
            const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '';
            const rating = item.vote_average ? item.vote_average.toFixed(1) : '';

            return `
                <div class="sr-item" data-title="${escapeAttr(title)}" data-type="${type}">
                    <img class="sr-poster" src="${poster}" onerror="this.style.visibility='hidden'" alt="">
                    <div class="sr-info">
                        <div class="sr-title">${esc(title)}</div>
                        <div class="sr-meta">
                            <span class="sr-type ${type}">${type === 'tv' ? 'TV' : 'Movie'}</span>
                            ${year ? ` · ${year}` : ''}
                            ${rating ? ` · ⭐ ${rating}` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        results.querySelectorAll('.sr-item').forEach(el => {
            el.addEventListener('click', () => {
                const title = el.getAttribute('data-title');
                const type = el.getAttribute('data-type');
                const path = type === 'tv'
                    ? `/shows?search=${encodeURIComponent(title)}`
                    : `/movies?search=${encodeURIComponent(title)}`;
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path });
            });
        });
    } catch (err) {
        results.innerHTML = '<div class="loading-text" style="padding:16px;text-align:center;">Search failed</div>';
    }
}

// ─── Quick Access ────────────────────────────────────────────────────
function setupQuickAccess() {
    document.querySelectorAll('.qa-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: btn.dataset.path });
        });
    });

    document.querySelectorAll('.see-all').forEach(btn => {
        btn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: btn.dataset.path });
        });
    });
}

// ─── Trending ────────────────────────────────────────────────────────
async function loadTrending() {
    const row = document.getElementById('trendingRow');

    try {
        const data = await chrome.storage.local.get(['baseUrl']);
        const base = data.baseUrl || 'https://streamvault.live';

        const resp = await fetch(`${base}/api/tmdb/trending/all/day`, { credentials: 'include' });
        if (!resp.ok) throw new Error('Failed');

        const json = await resp.json();
        const items = (json.results || [])
            .filter(i => i.media_type === 'movie' || i.media_type === 'tv')
            .slice(0, 10);

        if (items.length === 0) {
            row.innerHTML = '<div class="empty-state-nt">No trending content available</div>';
            return;
        }

        row.innerHTML = items.map(item => {
            const title = item.title || item.name || 'Unknown';
            const year = (item.release_date || item.first_air_date || '').substring(0, 4);
            const type = item.media_type;
            const poster = item.poster_path ? `${TMDB_IMG}${item.poster_path}` : '';

            return `
                <div class="card" data-title="${escapeAttr(title)}" data-type="${type}">
                    <img class="card-poster" src="${poster}" onerror="this.style.visibility='hidden'" alt="${esc(title)}" loading="lazy">
                    <div class="card-title">${esc(title)}</div>
                    <div class="card-meta">${year} · ${type === 'tv' ? 'TV Show' : 'Movie'}</div>
                </div>
            `;
        }).join('');

        row.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const title = card.getAttribute('data-title');
                const type = card.getAttribute('data-type');
                const path = type === 'tv'
                    ? `/shows?search=${encodeURIComponent(title)}`
                    : `/movies?search=${encodeURIComponent(title)}`;
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path });
            });
        });
    } catch (err) {
        row.innerHTML = '<div class="empty-state-nt">Could not load trending content</div>';
    }
}

// ─── Friends Online ──────────────────────────────────────────────────
async function loadFriends() {
    const container = document.getElementById('friendsOnline');

    try {
        const data = await chrome.storage.local.get(['baseUrl']);
        const base = data.baseUrl || 'https://streamvault.live';

        const [friendsResp, onlineResp] = await Promise.all([
            fetch(`${base}/api/friends`, { credentials: 'include' }),
            fetch(`${base}/api/users/online`, { credentials: 'include' }).catch(() => null)
        ]);

        if (!friendsResp.ok) throw new Error('Not logged in');

        const friends = await friendsResp.json();
        let onlineIds = new Set();

        if (onlineResp?.ok) {
            const online = await onlineResp.json();
            onlineIds = new Set(online.map(u => u.id));
        }

        // Show only online friends, or first 8 if none online
        let display = friends.filter(f => onlineIds.has(f.id));
        if (display.length === 0) {
            display = friends.slice(0, 8);
        }

        if (display.length === 0) {
            container.innerHTML = '<div class="empty-state-nt">No friends yet</div>';
            return;
        }

        container.innerHTML = display.map(f => {
            const isOnline = onlineIds.has(f.id);
            const name = f.displayName || f.username || 'User';
            const initial = name[0].toUpperCase();
            const avatar = f.avatarUrl;

            return `
                <div class="friend-chip" data-path="/profile/${f.id}">
                    <div class="friend-chip-avatar" style="${!isOnline ? '--online-display:none' : ''}">
                        ${avatar
                    ? `<img src="${avatar}" onerror="this.parentElement.textContent='${initial}'" alt="">`
                    : initial
                }
                    </div>
                    <span class="friend-chip-name">${esc(name)}</span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.friend-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: chip.dataset.path });
            });
        });
    } catch (err) {
        container.innerHTML = '<div class="empty-state-nt">Log in to StreamVault to see friends</div>';
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
