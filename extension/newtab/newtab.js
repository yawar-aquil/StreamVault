/**
 * StreamVault Extension — New Tab Dashboard
 * All API calls routed through background.js for proper auth
 */

document.addEventListener('DOMContentLoaded', init);

function init() {
    setupGreeting();
    setupSearch();
    setupQuickAccess();
    loadUser();
    loadTrending();
    loadFriends();
}

// ─── Greeting ────────────────────────────────────────────────────────
function setupGreeting() {
    const h1 = document.querySelector('#greeting h1');
    const dateEl = document.getElementById('currentDate');
    const hour = new Date().getHours();

    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    // Personalize with username
    chrome.runtime.sendMessage({ type: 'GET_USER' }, (resp) => {
        if (resp?.user) {
            h1.textContent = `${greeting}, ${resp.user.displayName || resp.user.username}`;
        } else {
            h1.textContent = greeting;
        }
    });

    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
}

// ─── User Avatar ─────────────────────────────────────────────────────
async function loadUser() {
    try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_USER' });
        const avatar = document.getElementById('userAvatar');
        const section = document.getElementById('userSection');

        if (resp?.user) {
            if (resp.user.avatarUrl) {
                avatar.innerHTML = `<img src="${resp.user.avatarUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                avatar.textContent = (resp.user.displayName || resp.user.username || '?')[0].toUpperCase();
            }
            section.style.cursor = 'pointer';
            section.addEventListener('click', () => {
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: '/profile' });
            });
        }
    } catch { }
}

// ─── Search ──────────────────────────────────────────────────────────
function setupSearch() {
    const input = document.getElementById('searchInput');
    const overlay = document.getElementById('searchOverlay');
    const results = document.getElementById('searchResults');
    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (query.length < 2) {
            overlay.style.display = 'none';
            results.innerHTML = '';
            return;
        }

        overlay.style.display = '';
        results.innerHTML = '<div class="search-loading"><div class="spinner"></div></div>';

        debounceTimer = setTimeout(() => doSearch(query), 300);
    });

    // Close overlay on click outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
            input.value = '';
        }
    });

    // ESC to close
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            overlay.style.display = 'none';
            input.value = '';
            input.blur();
        }
    });
}

async function doSearch(query) {
    const results = document.getElementById('searchResults');

    try {
        const resp = await chrome.runtime.sendMessage({ type: 'SEARCH_TMDB', query });

        if (!resp || resp.error) {
            results.innerHTML = '<div class="no-results">Search failed. Try again.</div>';
            return;
        }

        const items = resp.results || [];
        if (items.length === 0) {
            results.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        results.innerHTML = items.map(item => `
            <div class="search-result-item" data-title="${esc(item.title)}" data-type="${item.type}">
                ${item.poster
                ? `<img class="sr-poster" src="${item.poster}" onerror="this.style.display='none'" alt="">`
                : '<div class="sr-poster"></div>'
            }
                <div class="sr-info">
                    <div class="sr-title">${esc(item.title)}</div>
                    <div class="sr-meta">
                        <span class="sr-type ${item.type}">${item.type === 'tv' ? 'TV Show' : 'Movie'}</span>
                        ${item.year ? ` · ${item.year}` : ''}
                        ${item.rating ? ` · ⭐ ${item.rating}` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        results.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const title = el.getAttribute('data-title');
                const type = el.getAttribute('data-type');
                const search = encodeURIComponent(title);
                const path = type === 'tv' ? `/shows?search=${search}` : `/movies?search=${search}`;
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path });
            });
        });
    } catch (err) {
        results.innerHTML = '<div class="no-results">Search failed. Try again.</div>';
    }
}

// ─── Quick Access Buttons ────────────────────────────────────────────
function setupQuickAccess() {
    document.querySelectorAll('.qa-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: btn.getAttribute('data-path') });
        });
    });

    document.querySelectorAll('.see-all').forEach(btn => {
        btn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: btn.getAttribute('data-path') });
        });
    });
}

// ─── Trending ────────────────────────────────────────────────────────
async function loadTrending() {
    const row = document.getElementById('trendingRow');

    try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_TRENDING' });

        if (!resp || resp.error || !resp.results?.length) {
            row.innerHTML = '<div class="no-results">Could not load trending</div>';
            return;
        }

        const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

        row.innerHTML = resp.results.map(item => `
            <div class="content-card" data-title="${esc(item.title)}" data-type="${item.type}">
                ${item.poster
                ? `<img src="${item.poster.replace('/w185/', '/w342/')}" alt="${esc(item.title)}" onerror="this.style.display='none'">`
                : '<div class="card-placeholder"></div>'
            }
                <div class="card-info">
                    <div class="card-title">${esc(item.title)}</div>
                    <div class="card-meta">${item.type === 'tv' ? 'TV' : 'Movie'} ${item.year ? ` · ${item.year}` : ''} ${item.rating ? ` · ⭐ ${item.rating}` : ''}</div>
                </div>
            </div>
        `).join('');

        row.querySelectorAll('.content-card').forEach(card => {
            card.addEventListener('click', () => {
                const title = card.getAttribute('data-title');
                const type = card.getAttribute('data-type');
                const search = encodeURIComponent(title);
                const path = type === 'tv' ? `/shows?search=${search}` : `/movies?search=${search}`;
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path });
            });
        });
    } catch {
        row.innerHTML = '<div class="no-results">Could not load trending</div>';
    }
}

// ─── Friends ─────────────────────────────────────────────────────────
async function loadFriends() {
    const container = document.getElementById('friendsOnline');

    try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_FRIENDS' });

        if (!resp || resp.error) {
            container.innerHTML = '<div class="loading-text">Log in to StreamVault to see friends</div>';
            return;
        }

        const friends = resp.friends || [];
        if (friends.length === 0) {
            container.innerHTML = '<div class="loading-text">No friends yet — add some on StreamVault!</div>';
            return;
        }

        container.innerHTML = friends.map(friend => {
            const name = friend.displayName || friend.username || 'User';
            const avatar = friend.avatarUrl;
            const initial = name[0].toUpperCase();
            const lastActive = friend.lastActiveAt ? formatTimeAgo(new Date(friend.lastActiveAt)) : null;

            return `
                <div class="friend-chip" data-id="${friend.id}" title="${esc(name)}${lastActive ? ` — Active ${lastActive}` : ''}">
                    ${avatar
                    ? `<img src="${avatar}" alt="" onerror="this.textContent='${initial}'">`
                    : `<div class="avatar-placeholder">${initial}</div>`
                }
                    <span>${esc(name)}</span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.friend-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const id = chip.getAttribute('data-id');
                chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: `/profile/${id}` });
            });
        });

    } catch {
        container.innerHTML = '<div class="loading-text">Could not load friends</div>';
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────
function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}
