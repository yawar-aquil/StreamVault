import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

interface AdContextType {
    adEnabled: boolean;
    toggleAds: () => void;
    showAds: boolean;
}

const AdContext = createContext<AdContextType>({
    adEnabled: true,
    toggleAds: () => { },
    showAds: false,
});

export const useAds = () => useContext(AdContext);

export function AdProvider({ children }: { children: React.ReactNode }) {
    // Initialize ad preference SYNCHRONOUSLY from localStorage
    // This prevents the timing race where ad scripts load before we read the stored preference
    const [adEnabled, setAdEnabled] = useState(() => {
        if (typeof window === 'undefined') return true;
        const stored = localStorage.getItem("ad_preference");
        return stored !== null ? stored === "true" : true;
    });
    const { user, isLoading: isUserLoading } = useAuth();

    const isSubscribed = !!(user?.adFreeUntil && new Date(user.adFreeUntil) > new Date());

    // Guard: if user data loads and they're NOT subscribed, force ads back on
    // This handles expired subscriptions where localStorage still has ad-free preference
    useEffect(() => {
        if (!isUserLoading && user !== null && !isSubscribed && !adEnabled) {
            setAdEnabled(true);
            localStorage.setItem("ad_preference", "true");
        }
    }, [isUserLoading, user, isSubscribed, adEnabled]);

    const toggleAds = () => {
        // Only block turning ad-free ON if not subscribed
        // Always allow turning ad-free OFF (re-enabling ads)
        if (!isSubscribed && adEnabled) {
            // adEnabled=true means ads are showing, toggling would turn ad-free ON
            return;
        }

        const newState = !adEnabled;
        setAdEnabled(newState);
        localStorage.setItem("ad_preference", String(newState));
    };

    // Determine if ads should be shown
    // CRITICAL: If adEnabled is false (user chose ad-free), keep showAds=false
    // even while user data is loading. This prevents the script loading race.
    // Once user data loads, the guard effect above will re-enable if not subscribed.
    const isAdDomain = typeof window !== 'undefined' && (window.location.hostname.includes("streamvault.in") || window.location.hostname === 'localhost');
    const showAds = isAdDomain && adEnabled;

    return (
        <AdContext.Provider value={{ adEnabled, toggleAds, showAds }}>
            <GlobalAds showAds={showAds} />
            {children}
        </AdContext.Provider>
    );
}

// ----------------------------------------------------------------------
// Reusable Ad Components
// ----------------------------------------------------------------------

