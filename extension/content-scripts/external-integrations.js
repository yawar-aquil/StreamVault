// StreamVault External Integrations
// Injects "Watch on StreamVault" buttons into IMDb, TMDB, MAL, and Google

const SV_LOGO = (() => {
    // Dynamic getter for the logo URL
    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    return `<img src="${logoUrl}" width="16" height="16" style="display:block; border-radius: 4px;" alt="SV" />`;
})();

const SV_STYLES = `
/* ─── Shared ─── */
.sv-badge, .sv-imdb-btn, .sv-tmdb-btn {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    text-decoration: none !important;
    cursor: pointer;
    box-sizing: border-box;
}

/* ─── Generic Badge (Google mini / fallback) ─── */
.sv-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 6px;
    padding: 6px 12px;
    margin-left: 12px;
    color: #e4e4e7;
    font-size: 13px;
    font-weight: 600;
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
}
.sv-badge svg { display: block; }
.sv-badge.available {
    border-color: rgba(220, 38, 38, 0.4);
    background: rgba(220, 38, 38, 0.1);
}
.sv-badge.available:hover {
    background: rgba(220, 38, 38, 0.2);
    border-color: #DC2626;
}

/* ─── IMDb Premium Button ─── */
.sv-imdb-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, #f5c518 0%, #e6b800 100%);
    color: #000 !important;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.3px;
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    box-shadow: 0 4px 16px rgba(245, 197, 24, 0.3), 0 0 0 1px rgba(245, 197, 24, 0.15);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    z-index: 9999;
}
.sv-imdb-btn::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
    transition: left 0.5s;
}
.sv-imdb-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 24px rgba(245, 197, 24, 0.45), 0 0 0 2px rgba(245, 197, 24, 0.3);
    color: #000 !important;
}
.sv-imdb-btn:hover::before { left: 100%; }
.sv-imdb-btn .sv-play-icon {
    width: 18px; height: 18px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.15);
    border-radius: 50%;
    flex-shrink: 0;
}
.sv-imdb-btn .sv-logo-img {
    width: 20px; height: 20px;
    border-radius: 4px;
    object-fit: contain;
    flex-shrink: 0;
}
.sv-imdb-btn .sv-text-group {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}
.sv-imdb-btn .sv-text-main {
    font-size: 14px;
    font-weight: 700;
}
.sv-imdb-btn .sv-text-sub {
    font-size: 10px;
    font-weight: 500;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.8px;
}

/* ─── IMDb Where To Watch Card ─── */
.sv-imdb-provider {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(245, 197, 24, 0.08);
    border: 1px solid rgba(245, 197, 24, 0.2);
    border-radius: 8px;
    padding: 12px 16px;
    margin-top: 12px;
    transition: all 0.25s;
    cursor: pointer;
}
.sv-imdb-provider:hover {
    background: rgba(245, 197, 24, 0.15);
    border-color: rgba(245, 197, 24, 0.4);
    transform: translateX(4px);
}
.sv-imdb-provider .sv-provider-logo {
    width: 40px; height: 40px;
    border-radius: 8px;
    object-fit: contain;
    background: #000;
    flex-shrink: 0;
}
.sv-imdb-provider .sv-provider-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.sv-imdb-provider .sv-provider-name {
    color: #f5c518;
    font-size: 14px;
    font-weight: 700;
}
.sv-imdb-provider .sv-provider-type {
    color: rgba(255,255,255,0.5);
    font-size: 12px;
    font-weight: 500;
}
.sv-imdb-provider .sv-provider-arrow {
    margin-left: auto;
    color: rgba(255,255,255,0.3);
    font-size: 18px;
    transition: transform 0.2s, color 0.2s;
}
.sv-imdb-provider:hover .sv-provider-arrow {
    transform: translateX(4px);
    color: #f5c518;
}

/* ─── TMDB Premium Button ─── */
.sv-tmdb-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, #01b4e4 0%, #0d253f 100%);
    color: #fff !important;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.3px;
    padding: 10px 20px;
    border-radius: 20px;
    border: none;
    box-shadow: 0 4px 16px rgba(1, 180, 228, 0.3), 0 0 0 1px rgba(1, 180, 228, 0.15);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    z-index: 9999;
}
.sv-tmdb-btn::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transition: left 0.5s;
}
.sv-tmdb-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 6px 24px rgba(1, 180, 228, 0.45), 0 0 0 2px rgba(1, 180, 228, 0.3);
    color: #fff !important;
}
.sv-tmdb-btn:hover::before { left: 100%; }
.sv-tmdb-btn .sv-play-icon {
    width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    flex-shrink: 0;
}
.sv-tmdb-btn .sv-logo-img {
    width: 20px; height: 20px;
    border-radius: 4px;
    object-fit: contain;
    flex-shrink: 0;
}
.sv-tmdb-btn .sv-text-group {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}
.sv-tmdb-btn .sv-text-main {
    font-size: 14px;
    font-weight: 700;
}
.sv-tmdb-btn .sv-text-sub {
    font-size: 10px;
    font-weight: 500;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.8px;
}

/* ─── TMDB Where To Watch Card ─── */
.sv-tmdb-provider {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(1, 180, 228, 0.08);
    border: 1px solid rgba(1, 180, 228, 0.2);
    border-radius: 10px;
    padding: 12px 16px;
    margin-top: 12px;
    transition: all 0.25s;
    cursor: pointer;
}
.sv-tmdb-provider:hover {
    background: rgba(1, 180, 228, 0.15);
    border-color: rgba(1, 180, 228, 0.4);
    transform: translateX(4px);
}
.sv-tmdb-provider .sv-provider-logo {
    width: 40px; height: 40px;
    border-radius: 8px;
    object-fit: contain;
    background: #000;
    flex-shrink: 0;
}
.sv-tmdb-provider .sv-provider-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.sv-tmdb-provider .sv-provider-name {
    color: #01b4e4;
    font-size: 14px;
    font-weight: 700;
}
.sv-tmdb-provider .sv-provider-type {
    color: rgba(255,255,255,0.5);
    font-size: 12px;
    font-weight: 500;
}
.sv-tmdb-provider .sv-provider-arrow {
    margin-left: auto;
    color: rgba(255,255,255,0.3);
    font-size: 18px;
    transition: transform 0.2s, color 0.2s;
}
.sv-tmdb-provider:hover .sv-provider-arrow {
    transform: translateX(4px);
    color: #01b4e4;
}

/* ─── Pulse animation for "available" indicators ─── */
@keyframes sv-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}
.sv-pulse { animation: sv-pulse 2s ease-in-out infinite; }

/* ─── Entrance animation ─── */
@keyframes sv-slide-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
.sv-animate-in { animation: sv-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
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
    badge.style.marginBottom = "10px";
    badge.style.marginTop = "5px";
    return badge;
}

// ─── Premium Button Builders ───

const SV_PLAY_SVG = `<svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0L10 6L0 12V0Z"/></svg>`;

