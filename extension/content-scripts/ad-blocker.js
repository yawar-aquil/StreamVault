/**
 * StreamVault Extension — Content Script: Ad Blocker
 * Runs on StreamVault pages at document_start to block ads ASAP
 * Supplements the network-level blocking from declarativeNetRequest
 */

(function () {
    'use strict';

    // Check if ad blocking is enabled
    chrome.storage.local.get(['adBlockEnabled'], (data) => {
        if (data.adBlockEnabled === false) return;
        initAdBlocker();
    });

    function initAdBlocker() {
        const AD_DOMAINS = [
            'openairtowhardworking.com', 'adsterra', 'profitabledisplaynetwork',
            'richinfo', 'topcpmnetwork', 'surfrfrr', 'notlastnotification',
            'magnificentprize', 'propellerads', 'bidvertiser', 'revcontent',
            'trafficstars', 'juicyads', 'exoclick', 'hilltopads', 'adcash',
            'clickadu', 'evadav', 'galaksion', 'monetag',
            'kettledroopingcontinuation.com', 'disgustfirerestaurant.com',
            'lanloginrecede.com', 'greasypencilcase.com',
            'crookedconfidenceground.com', 'surrenderterrain.com'
        ];

        // 1) Block window.open (popunders)
        const origOpen = window.open;
        window.open = function (url, ...args) {
            if (url && AD_DOMAINS.some(d => url.includes(d))) {
                console.log('[SV AdBlock] Blocked popunder:', url);
                return null;
            }
            // Also block blank popunders
            if (!url || url === 'about:blank') {
                console.log('[SV AdBlock] Blocked blank popunder');
                return null;
            }
            return origOpen.call(this, url, ...args);
        };

        // 2) Block ad script injection via createElement
        const origCreate = document.createElement.bind(document);
        document.createElement = function (tag, options) {
            const el = origCreate(tag, options);
            if (tag.toLowerCase() === 'script') {
                const origSetAttr = el.setAttribute.bind(el);
                el.setAttribute = function (name, value) {
                    if (name === 'src' && AD_DOMAINS.some(d => value.includes(d))) {
                        console.log('[SV AdBlock] Blocked script:', value);
                        return;
                    }
                    return origSetAttr(name, value);
                };

                // Also intercept .src setter
                const desc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                if (desc) {
                    Object.defineProperty(el, 'src', {
                        set(val) {
                            if (AD_DOMAINS.some(d => val.includes(d))) {
                                console.log('[SV AdBlock] Blocked script src:', val);
                                return;
                            }
                            desc.set.call(this, val);
                        },
                        get() { return desc.get.call(this); },
                        configurable: true
                    });
                }
            }
            return el;
        };

        // 3) MutationObserver — cleanup ad elements that slip through
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserver);
        } else {
            startObserver();
        }

        function startObserver() {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        const el = node;

                        // Remove ad scripts
                        if (el.tagName === 'SCRIPT') {
                            const src = el.src || el.getAttribute('src') || '';
                            if (AD_DOMAINS.some(d => src.includes(d))) {
                                try { el.remove(); } catch { }
                            }
                            continue;
                        }

                        // Remove ad iframes
                        if (el.tagName === 'IFRAME') {
                            const src = el.src || '';
                            if (AD_DOMAINS.some(d => src.includes(d)) || !el.getAttribute('data-app-iframe')) {
                                if (el.parentElement === document.body) {
                                    try { el.remove(); } catch { }
                                }
                            }
                            continue;
                        }

                        // Remove body-level ad containers (but NOT React portals)
                        if (el.parentElement === document.body && el.tagName === 'DIV') {
                            if (isAdDiv(el)) {
                                try { el.remove(); } catch { }
                            }
                        }
                    }
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            // Initial cleanup
            setTimeout(cleanup, 500);
            setTimeout(cleanup, 2000);
            setTimeout(cleanup, 5000);
        }

        function isAdDiv(el) {
            // Whitelist React managed elements
            if (el.id === 'root') return false;
            if (el.hasAttribute('data-radix-portal')) return false;
            if (el.hasAttribute('data-radix-focus-guard')) return false;
            if (el.hasAttribute('data-radix-popper-content-wrapper')) return false;
            if (el.hasAttribute('data-streamvault')) return false;
            if (el.hasAttribute('data-sonner-toaster')) return false;
            if (el.classList?.contains('toaster')) return false;

            // Check for React fiber (React-managed elements)
            const hasReactFiber = Object.keys(el).some(k =>
                k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
            );
            if (hasReactFiber) return false;

            // Check for ad indicators
            const html = el.innerHTML || '';
            if (AD_DOMAINS.some(d => html.includes(d))) return true;
            if (el.className?.toString().includes('adsterra')) return true;
            if (el.hasAttribute('data-zone')) return true;

            // Check for fixed/absolute positioning (social bar pattern)
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
                const z = parseInt(style.zIndex) || 0;
                if (z > 9000) return true;
            }

            return false;
        }

        function cleanup() {
            // Remove ad scripts/iframes by domain
            AD_DOMAINS.forEach(domain => {
                document.querySelectorAll(`script[src*="${domain}"]`).forEach(el => {
                    try { el.remove(); } catch { }
                });
                document.querySelectorAll(`iframe[src*="${domain}"]`).forEach(el => {
                    try { el.remove(); } catch { }
                });
            });

            // Remove known ad containers
            document.querySelectorAll('[data-zone], [data-ad-script], body > ins').forEach(el => {
                try { el.remove(); } catch { }
            });
        }
    }

    // Listen for toggle messages from background
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'AD_BLOCK_TOGGLE') {
            if (message.enabled) {
                initAdBlocker();
            } else {
                // Reload page to remove ad blocker hooks
                location.reload();
            }
        }
    });
})();
