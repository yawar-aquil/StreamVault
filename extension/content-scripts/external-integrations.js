// StreamVault External Integrations
// Injects "Watch on StreamVault" buttons into IMDb, TMDB, MAL, and Google

const SV_LOGO = (() => {
    // Dynamic getter for the logo URL
    const logoUrl = chrome.runtime.getURL('icons/streamvault-logo.png');
    return `<img src="${logoUrl}" width="16" height="16" style="display:block; border-radius: 4px;" alt="SV" />`;
})();

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
    badge.style.marginBottom = "10px"; // Ensure spacing from content below
    badge.style.marginTop = "5px";
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

    // 2. Watch Action Bar (Carousel)
    const actionContainers = findAllWatchActionContainers();
    actionContainers.forEach(container => {
        if (!container.querySelector('.sv-injected-button')) {
            console.log('[StreamVault] Re-injecting into Watch Action (Global Scan)...');
            injectWatchAction(lastResult, container);
        }
    });

}, 1500);

// Helper to find all valid "Where to watch" list containers currently in the DOM
function findAllWhereToWatchContainers() {
    const containers = [];
    // Text-based search for headers
    const headers = Array.from(document.querySelectorAll('div, h2, h3'));

    headers.forEach(h => {
        if (h.innerText === 'Where to watch' || h.innerText === 'Ways to watch') {
            // Look for the list container relative to header
            const list = h.closest('div').parentElement.querySelector('div[class*="list"]'); // Generic guess
            // Or adjacent sibling
            const sibling = h.nextElementSibling || h.closest('div').nextElementSibling;

            if (sibling && sibling.innerText.includes('Netflix')) {
                containers.push(sibling);
            } else {
                // Try finding a known service link nearby
                const nearbyLink = h.closest('div').parentElement.querySelector('a[href*="netflix"], a[href*="hulu"]');
                if (nearbyLink) {
                    // The container is the parent of the row that contains the link
                    // Usually link -> div (row) -> div (list)
                    // If we want to inject a ROW, we need the LIST container.
                    // The nearbyLink is likely inside the row.
                    let row = nearbyLink;
                    while (row && row.tagName !== 'DIV') row = row.parentElement;
                    if (row && row.parentElement) containers.push(row.parentElement);
                }
            }
        }
    });

    // Fallback: Just find any container with Netflix/Hulu links that isn't injected yet
    const serviceLinks = document.querySelectorAll('a[href*="netflix.com"], a[href*="hulu.com"], a[href*="primevideo.com"]');
    serviceLinks.forEach(link => {
        // Walk up to find the common list parent
        // Usually the structure is List -> Item -> Link
        let parent = link.parentElement;
        // detailed check: if parent has multiple children which look like items
        // or if parent.parent has multiple children
        if (parent && parent.parentElement) {
            // Check if this parent already in list
            if (!containers.includes(parent.parentElement) && !containers.includes(parent)) {
                // Heuristic: The container should have vertical stacking (block or flex-col)
                // or be a grid.
                containers.push(parent.parentElement);
            }
        }
    });

    return [...new Set(containers)]; // Unique
}