function createIMDbButton(url) {
    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    const btn = document.createElement('a');
    btn.className = 'sv-imdb-btn sv-animate-in';
    btn.href = url;
    btn.target = '_blank';
    btn.title = 'Watch free on StreamVault';
    btn.innerHTML = `
        <img class="sv-logo-img" src="${logoUrl}" alt="SV" />
        <div class="sv-text-group">
            <span class="sv-text-main">Watch on StreamVault</span>
            <span class="sv-text-sub">Free · No Ads</span>
        </div>
        <span class="sv-play-icon">${SV_PLAY_SVG}</span>
    `;
    return btn;
}

function createIMDbProviderCard(url) {
    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    const card = document.createElement('a');
    card.className = 'sv-imdb-provider sv-animate-in';
    card.href = url;
    card.target = '_blank';
    card.innerHTML = `
        <img class="sv-provider-logo" src="${logoUrl}" alt="StreamVault" />
        <div class="sv-provider-info">
            <span class="sv-provider-name">StreamVault</span>
            <span class="sv-provider-type">Free Streaming</span>
        </div>
        <span class="sv-provider-arrow">→</span>
    `;
    return card;
}

function createTMDBButton(url) {
    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    const btn = document.createElement('a');
    btn.className = 'sv-tmdb-btn sv-animate-in';
    btn.href = url;
    btn.target = '_blank';
    btn.title = 'Watch free on StreamVault';
    btn.innerHTML = `
        <img class="sv-logo-img" src="${logoUrl}" alt="SV" />
        <div class="sv-text-group">
            <span class="sv-text-main">Watch on StreamVault</span>
            <span class="sv-text-sub">Free · No Ads</span>
        </div>
        <span class="sv-play-icon">${SV_PLAY_SVG}</span>
    `;
    return btn;
}