// Helper to safely render iframe-based ads (Banner ads using atOptions)
function AdsterraIframe({
    width,
    height,
    adKey,
    className
}: {
    width: number,
    height: number,
    adKey: string,
    className?: string
}) {
    const { showAds } = useAds();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showAds || !containerRef.current) {
            if (containerRef.current) containerRef.current.innerHTML = '';
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.width = `${width}`;
        iframe.height = `${height}`;
        iframe.frameBorder = "0";
        iframe.scrolling = "no";
        iframe.style.border = "none";
        iframe.style.overflow = "hidden";

        // Clear previous content
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <body style="margin:0;padding:0;overflow:hidden;">
                    <script type="text/javascript">
                        atOptions = {
                            'key' : '${adKey}',
                            'format' : 'iframe',
                            'height' : ${height},
                            'width' : ${width},
                            'params' : {}
                        };
                    </script>
                    <script type="text/javascript" src="https://openairtowhardworking.com/${adKey}/invoke.js"></script>
                </body>
                </html>
            `);
            doc.close();
        }

    }, [showAds, adKey, width, height]);

    if (!showAds) return null;

    return (
        <div
            ref={containerRef}
            className={`flex justify-center items-center overflow-hidden ${className || ''}`}
            style={{ width: width, height: height, minHeight: height }}
        />
    );
}

// Global Ads (Popunder, Social Bar)
function GlobalAds({ showAds }: { showAds: boolean }) {
    useEffect(() => {
        if (!showAds) {
            // ============================================================
            // NUCLEAR AD BLOCKING MODE
            // ============================================================

            // 1) Immediate cleanup
            cleanupAllAdElements();

            // 2) Override window.open to block popunders
            const originalWindowOpen = window.open;
            window.open = function (url?: string | URL, target?: string, features?: string) {
                const stack = new Error().stack || '';
                if (stack.includes('openSmartlink') || stack.includes('handleClick') || stack.includes('onClick')) {
                    return originalWindowOpen.call(window, url, target, features);
                }
                console.log('[AdFree] Blocked popunder window.open');
                return null;
            };

            // 3) Inject CSS that hides ad elements
            // We do NOT hide body > div blanket — that breaks React portals (toast announce, etc.)
            // JS cleanup with React fiber detection handles body-level divs instead
            const adBlockStyle = document.createElement('style');
            adBlockStyle.id = 'streamvault-adblocker-css';
            // Build domain-specific CSS selectors for iframes/scripts/links
            const domainSelectors = AD_DOMAINS.map(d => [
                `iframe[src*="${d}"]`,
                `a[href*="${d}"]`,
            ]).flat().join(',\n');
            adBlockStyle.textContent = `
                /* Hide iframes/links from known ad networks */
                ${domainSelectors} {
                    display: none !important;
                    visibility: hidden !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                /* Hide body-level iframes not from our app */
                body > iframe:not([data-app-iframe]) {
                    display: none !important;
                    visibility: hidden !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                /* Hide ad containers by known patterns */
                body > ins,
                [data-ad-script],
                [data-zone],
                div[class*="adsterra"],
                div[class*="adsbox"],
                div[class*="ad-banner"] {
                    display: none !important;
                    visibility: hidden !important;
                    width: 0 !important;
                    height: 0 !important;
                }
            `;
            document.head.appendChild(adBlockStyle);

            // 4) Intercept script creation to prevent ad script injection
            const originalCreateElement = document.createElement.bind(document);
            const originalAppendChild = HTMLElement.prototype.appendChild;

            (document as any).createElement = function (tagName: string, options?: any) {
                const el = originalCreateElement(tagName, options);
                if (tagName.toLowerCase() === 'script') {
                    // Mark it so we can check the src later in appendChild
                    (el as any).__adcheck = true;
                }
                return el;
            };

            (HTMLElement.prototype as any).appendChild = function (node: Node): Node {
                if ((node as any).__adcheck && (node as any).src) {
                    const src = (node as any).src as string;
                    if (AD_DOMAINS.some(d => src.includes(d))) {
                        console.log('[AdFree] Blocked ad script injection:', src);
                        return node; // Don't actually append
                    }
                }
                // Also block any iframe injection from ad domains
                if ((node as any).tagName === 'IFRAME') {
                    const src = (node as any).src || (node as any).getAttribute?.('src') || '';
                    if (AD_DOMAINS.some(d => src.includes(d))) {
                        console.log('[AdFree] Blocked ad iframe injection');
                        return node;
                    }
                }
                return originalAppendChild.call(this, node);
            };

            // 5) MutationObserver — catches everything that slips through
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of Array.from(mutation.addedNodes)) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        const el = node as HTMLElement;

                        if (isAdElement(el)) {
                            try { el.remove(); } catch { }
                            continue;
                        }

                        // Deep scan children
                        if (el.children?.length) {
                            Array.from(el.querySelectorAll('*')).forEach(child => {
                                if (isAdElement(child as HTMLElement)) {
                                    try { el.remove(); } catch { }
                                }
                            });
                        }
                    }

                    // Also catch attribute changes (ads may modify existing elements)
                    if (mutation.type === 'attributes' && mutation.target) {
                        const el = mutation.target as HTMLElement;
                        if (el.parentElement === document.body && isAdElement(el)) {
                            try { el.remove(); } catch { }
                        }
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class', 'src']
            });

            // 6) Aggressive periodic cleanup — 500ms for first 30s, then 2s indefinitely
            const fastCleanup = setInterval(() => cleanupAllAdElements(), 500);
            const slowdownTimer = setTimeout(() => {
                clearInterval(fastCleanup);
            }, 30000);
            const slowCleanup = setInterval(() => cleanupAllAdElements(), 2000);

            return () => {
                window.open = originalWindowOpen;
                document.createElement = originalCreateElement;
                HTMLElement.prototype.appendChild = originalAppendChild;
                observer.disconnect();
                clearInterval(fastCleanup);
                clearInterval(slowCleanup);
                clearTimeout(slowdownTimer);
                // Remove the ad-blocker CSS
                const css = document.getElementById('streamvault-adblocker-css');
                if (css) css.remove();
            };
        }

        // Popunder
        const popunderScript = document.createElement("script");
        popunderScript.src = "https://openairtowhardworking.com/cc/92/4a/cc924a63b418bf115df7f329ab7cb09d.js";
        popunderScript.async = true;
        popunderScript.setAttribute('data-ad-script', 'popunder');
        document.body.appendChild(popunderScript);

        // Social Bar
        const socialBarScript = document.createElement("script");
        socialBarScript.src = "https://openairtowhardworking.com/32/04/23/320423cec477d343134fb84492d4efb2.js";
        socialBarScript.async = true;
        socialBarScript.setAttribute('data-ad-script', 'socialbar');
        document.body.appendChild(socialBarScript);

        return () => {
            if (document.body.contains(popunderScript)) document.body.removeChild(popunderScript);
            if (document.body.contains(socialBarScript)) document.body.removeChild(socialBarScript);
            cleanupAllAdElements();
        };
    }, [showAds]);

    return null;
}

// Extended list of Adsterra / ad network domains
const AD_DOMAINS = [
    'openairtowhardworking.com',
    'adsterra',
    'wayfarer',
    'profitabledisplaynetwork',
    'richinfo',
    'topcpmnetwork',
    'surfrfrr',
    'notlastnotification',
    'pushnotification',
    'magnificentprize',
    'onesignal',
    'pushengage',
    'propellerads',
    'bidvertiser',
    'revcontent',
    'trafficstars',
    'juicyads',
    'exoclick',
    'hilltopads',
    'adcash',
    'clickadu',
    'evadav',
    'galaksion',
    'monetag',
    // Social bar redirect domains
    'kettledroopingcontinuation.com',
    'disgustfirerestaurant.com',
    'lanloginrecede.com',
    'greasypencilcase.com',
    'crookedconfidenceground.com',
    'surrenderterrain.com',
];

// Whitelist check — returns true if element belongs to our app
function isWhitelisted(el: HTMLElement): boolean {
    if (!el) return true;
    // Direct app elements
    if (el.id === 'root') return true;
    if (el.id?.startsWith('streamvault')) return true;
    if (el.id === 'streamvault-adblocker-css') return true;
    if (el.hasAttribute('data-streamvault')) return true;
    // Radix UI portals (modals, dropdowns, tooltips etc.)
    if (el.hasAttribute('data-radix-portal')) return true;
    if (el.hasAttribute('data-radix-popper-content-wrapper')) return true;
    if (el.hasAttribute('data-radix-focus-guard')) return true;
    // Toast notifications
    if (el.classList.contains('toaster') || el.closest('.toaster')) return true;
    // Sonner toast
    if (el.hasAttribute('data-sonner-toaster')) return true;
    if (el.hasAttribute('data-sonner-toast')) return true;
    // Check if inside #root
    if (el.closest('#root')) return true;
    // Check if inside a radix portal
    if (el.closest('[data-radix-portal]')) return true;
    // Check if element is managed by React (has React fiber internals)
    // React-managed portals (toast, dropdown, dialog) always have these properties
    // Ad-injected elements from external scripts never do
    const hasReactFiber = Object.keys(el).some(key =>
        key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
    );
    if (hasReactFiber) return true;
    return false;
}

// Check if a DOM element is an ad-injected element
// Uses whitelist to protect Radix portals, toasters, and app elements
function isAdElement(el: HTMLElement): boolean {
    // Never remove whitelisted elements
    if (isWhitelisted(el)) return false;

    const tag = el.tagName;

    // Scripts from ad networks
    if (tag === 'SCRIPT') {
        const src = el.getAttribute('src') || '';
        if (AD_DOMAINS.some(d => src.includes(d))) return true;
        if (el.hasAttribute('data-ad-script')) return true;
        const text = el.textContent || '';
        if (text.includes('atOptions') || (text.includes('_push') && text.includes('zone'))) return true;
    }

    // Iframes from ad networks
    if (tag === 'IFRAME') {
        const src = el.getAttribute('src') || '';
        if (AD_DOMAINS.some(d => src.includes(d))) return true;
        if (el.parentElement === document.body && !el.getAttribute('data-app-iframe')) return true;
    }

    // Body-level fixed-position elements (social bar uses this)
    if (el.parentElement === document.body) {
        try {
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') {
                return true;
            }
        } catch { /* ignore */ }
    }

    // Elements that contain ad network references
    if (tag === 'DIV' || tag === 'SPAN' || tag === 'A') {
        const innerHTML = el.innerHTML || '';
        if (AD_DOMAINS.some(d => innerHTML.includes(d)) && el.parentElement === document.body) return true;
    }

    // Anchor elements pointing to ad networks
    if (tag === 'A') {
        const href = el.getAttribute('href') || '';
        if (AD_DOMAINS.some(d => href.includes(d))) return true;
    }

    // Divs with ad-related IDs or classes
    if (el.id?.match(/^ad[-_]|[-_]ad$/i) || el.className?.toString().includes('adsterra')) return true;

    // <ins> elements (common ad containers)
    if (tag === 'INS' && el.parentElement === document.body) return true;

    // Elements with data-zone or similar ad attributes
    if (el.hasAttribute('data-zone')) return true;

    // Any body-level div that isn't whitelisted (whitelist already checked above)
    if (tag === 'DIV' && el.parentElement === document.body) {
        return true;
    }

    return false;
}

// Safe DOM removal — prevents React reconciliation errors
// When we remove nodes, React may later try removeChild on the same node
function safeRemove(el: Element | HTMLElement) {
    try { el.remove(); } catch { /* Node already removed or not a child */ }
}

// Remove ad-injected DOM elements — body-level cleanup with whitelist protection
function cleanupAllAdElements() {
    // 1) Remove all scripts/iframes/links from ad network domains
    AD_DOMAINS.forEach(domain => {
        document.querySelectorAll(`script[src*="${domain}"]`).forEach(el => safeRemove(el));
        document.querySelectorAll(`iframe[src*="${domain}"]`).forEach(el => {
            if (el.parentElement && el.parentElement !== document.body && el.parentElement.tagName === 'DIV') {
                safeRemove(el.parentElement);
            } else {
                safeRemove(el);
            }
        });
        document.querySelectorAll(`a[href*="${domain}"]`).forEach(el => {
            if (el.parentElement === document.body) safeRemove(el);
            else if (el.parentElement && !el.closest('#root')) safeRemove(el.parentElement);
        });
    });
    document.querySelectorAll('script[data-ad-script]').forEach(el => safeRemove(el));

    // 2) Remove known ad containers
    document.querySelectorAll('div[class*="adsterra"], div[class*="adsbox"], div[class*="ad-banner"]').forEach(el => safeRemove(el));
    document.querySelectorAll('[data-zone]').forEach(el => safeRemove(el));
    document.querySelectorAll('body > ins').forEach(el => safeRemove(el));

    // 3) Remove body-level iframes not from our app
    document.querySelectorAll('body > iframe').forEach(el => {
        const iframe = el as HTMLIFrameElement;
        if (!iframe.getAttribute('data-app-iframe')) {
            safeRemove(iframe);
        }
    });

    // 4) Remove all non-whitelisted body-level elements
    // Social bar injects divs/spans/anchors directly on body
    // Whitelist protects: #root, Radix portals, toasters, [data-streamvault]
    Array.from(document.body.children).forEach(child => {
        const el = child as HTMLElement;
        if (!el.tagName) return;
        if (el.id === 'root') return;
        if (isWhitelisted(el)) return;

        // Keep style, link, noscript tags
        if (el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'NOSCRIPT') return;

        // Keep scripts that are part of our app
        if (el.tagName === 'SCRIPT') {
            const src = el.getAttribute('src') || '';
            if (AD_DOMAINS.some(d => src.includes(d)) || el.hasAttribute('data-ad-script')) {
                safeRemove(el);
            }
            return; // Keep all other scripts
        }

        // Remove any non-whitelisted divs/iframes/ins/spans/anchors/imgs on body
        if (['DIV', 'IFRAME', 'INS', 'SPAN', 'A', 'IMG'].includes(el.tagName)) {
            safeRemove(el);
            return;
        }
    });
}

// Native Banner (Async type)
export function NativeBanner() {
    const { showAds } = useAds();
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    useEffect(() => {
        if (!showAds) return;

        const script = document.createElement("script");
        script.async = true;
        script.dataset.cfasync = "false";
        script.src = "https://openairtowhardworking.com/2fe64366cad801afa603d926d7c7d413/invoke.js";

        document.body.appendChild(script);
        scriptRef.current = script;

        return () => {
            if (scriptRef.current && document.body.contains(scriptRef.current)) {
                document.body.removeChild(scriptRef.current);
            }
        };
    }, [showAds]);

    if (!showAds) return null;

    return (
        <div className="flex justify-center my-4 w-full" data-ad-container="true">
            <div id="container-2fe64366cad801afa603d926d7c7d413"></div>
        </div>
    );
}


// ----------------------------------------------------------------------
// Specific Ad Implementations
// ----------------------------------------------------------------------

export function Banner728x90() {
    return <AdsterraIframe width={728} height={90} adKey="1a8887a1f7602c45803795a1a6e971db" className="hidden md:flex my-4" />;
}

export function Banner320x50() {
    return <AdsterraIframe width={320} height={50} adKey="bc37847301010f38b235b5b78d8382d1" className="flex md:hidden my-4" />;
}

export function Banner468x60() {
    return <AdsterraIframe width={468} height={60} adKey="3495d0b8d01a4fcf0328cbbb7abd76c8" className="hidden sm:flex md:hidden my-4" />;
}

export function Banner300x250({ className }: { className?: string }) {
    return <AdsterraIframe width={300} height={250} adKey="30b9e1edda80cc79f456b9f7e7821c47" className={`my-4 ${className || ''}`} />;
}

export function Banner160x600({ className }: { className?: string }) {
    return <AdsterraIframe width={160} height={600} adKey="931b8e6c69b0fa8ebccab7b0e9cfde9a" className={`my-4 ${className || ''}`} />;
}

export function Banner160x300({ className }: { className?: string }) {
    return <AdsterraIframe width={160} height={300} adKey="e1bfd6b49d9cfccad14357530f5a0160" className={`my-4 ${className || ''}`} />;
}

// ----------------------------------------------------------------------
// Container Component
// ----------------------------------------------------------------------

// Smartlink Button
export function SmartlinkButton({ className, text = "Special Partner Offer" }: { className?: string, text?: string }) {
    // Only show on streamvault.in (ad domain), not on streamvault.live
    const isAdDomain = typeof window !== 'undefined' && (window.location.hostname.includes("streamvault.in") || window.location.hostname === 'localhost');
    if (!isAdDomain) return null;

    const openSmartlink = () => {
        window.open("https://openairtowhardworking.com/r52n12yhee?key=c9e42e6265a0e4becf4bde3064060d5e", "_blank");
    };

    return (
        <button
            onClick={openSmartlink}
            className={`bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${className}`}
        >
            <span className="animate-pulse">🔥</span>
            {text}
            <span className="animate-pulse">🔥</span>
        </button>
    );
}

export function AdContainer({
    type,
    className
}: {
    type: 'banner' | 'sidebar' | 'native' | 'footer' | 'blog_top' | 'blog_sidebar' | 'blog_content',
    className?: string
}) {
    const { showAds } = useAds();
    if (!showAds) return null;

    if (type === 'native' || type === 'blog_content') return <NativeBanner />;

    if (type === 'footer') {
        return (
            <div className={`flex flex-col items-center gap-4 w-full bg-black/20 py-4 ${className}`}>
                <Banner728x90 />
                <Banner320x50 />
            </div>
        );
    }

    if (type === 'sidebar' || type === 'blog_sidebar') {
        return (
            <div className={`flex flex-col items-center gap-4 ${className}`}>
                <Banner300x250 />
                <Banner160x600 className="hidden xl:flex" />
            </div>
        );
    }

    if (type === 'banner' || type === 'blog_top') {
        return (
            <div className={`flex justify-center w-full ${className}`}>
                {/* Responsive: only show one banner size based on screen */}
                <div className="hidden md:block"><Banner728x90 /></div>
                <div className="hidden sm:block md:hidden"><Banner468x60 /></div>
                <div className="block sm:hidden"><Banner320x50 /></div>
            </div>
        );
    }

    return null;
}
