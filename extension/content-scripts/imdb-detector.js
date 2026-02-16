/**
 * StreamVault Extension — Content Script: IMDb/TMDB/MAL Detector
 * Detects movie/show titles on external sites and shows "Watch on StreamVault" button
 */

(function () {
    'use strict';

    const SITE_CONFIG = {
        'www.imdb.com': {
            getTitle: () => {
                // IMDb title page: <h1> inside [data-testid="hero__pageTitle"]
                const h1 = document.querySelector('[data-testid="hero__pageTitle"]');
                if (h1) return h1.textContent.trim();
                // Fallback: first h1
                const fallback = document.querySelector('h1');
                return fallback ? fallback.textContent.trim() : null;
            },
            getYear: () => {
                const yearEl = document.querySelector('[data-testid="hero__pageTitle"] ~ ul a');
                if (yearEl) {
                    const match = yearEl.textContent.match(/\d{4}/);
                    return match ? match[0] : null;
                }
                return null;
            },
            getType: () => {
                // Check if it's a TV show
                const episodes = document.querySelector('[data-testid="episodes-header"]');
                return episodes ? 'tv' : 'movie';
            },
            getPoster: () => {
                const img = document.querySelector('[data-testid="hero-media__poster"] img');
                return img ? img.src : null;
            }
        },
        'www.themoviedb.org': {
            getTitle: () => {
                const h2 = document.querySelector('section.header h2 a');
                return h2 ? h2.textContent.trim() : null;
            },
            getYear: () => {
                const release = document.querySelector('section.header .release');
                if (release) {
                    const match = release.textContent.match(/\d{4}/);
                    return match ? match[0] : null;
                }
                return null;
            },
            getType: () => {
                return window.location.pathname.includes('/tv/') ? 'tv' : 'movie';
            },
            getPoster: () => {
                const img = document.querySelector('.poster img');
                return img ? img.src : null;
            }
        },
        'myanimelist.net': {
            getTitle: () => {
                const h1 = document.querySelector('h1.title-name strong');
                if (h1) return h1.textContent.trim();
                const fallback = document.querySelector('h1');
                return fallback ? fallback.textContent.trim() : null;
            },
            getYear: () => {
                const info = document.querySelector('.information .item span');
                if (info) {
                    const match = info.textContent.match(/\d{4}/);
                    return match ? match[0] : null;
                }
                return null;
            },
            getType: () => 'tv',
            getPoster: () => {
                const img = document.querySelector('.leftside img[itemprop="image"]');
                return img ? img.src : null;
            }
        }
    };

    const hostname = window.location.hostname;
    const config = SITE_CONFIG[hostname];
    if (!config) return;

    // Wait for page to load properly
    function init() {
        const title = config.getTitle();
        if (!title) {
            // Retry after a moment
            setTimeout(init, 1500);
            return;
        }

        const year = config.getYear();
        const type = config.getType();
        const poster = config.getPoster();

        console.log('[StreamVault] Detected:', { title, year, type });

        // Create the floating button
        createOverlay(title, year, type, poster);
    }

    function createOverlay(title, year, type, poster) {
        // Check if already exists
        if (document.getElementById('streamvault-detector')) return;

        const container = document.createElement('div');
        container.id = 'streamvault-detector';
        container.innerHTML = `
            <div id="sv-detector-btn" style="
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(220, 38, 38, 0.5);
                border-radius: 14px;
                padding: 12px 18px;
                cursor: pointer;
                box-shadow:
                    0 8px 32px rgba(0,0,0,0.4),
                    0 0 20px rgba(220, 38, 38, 0.15);
                transition: all 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                max-width: 320px;
                animation: sv-slide-in 0.4s ease-out;
            ">
                <div style="
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #DC2626, #ef4444);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="
                        font-size: 11px;
                        color: #DC2626;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 2px;
                    ">Watch on StreamVault</div>
                    <div style="
                        font-size: 13px;
                        color: #fff;
                        font-weight: 500;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${escapeHtml(title)}${year ? ` (${year})` : ''}</div>
                </div>
                <div id="sv-close-btn" style="
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    flex-shrink: 0;
                    transition: background 0.2s;
                ">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#999">
                        <path d="M18 6L6 18M6 6l12 12" stroke="#999" stroke-width="2" fill="none"/>
                    </svg>
                </div>
            </div>
            <style>
                @keyframes sv-slide-in {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                #sv-detector-btn:hover {
                    transform: translateY(-2px);
                    box-shadow:
                        0 12px 40px rgba(0,0,0,0.5),
                        0 0 30px rgba(220, 38, 38, 0.25);
                    border-color: rgba(220, 38, 38, 0.8);
                }
                #sv-close-btn:hover {
                    background: rgba(255,255,255,0.2) !important;
                }
            </style>
        `;

        document.body.appendChild(container);

        // Click handler — open on StreamVault
        const btn = document.getElementById('sv-detector-btn');
        btn.addEventListener('click', (e) => {
            if (e.target.closest('#sv-close-btn')) {
                container.remove();
                return;
            }

            // Determine search path
            const searchQuery = encodeURIComponent(title);
            const path = type === 'tv'
                ? `/shows?search=${searchQuery}`
                : `/movies?search=${searchQuery}`;

            chrome.runtime.sendMessage({
                type: 'OPEN_STREAMVAULT',
                path: path
            });
        });

        // Close button
        document.getElementById('sv-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            container.remove();
        });

        // Auto-hide after 15 seconds
        setTimeout(() => {
            if (container.parentElement) {
                container.style.transition = 'opacity 0.3s, transform 0.3s';
                container.style.opacity = '0';
                container.style.transform = 'translateY(10px)';
                setTimeout(() => container.remove(), 300);
            }
        }, 15000);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
    } else {
        setTimeout(init, 1000);
    }
})();