function findAllWatchActionContainers() {
    const containers = [];
    const headers = Array.from(document.querySelectorAll('h2, h3, div'));
    const wtwHeader = headers.find(h => h.textContent === 'Watch show' || h.textContent === 'Watch movie');

    if (wtwHeader) {
        // Look for the action bar container below it
        const container = wtwHeader.closest('div').parentElement.querySelector('g-scrolling-carousel') ||
            wtwHeader.closest('div').parentElement.querySelector('div[role="list"]');
        if (container) containers.push(container);
    }

    // Fallback: Find "Watch now" button and get its parent
    const watchBtns = document.querySelectorAll('a[href*="netflix"], div[role="button"]');
    watchBtns.forEach(btn => {
        if (btn.innerText.includes('Watch now') || btn.innerText.includes('Already watched')) {
            if (btn.parentElement && !containers.includes(btn.parentElement)) {
                containers.push(btn.parentElement);
            }
        }
    });

    return [...new Set(containers)];
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
            // Avoid injecting into "People also ask" or other widgets
            if (h3.closest('.kno-kp')) return; // Skip if inside Knowledge Panel

            const text = h3.textContent.toLowerCase();
            const targetTitle = result.title.toLowerCase();

            if (text.includes(targetTitle)) {
                // Check if already injected
                if (h3.querySelector('.sv-badge-mini')) return;

                const mini = createMiniBadge(result.url, miniBadgeTitle);

                // Ensure proper layout for the h3
                h3.style.display = 'flex';
                h3.style.alignItems = 'center';
                h3.style.flexWrap = 'wrap'; // Handle long titles
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
    let container = specificContainer;
    let templateLink = null;

    if (!container) {
        // Fallback to finding one if not provided
        const links = Array.from(document.querySelectorAll('a'));
        templateLink = links.find(a =>
            (a.href.includes('netflix') || a.href.includes('hulu') || a.href.includes('amazon')) &&
            a.textContent.length > 0
        );
        if (templateLink) {
            // logic to find container from link
            if (templateLink.parentNode.tagName === 'DIV' && templateLink.parentNode.parentElement.childElementCount > 1) {
                container = templateLink.parentNode.parentElement; // Parent of the item div is the list
            } else {
                container = templateLink.parentElement;
            }
        }
    } else {
        // If container provided, try to find a template link inside it to clone
        templateLink = container.querySelector('a');
    }

    if (container && templateLink) {
        // Perform Clone & Inject of ONE item
        // We need to identify the "Item" wrapper. 
        // If templateLink is the 'a', the item wrapper is likely its parent div.
        let itemWrapper = templateLink;
        if (itemWrapper.parentNode.tagName === 'DIV' && itemWrapper.parentNode !== container) {
            itemWrapper = itemWrapper.parentNode;
        }

        const clone = itemWrapper.cloneNode(true);
        clone.classList.add('sv-injected-item'); // MARK IT

        const link = clone.tagName === 'A' ? clone : clone.querySelector('a');
        if (link) {
            link.href = result.url;
            link.removeAttribute('data-ved');
            link.removeAttribute('jsaction');

            // Replace Logo
            const img = clone.querySelector('img');
            if (img) {
                img.src = chrome.runtime.getURL('icons/streamvault-logo.png');
                img.srcset = '';
                img.style.objectFit = 'contain';
                img.style.backgroundColor = '#000';
                // img.style.borderRadius = '4px';
            }

            // Replace Text
            const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                const txt = node.textContent.trim();
                if (['Netflix', 'Hulu', 'Amazon', 'Apple', 'Disney', 'HBO'].some(p => txt.includes(p))) {
                    node.textContent = 'StreamVault';
                }
                if (['Subscription', 'Rent', 'Buy', 'Free'].some(t => txt.includes(t))) {
                    node.textContent = 'Free';
                }
            }

            // Insert
            container.insertBefore(clone, container.firstChild);
            clone.style.display = '';

            // Mobile Fix
            if (window.innerWidth <= 768) {
                clone.style.display = 'inline-flex';
                clone.style.width = 'auto';
                clone.style.marginRight = '8px';
                // Try to force container layout if needed
                // container.style.display = 'flex'; 
            }
        }
    }
}