function createTMDBProviderCard(url) {
    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    const card = document.createElement('a');
    card.className = 'sv-tmdb-provider sv-animate-in';
    card.href = url;
    card.target = '_blank';
    card.innerHTML = `
        <img class="sv-provider-logo" src="${logoUrl}" alt="StreamVault" />
        <div class="sv-provider-info">
            <span class="sv-provider-name">StreamVault</span>
            <span class="sv-provider-type">Free Streaming</span>
        </div>
        <span class="sv-provider-arrow">→</span>
    `;
    return card;
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
        // 1. Premium button in the hero section
        const heroActions = document.querySelector('[data-testid="hero-rating-bar__aggregate-rating"]')?.closest('div')?.parentElement
            || document.querySelector('[data-testid="hero-subnav-bar-left-block"]')
            || titleEl.closest('div');

        if (heroActions && !heroActions.querySelector('.sv-imdb-btn')) {
            const btn = createIMDbButton(result.url);
            // Try to insert after the rating bar or at the end of the hero
            const ratingBar = heroActions.querySelector('[data-testid="hero-rating-bar__aggregate-rating"]');
            if (ratingBar) {
                ratingBar.closest('div')?.parentElement?.appendChild(btn);
            } else {
                heroActions.appendChild(btn);
            }
        }

        // 2. Provider card — find "Watch" or "Where to Watch" section
        const allSections = document.querySelectorAll('[data-testid]');
        let watchSection = null;
        allSections.forEach(el => {
            const testId = el.getAttribute('data-testid') || '';
            if (testId.includes('watch') || testId.includes('Watch')) {
                watchSection = el;
            }
        });

        // Also try the sidebar
        if (!watchSection) {
            const sidebarHeaders = document.querySelectorAll('h3, h4, span');
            sidebarHeaders.forEach(h => {
                const txt = (h.textContent || '').trim().toLowerCase();
                if (txt.includes('where to watch') || txt.includes('streaming')) {
                    watchSection = h.closest('section') || h.closest('div');
                }
            });
        }

        if (watchSection && !watchSection.querySelector('.sv-imdb-provider')) {
            watchSection.appendChild(createIMDbProviderCard(result.url));
        }
    }
}

async function handleTMDB() {
    // TMDB movie/tv detail page
    const titleEl = document.querySelector('.title h2 a') || document.querySelector('h2 a') || document.querySelector('.title h2');
    if (!titleEl) return;

    const title = titleEl.textContent.trim();
    const dateEl = document.querySelector('.tag.release_date') || document.querySelector('.release');
    const year = dateEl ? dateEl.textContent.trim().match(/\d{4}/)?.[0] : null;
    const type = window.location.pathname.includes('/tv/') ? 'show' : 'movie';

    console.log('[StreamVault] TMDB Detected:', { title, year, type });

    const result = await checkAvailability(title, year, type);
    if (result && result.available) {
        // 1. Premium button in the header facts/actions area
        const headerActions = document.querySelector('.header_info .facts')
            || document.querySelector('.header_info')
            || document.querySelector('.header .title');

        if (headerActions && !headerActions.querySelector('.sv-tmdb-btn')) {
            const btn = createTMDBButton(result.url);
            btn.style.marginTop = '12px';
            headerActions.appendChild(btn);
        }

        // 2. Provider card — find "Where to Watch" / streaming providers section (JustWatch widget)
        const olaSections = document.querySelectorAll('.ott_provider, .where_to_watch, .watch_providers');
        let providerSection = olaSections.length > 0 ? olaSections[0] : null;

        if (!providerSection) {
            const allHeaders = document.querySelectorAll('h3, h4, .title');
            allHeaders.forEach(h => {
                const txt = (h.textContent || '').trim().toLowerCase();
                if (txt.includes('where to watch') || txt.includes('stream')) {
                    providerSection = h.closest('section') || h.closest('div');
                }
            });
        }

        if (providerSection && !providerSection.querySelector('.sv-tmdb-provider')) {
            providerSection.appendChild(createTMDBProviderCard(result.url));
        }
    }
}

