import { useEffect, useRef, useCallback } from 'react';

declare global {
    interface Window {
        turnstile: {
            render: (container: string | HTMLElement, options: TurnstileOptions) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
            getResponse: (widgetId: string) => string | undefined;
        };
        onTurnstileLoad?: () => void;
    }
}

interface TurnstileOptions {
    sitekey: string;
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
    appearance?: 'always' | 'execute' | 'interaction-only';
}

interface CloudflareTurnstileProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact';
    className?: string;
}

// Cloudflare's official test key - always passes, works on any domain including localhost
// Replace with real key via VITE_TURNSTILE_SITE_KEY env var in production
const TEST_SITE_KEY = '1x00000000000000000000AA'; // always passes
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || TEST_SITE_KEY;

export function CloudflareTurnstile({
    onVerify,
    onExpire,
    onError,
    theme = 'auto',
    size = 'normal',
    className = '',
}: CloudflareTurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) {
            try { window.turnstile.remove(widgetIdRef.current); } catch {}
            widgetIdRef.current = null;
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: SITE_KEY,
            callback: onVerify,
            'expired-callback': onExpire,
            'error-callback': onError,
            theme,
            size,
        });
    }, [onVerify, onExpire, onError, theme, size]);

    useEffect(() => {
        if (window.turnstile) {
            renderWidget();
        } else {
            const prev = window.onTurnstileLoad;
            window.onTurnstileLoad = () => {
                renderWidget();
                if (prev) prev();
            };
        }
        return () => {
            if (widgetIdRef.current) {
                try { window.turnstile.remove(widgetIdRef.current); } catch {}
                widgetIdRef.current = null;
            }
        };
    }, [renderWidget]);

    return (
        <div
            ref={containerRef}
            className={`flex justify-center ${className}`}
        />
    );
}

export function useTurnstileVerify() {
    const verifyToken = async (token: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/turnstile/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            return data.success === true;
        } catch {
            return false;
        }
    };
    return { verifyToken };
}