function injectWatchAction(result, specificContainer = null) {
    let container = specificContainer;
    // Look for "Watch show" or "Watch now" buttons in the action bar
    // Common selector for these action buttons: g-raised-button or specific role="button"
    // Heuristic: Find a button with text "Watch" or "Netflix" in the specific "Watch show" section

    if (!container) {
        // First, find the "Watch show" header or section
        // Can be h2, h3, or div with specific text
        const headers = Array.from(document.querySelectorAll('h2, h3, div[role="heading"], div'));
        const wtwSection = headers.find(h => {
            const t = h.textContent.trim();
            return t === 'Watch show' || t === 'Watch movie' || t === 'Ways to watch' || t === 'Watch';
        });

        if (wtwSection) {
            // Look for the action bar container below it
            container = wtwSection.closest('div').parentElement.querySelector('g-scrolling-carousel') ||
                wtwSection.closest('div').parentElement.querySelector('div[role="list"]');
        }
    }

    if (container) {
        console.log('[StreamVault] Found Watch Action container:', container);

        // Find template button
        const buttons = Array.from(container.querySelectorAll('div[role="button"], a'));
        const templateBtn = buttons.find(b => b.textContent.includes('Watch') || b.textContent.includes('Subscription') || b.textContent.includes('Already'));

        if (templateBtn) {
            const clone = templateBtn.cloneNode(true);
            clone.classList.add('sv-injected-button'); // MARK IT

            let link = clone.tagName === 'A' ? clone : clone.closest('a');
            if (!link) {
                // Wrap if div
                const wrapper = document.createElement('a');
                wrapper.href = result.url;
                wrapper.target = '_blank';
                wrapper.style.textDecoration = 'none';
                wrapper.className = clone.className;
                wrapper.innerHTML = clone.innerHTML;
                clone.replaceWith(wrapper);
                link = wrapper;
            } else {
                // Determine if we need to clone the link or just the button
                if (link.contains(templateBtn) && link !== templateBtn) {
                    // The link wraps the button. We should have cloned the Link.
                    // But we cloned the button? 
                    // Let's restart. Clone the LINK if valid.
                    const linkClone = link.cloneNode(true);
                    linkClone.classList.add('sv-injected-button');
                    // use this instead
                    // ...
                }
                link.href = result.url;
            }

            link.removeAttribute('jsaction');
            link.removeAttribute('data-ved');

            // Visuals (Img/Text) - Reuse logic
            const img = link.querySelector('img');
            if (img) {
                img.src = chrome.runtime.getURL('icons/streamvault-logo.png');
                img.srcset = '';
                img.style.borderRadius = '8px'; // Ensure rounded corners
            } else {
                // Fallback if no image found (sometimes it's a background or svg)
                // Try finding the icon container
                const iconContainer = link.querySelector('div[class*="icon"]');
                if (iconContainer) {
                    iconContainer.innerHTML = SV_LOGO;
                }
            }

            // Text replacement
            const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                const txt = node.textContent.trim();
                if (txt.includes('Watch') || txt.includes('Netflix') || txt.includes('Disney')) {
                    node.textContent = 'Watch Free';
                }
                if (txt.includes('Subscription') || txt.includes('Buy') || txt.includes('Rent')) {
                    node.textContent = 'StreamVault';
                }
            }

            // Insert
            container.insertBefore(link, container.firstChild);
        } else {
            // If no "Watch" button, try finding "Already watched" to insert before
            const alreadyWatchedBtn = buttons.find(b => b.textContent.includes('Already watched') || b.textContent.includes('Want to watch'));
            if (alreadyWatchedBtn) {
                console.log('[StreamVault] creating Watch button from Already Watched template');
                const clone = alreadyWatchedBtn.cloneNode(true);
                clone.classList.add('sv-injected-button');

                // Reuse wrapper logic
                let link = clone.tagName === 'A' ? clone : clone.closest('a');

                if (!link) {
                    const wrapper = document.createElement('a');
                    wrapper.href = result.url;
                    wrapper.target = '_blank';
                    wrapper.style.textDecoration = 'none';
                    wrapper.className = clone.className;
                    wrapper.innerHTML = clone.innerHTML;
                    clone.replaceWith(wrapper);
                    link = wrapper;
                } else {
                    link.href = result.url;
                    // Ensure we are not modifying the original if it was a reference loop
                    // But cloneNode(true) is safe.
                }

                link.removeAttribute('jsaction');
                link.removeAttribute('data-ved');

                // Icon update attempts
                const svg = link.querySelector('svg');
                if (svg) {
                    // Replace SVG with our IMG
                    const img = document.createElement('img');
                    img.src = chrome.runtime.getURL('icons/streamvault-logo.png');
                    img.width = 16;
                    img.height = 16;
                    img.style.borderRadius = '4px';
                    svg.replaceWith(img);
                } else {
                    // Try generic icon container
                    const iconDiv = link.querySelector('div[class*="icon"]');
                    if (iconDiv) iconDiv.innerHTML = SV_LOGO;
                }

                // Text update
                const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent.trim().length > 0) {
                        node.textContent = 'Watch Free';
                        break; // Just replace the first main text
                    }
                }

                container.insertBefore(link, container.firstChild);
            }
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