// ─── Persistence & Global Scanning ───

// We need a global state to track the last successful result so we can re-inject
let lastResult = null;

// Global Scanner that runs periodically
setInterval(() => {
    if (!lastResult || !lastResult.available) return;

    // 1. Where to Watch List
    const wtwContainers = findAllWhereToWatchContainers();
    wtwContainers.forEach(container => {
        if (!container.querySelector('.sv-injected-item')) {
            console.log('[StreamVault] Re-injecting into Where to Watch (Global Scan)...');
            injectWhereToWatch(lastResult, container);
        }
    });

    // 2. Watch Action — re-inject if our button disappeared (e.g. Google re-rendered)
    if (!document.querySelector('.sv-injected-button')) {
        injectWatchAction(lastResult);
    }

}, 1500);

// Helper to find all valid "Where to watch" list containers currently in the DOM
function findAllWhereToWatchContainers() {
    // Find the "Where to watch" header element (exact text, leaf node)
    const allEls = Array.from(document.querySelectorAll('*'));
    const header = allEls.find(el => {
        const txt = (el.innerText || el.textContent || '').trim();
        return (txt === 'Where to watch' || txt === 'Ways to watch') && el.children.length === 0;
    });
    if (!header) return [];

    // Walk up from header to find a container that has child items with LINKS (not just text)
    let scope = header.parentElement;
    for (let i = 0; i < 8 && scope && scope !== document.body; i++) {
        // A valid "Where to watch" container has children that contain <a> tags
        const childLinks = Array.from(scope.children).filter(c => c.querySelector('a') || c.tagName === 'A');
        if (childLinks.length >= 1) {
            // Verify it's a streaming container (has an img in the items)
            const hasImg = childLinks.some(c => c.querySelector('img'));
            if (hasImg) return [scope];
        }
        scope = scope.parentElement;
    }
    return [];
}

function findAllWatchActionContainers() {
    return []; // Not used anymore - injectWatchAction handles finding directly
}


async function handleGoogle() {
    // Knowledge Panel detection
    const kpTitle = document.querySelector('[data-attrid="title"]');
    if (!kpTitle) return;

    const title = kpTitle.textContent.trim();
    const subtitle = document.querySelector('[data-attrid="subtitle"]');
    const metadataText = document.body.innerText;

    let type = 'movie';
    if (subtitle?.textContent.includes('TV') || subtitle?.textContent.includes('Series') || subtitle?.textContent.includes('Season')) {
        type = 'show';
    } else if (metadataText.includes('TV Series') || metadataText.match(/Season \d+/)) {
        type = 'show';
    }

    // Extract year from various possible metadata fields
    const metadata = document.body.innerText.match(/Release date: [^0-9]*(\d{4})/);
    const year = metadata ? metadata[1] : null;

    console.log('[StreamVault] Google Detected:', { title, year, type });

    const result = await checkAvailability(title, year, type);
    console.log('[StreamVault] Check Result:', result);

    if (result && result.available) {
        lastResult = result; // SAVE FOR GLOBAL SCANNER

        // Initial Injection Attempt
        injectWhereToWatch(result);
        injectWatchAction(result);

        // Mini badges (Search Results) - these don't need persistent scanning usually
        // Target h3s inside standard and mobile containers (div.g, div.xpd, div.mnr-c)
        const searchResults = document.querySelectorAll('div.g h3, a > h3, div.xpd div[role="heading"], div.mnr-c div[role="heading"]');
        const miniBadgeTitle = `Watch ${result.title} on StreamVault`;
        let injectedCount = 0;

        searchResults.forEach(h3 => {
            // Only inject into blue title links — h3 must be inside an <a> tag (the clickable title)
            if (!h3.closest('a')) return;
            // Skip Knowledge Panel, featured snippets, People also search for
            if (h3.closest('.kno-kp')) return;
            if (h3.closest('.g-blk')) return;
            if (h3.closest('[data-q]')) return; // People also search for cards
            if (h3.closest('.kp-wholepage')) return;
            // Skip if already injected
            if (h3.querySelector('.sv-badge-mini')) return;

            const text = h3.textContent.trim();
            // Must have spaces (real titles, not site names)
            if (!text.includes(' ')) return;

            const targetTitle = result.title.toLowerCase();
            if (text.toLowerCase().includes(targetTitle)) {
                const mini = createMiniBadge(result.url, miniBadgeTitle);
                h3.style.display = 'inline-flex';
                h3.style.alignItems = 'center';
                h3.style.gap = '4px';
                h3.appendChild(mini);
                injectedCount++;
            }
        });
        console.log(`[StreamVault] Injected mini-badge into ${injectedCount} search results`);
    } else {
        console.log('[StreamVault] Not available or check failed');
    }
}

