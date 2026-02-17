// StreamVault External Integrations
// Injects "Watch on StreamVault" buttons into IMDb, TMDB, MAL, and Google

const SV_LOGO = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="url(#paint0_linear)"/>
    <path d="M10 8V16L16 12L10 8Z" fill="white"/>
    <defs>
        <linearGradient id="paint0_linear" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stop-color="#DC2626"/>
            <stop offset="1" stop-color="#EF4444"/>
        </linearGradient>
    </defs>
</svg>
`;

const SV_STYLES = `
.sv-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 6px;
    padding: 6px 12px;
    margin-left: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #e4e4e7;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 9999;
}
.sv-badge:hover {
    background: #27272a;
    border-color: #3f3f46;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    color: #fff;
    text-decoration: none;
}
.sv-badge svg { 
    display: block; 
}
.sv-badge.available {
    border-color: rgba(220, 38, 38, 0.4);
    background: rgba(220, 38, 38, 0.1);
}
.sv-badge.available:hover {
    background: rgba(220, 38, 38, 0.2);
    border-color: #DC2626;
}
`;

function injectStyles() {
    if (document.getElementById('sv-styles')) return;
    const style = document.createElement('style');
    style.id = 'sv-styles';
    style.textContent = SV_STYLES;
    document.head.appendChild(style);
}

function createBadge(url) {
    const badge = document.createElement('a');
    badge.className = 'sv-badge available';
    badge.href = url;
    badge.target = '_blank';
    badge.innerHTML = `${SV_LOGO} <span>Watch on StreamVault</span>`;
    badge.title = "Available on StreamVault";
    return badge;
}

async function checkAvailability(title, year, type) {
    if (!title) return null;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'CHECK_AVAILABILITY',
            payload: { title, year, type }
        });
        return response;
    } catch (e) {
        console.error('[StreamVault] Check failed:', e);
        return null;
    }
}

// ─── Site Parsers ───

async function handleIMDb() {
    const titleEl = document.querySelector('h1');
    if (!titleEl) return;

    const title = titleEl.textContent.trim();
    const yearLink = document.querySelector('a[href*="/releaseinfo"]');
    const year = yearLink ? yearLink.textContent.trim().match(/\d{4}/)?.[0] : null;
    const type = document.querySelector('meta[property="og:type"]')?.content?.includes('video.tv_show') ? 'show' : 'movie';

    console.log('[StreamVault] IMDB Detected:', { title, year, type });

    const result = await checkAvailability(title, year, type);
    if (result && result.available) {
        // Inject next to title or rating
        const ratingBar = document.querySelector('[data-testid="hero-rating-bar__aggregate-rating__score"]');
        const actionContainer = document.querySelector('[data-testid="hero-subnav-bar-left-block"]');

        const badge = createBadge(result.url);

        if (actionContainer) {
            actionContainer.appendChild(badge);
        } else if (titleEl) {
            titleEl.parentNode.appendChild(badge);
        }
    }
}

async function handleTMDB() {
    const titleEl = document.querySelector('h2 a');
    if (!titleEl) return;

    const title = titleEl.textContent.trim();
    const dateEl = document.querySelector('.tag.release_date');
    const year = dateEl ? dateEl.textContent.trim().match(/\d{4}/)?.[0] : null;
    const type = window.location.pathname.includes('/tv/') ? 'show' : 'movie';

    console.log('[StreamVault] TMDB Detected:', { title, year, type });

    const result = await checkAvailability(title, year, type);
    if (result && result.available) {
        const header = document.querySelector('.header .title');
        if (header) {
            header.appendChild(createBadge(result.url));
        }
    }
}

async function handleGoogle() {
    // Knowledge Panel detection
    const kpTitle = document.querySelector('[data-attrid="title"]');
    if (!kpTitle) return;

    const title = kpTitle.textContent.trim();
    const subtitle = document.querySelector('[data-attrid="subtitle"]');
    const type = subtitle?.textContent.includes('TV') || subtitle?.textContent.includes('Series') ? 'show' : 'movie';

    // Extract year from various possible metadata fields
    const metadata = document.body.innerText.match(/Release date: [^0-9]*(\d{4})/);
    const year = metadata ? metadata[1] : null;

    console.log('[StreamVault] Google Detected:', { title, year, type });

    const result = await checkAvailability(title, year, type);
    if (result && result.available) {
        const badge = createBadge(result.url);
        // Inject into the knowledge panel actions
        const actions = document.querySelector('.PZPZlf'); // Watch options container
        if (actions) {
            actions.prepend(badge);
        } else {
            kpTitle.parentNode.appendChild(badge);
        }
    }
}

async function handleMAL() {
    const titleEl = document.querySelector('h1.title-name');
    if (!titleEl) return;

    const title = titleEl.textContent.trim();
    const result = await checkAvailability(title, null, 'anime');

    if (result && result.available) {
        titleEl.parentNode.appendChild(createBadge(result.url));
    }
}

// ─── Main ───

function init() {
    injectStyles();
    const host = window.location.hostname;

    if (host.includes('imdb.com')) handleIMDb();
    else if (host.includes('themoviedb.org')) handleTMDB();
    else if (host.includes('google')) handleGoogle();
    else if (host.includes('myanimelist.net')) handleMAL();
}

// Run on load and handle SPA navigation
init();

// Simple observer for SPA changes
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(init, 1000);
    }
}).observe(document, { subtree: true, childList: true });
