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
    const [adEnabled, setAdEnabled] = useState(true);
    const { user } = useAuth();

    // Initialize preference from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("ad_preference");
        if (stored !== null) {
            setAdEnabled(stored === "true");
        }
    }, []);

    const isSubscribed = !!(user?.adFreeUntil && new Date(user.adFreeUntil) > new Date());

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
    // adEnabled=true means "ads are enabled" (default state)
    // Switch in header: checked={!adEnabled} → switch ON = ad-free active = adEnabled=false
    // Show ads on ad domain UNLESS user is subscribed AND has toggled ad-free ON (adEnabled=false)
    const isAdDomain = typeof window !== 'undefined' && (window.location.hostname.includes("streamvault.in") || window.location.hostname === 'localhost');
    const showAds = isAdDomain && !(isSubscribed && !adEnabled);

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
            // Run cleanup immediately
            cleanupAllAdElements();

            // Use MutationObserver to catch async ad element injections
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== Node.ELEMENT_NODE) continue;
                        const el = node as HTMLElement;

                        // Check if this is an ad element and remove it immediately
                        if (isAdElement(el)) {
                            el.remove();
                            continue;
                        }
                    }
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Also run periodic cleanup as a safety net (catches elements injected before observer was ready)
            const cleanupInterval = setInterval(() => {
                cleanupAllAdElements();
            }, 500);

            // After 10 seconds, slow down the interval (ads should be fully cleaned by then)
            const slowdownTimer = setTimeout(() => {
                clearInterval(cleanupInterval);
            }, 10000);

            return () => {
                observer.disconnect();
                clearInterval(cleanupInterval);
                clearTimeout(slowdownTimer);
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

// Check if a DOM element is an ad-injected element
function isAdElement(el: HTMLElement): boolean {
    const tag = el.tagName;

    // Scripts from Adsterra
    if (tag === 'SCRIPT') {
        const src = el.getAttribute('src') || '';
        if (src.includes('openairtowhardworking.com') || src.includes('adsterra')) return true;
        if (el.hasAttribute('data-ad-script')) return true;
    }

    // Iframes from Adsterra
    if (tag === 'IFRAME') {
        const src = el.getAttribute('src') || '';
        if (src.includes('openairtowhardworking.com') || src.includes('adsterra') || src.includes('wayfarer')) return true;
        // Body-level iframes without our data attribute are likely ads
        if (el.parentElement === document.body && !el.getAttribute('data-app-iframe') && !el.id?.startsWith('root')) return true;
    }

    // High z-index fixed/absolute positioned overlays (social bar, popunder overlays)
    const style = el.style;
    const zIndex = parseInt(style.zIndex || '0');
    if ((style.position === 'fixed' || style.position === 'absolute') && zIndex > 9000) {
        if (!el.id?.startsWith('root') && !el.classList.contains('toaster') && !el.hasAttribute('data-radix-portal') && !el.id?.includes('streamvault')) {
            return true;
        }
    }

    // Divs with ad-related IDs or classes
    if (el.id?.match(/^ad[-_]|[-_]ad$/i) || el.className?.toString().includes('adsterra')) return true;

    return false;
}

// Aggressively remove all Adsterra-injected DOM elements
function cleanupAllAdElements() {
    // Remove all scripts from Adsterra domain
    document.querySelectorAll('script[src*="openairtowhardworking.com"]').forEach(el => el.remove());
    document.querySelectorAll('script[src*="adsterra"]').forEach(el => el.remove());
    document.querySelectorAll('script[data-ad-script]').forEach(el => el.remove());

    // Remove social bar / popunder injected iframes and containers
    document.querySelectorAll('iframe[src*="openairtowhardworking.com"]').forEach(el => el.remove());
    document.querySelectorAll('iframe[src*="adsterra"]').forEach(el => el.remove());
    document.querySelectorAll('iframe[src*="wayfarer"]').forEach(el => el.remove());

    // Remove fixed/absolute positioned ad overlays injected by Adsterra
    document.querySelectorAll('div[id*="ad-"], div[id*="_ad"], div[class*="adsterra"]').forEach(el => el.remove());

    // Remove any elements with inline styles that look like ad overlays (high z-index fixed elements)
    document.querySelectorAll('body > div, body > iframe, body > ins').forEach(el => {
        const htmlEl = el as HTMLElement;
        const style = htmlEl.style;
        const zIndex = parseInt(style.zIndex || '0');
        if ((style.position === 'fixed' || style.position === 'absolute') && zIndex > 9000) {
            if (!htmlEl.id?.startsWith('root') && !htmlEl.classList.contains('toaster') && !htmlEl.hasAttribute('data-radix-portal')) {
                htmlEl.remove();
            }
        }
    });

    // Remove any remaining ad-related iframes injected into body
    document.querySelectorAll('body > iframe').forEach(el => {
        const iframe = el as HTMLIFrameElement;
        if (!iframe.id?.startsWith('root') && !iframe.getAttribute('data-app-iframe')) {
            iframe.remove();
        }
    });

    // Remove any <ins> elements (Adsterra uses these)
    document.querySelectorAll('body > ins').forEach(el => el.remove());
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
        <div className="flex justify-center my-4 w-full">
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
    // Smartlinks are always visible regardless of ad-free state (per user request)

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