// Update inject functions to accept optional container
function injectWhereToWatch(result, specificContainer = null) {
    // Use strict header-based container finding to avoid injecting into ratings sections
    const containers = findAllWhereToWatchContainers();
    const container = specificContainer || (containers.length > 0 ? containers[0] : null);

    if (!container) return;
    if (container.querySelector('.sv-injected-item')) return;

    // Find a template link item inside the container (a child that has an <a> and <img>)
    const templateLink = Array.from(container.children).find(c =>
        (c.querySelector('a') || c.tagName === 'A') && c.querySelector('img')
    ) || container.querySelector('a');

    if (!templateLink) return;

    // The item wrapper is the direct child of container
    let itemWrapper = templateLink;
    while (itemWrapper.parentElement && itemWrapper.parentElement !== container) {
        itemWrapper = itemWrapper.parentElement;
    }

    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    const clone = itemWrapper.cloneNode(true);
    clone.classList.add('sv-injected-item');

    // Fix the link inside clone
    const cloneLink = clone.tagName === 'A' ? clone : clone.querySelector('a');
    if (cloneLink) {
        cloneLink.href = result.url;
        cloneLink.target = '_blank';
        cloneLink.removeAttribute('data-ved');
        cloneLink.removeAttribute('jsaction');
        cloneLink.removeAttribute('ping');
    }

    // Replace logo image
    const img = clone.querySelector('img');
    if (img) {
        img.src = logoUrl;
        img.srcset = '';
        img.removeAttribute('data-src');
        img.style.objectFit = 'contain';
        img.style.background = '#000';
        img.style.borderRadius = '12px';
        img.style.flexShrink = '0';
    }

    // Fix text cutoff: find the text container div (sibling of img) and remove overflow/width constraints
    const imgEl = clone.querySelector('img');
    if (imgEl) {
        // The text container is usually a sibling div next to the img
        const imgParent = imgEl.parentElement;
        if (imgParent) {
            Array.from(imgParent.children).forEach(child => {
                if (child !== imgEl) {
                    child.style.overflow = 'visible';
                    child.style.maxWidth = 'none';
                    child.style.width = 'auto';
                    child.style.whiteSpace = 'nowrap';
                    // Also fix grandchildren (the actual text spans)
                    Array.from(child.querySelectorAll('*')).forEach(el => {
                        el.style.overflow = 'visible';
                        el.style.maxWidth = 'none';
                        el.style.width = 'auto';
                        el.style.whiteSpace = 'nowrap';
                    });
                }
            });
        }
    }
    clone.style.overflow = 'visible';
    clone.style.width = 'auto';
    clone.style.maxWidth = 'none';

    // Replace all text nodes: service name → StreamVault, price type → Free
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
        const txt = node.textContent.trim();
        if (!txt) continue;
        if (['Netflix', 'Hulu', 'Amazon', 'Apple', 'Disney', 'HBO', 'Max', 'Peacock', 'Paramount', 'Hotstar', 'JioHotstar', 'Jio', 'Prime', 'Sony', 'Zee', 'Voot', 'MX'].some(s => txt.includes(s))) {
            node.textContent = 'StreamVault';
        } else if (['Subscription', 'Rent', 'Buy', 'Purchase'].some(s => txt.includes(s))) {
            node.textContent = 'Free';
        }
    }

    container.insertBefore(clone, container.firstChild);
}

function injectWatchAction(result, specificContainer = null) {
    // Skip if already injected anywhere on page
    if (document.querySelector('.sv-injected-button')) return;

    // Positive identification: find the streaming link in the Watch show section
    // The Watch show row ALWAYS has "Already watched" and "Want to watch" as siblings
    // So find a streaming link whose ancestor container also contains those texts
    const streamingDomains = ['netflix.com/watch', 'hotstar.com', 'primevideo.com', 'jiocinema', 'sonyliv', 'zee5', 'voot', 'hulu.com', 'disneyplus.com'];
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    let nfLink = null;
    let netflixItem = null;

    for (const a of allLinks) {
        const href = a.href || '';
        if (!streamingDomains.some(d => href.includes(d))) continue;
        if (href.includes('google.com')) continue;

        // Walk up from this link to find a container with 3+ children
        let el = a;
        for (let i = 0; i < 10 && el.parentElement && el.parentElement !== document.body; i++) {
            if (el.parentElement.childElementCount >= 3 && el.querySelector('img')) {
                // Check if siblings contain "Already watched" text — unique to Watch show section
                const siblingText = el.parentElement.innerText || '';
                if (siblingText.includes('Already watched') || siblingText.includes('Want to watch')) {
                    nfLink = a;
                    netflixItem = el;
                    break;
                }
            }
            el = el.parentElement;
        }
        if (nfLink) break;
    }

    if (!nfLink || !netflixItem) return;

    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    const clone = netflixItem.cloneNode(true);
    clone.classList.add('sv-injected-button');

    // Fix link inside clone
    const cloneLink = clone.tagName === 'A' ? clone : clone.querySelector('a');
    if (cloneLink) {
        cloneLink.href = result.url;
        cloneLink.target = '_blank';
        cloneLink.removeAttribute('data-ved');
        cloneLink.removeAttribute('jsaction');
        cloneLink.removeAttribute('ping');
    }

    _updateWatchActionClone(clone, logoUrl);
    // Insert BEFORE Netflix — same row, to the left
    netflixItem.parentElement.insertBefore(clone, netflixItem);
}

function _updateWatchActionClone(clone, logoUrl) {
    // Replace circular icon image
    const img = clone.querySelector('img');
    if (img) {
        img.src = logoUrl;
        img.srcset = '';
        img.removeAttribute('data-src');
        img.style.objectFit = 'contain';
        img.style.background = '#000';
        img.style.borderRadius = '50%';
        // Preserve original dimensions so it matches Netflix button size
        const naturalW = img.offsetWidth || img.width || 48;
        const naturalH = img.offsetHeight || img.height || 48;
        img.style.width = naturalW + 'px';
        img.style.height = naturalH + 'px';
    } else {
        // Replace SVG with img
        const svg = clone.querySelector('svg');
        if (svg) {
            const newImg = document.createElement('img');
            newImg.src = logoUrl;
            const sz = svg.getBoundingClientRect();
            newImg.width = sz.width || 48;
            newImg.height = sz.height || 48;
            newImg.style.borderRadius = '50%';
            newImg.style.objectFit = 'contain';
            newImg.style.background = '#000';
            svg.replaceWith(newImg);
        }
    }

    // Replace text nodes: main label → 'Watch now', subtitle → 'Free'
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null, false);
    let node;
    let firstTextReplaced = false;
    while (node = walker.nextNode()) {
        const txt = node.textContent.trim();
        if (!txt) continue;
        if (!firstTextReplaced && (txt.includes('Watch') || txt.includes('Netflix') || txt.includes('Hotstar') || txt.includes('Prime'))) {
            node.textContent = 'Watch now';
            firstTextReplaced = true;
        } else if (['Subscription', 'Rent', 'Buy', 'Free', 'now'].some(s => txt.includes(s))) {
            node.textContent = 'Free';
        }
    }
}


function createMiniBadge(url, title) {
    const badge = document.createElement('a');
    badge.className = 'sv-badge-mini';
    badge.href = url;
    badge.target = '_blank';
    badge.innerHTML = SV_LOGO;
    badge.title = title || "Watch on StreamVault";
    badge.style.cssText = `
        display: inline-flex;
        width: 20px;
        height: 20px;
        margin-left: 8px;
        align-items: center;
        justify-content: center;
        /* background: transparent; Removed red bg */
        border-radius: 4px;
        transition: transform 0.2s;
        vertical-align: middle;
        filter: drop-shadow(0 0 6px #DC2626); /* Enhanced glow */
    `;
    badge.onmouseover = () => badge.style.transform = 'scale(1.1)';
    badge.onmouseout = () => badge.style.transform = 'scale(1)';
    return badge;
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
