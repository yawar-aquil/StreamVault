import { useEffect, useRef, useCallback } from 'react';

declare global {
    interface Window {
        hcaptcha?: {
            render: (container: string | HTMLElement, options: HCaptchaOptions) => string;
            reset: (widgetId?: string) => void;
            remove: (widgetId?: string) => void;
            getResponse: (widgetId?: string) => string;
            execute: (widgetId?: string) => void;
        };
        onHCaptchaLoad?: () => void;
    }
}

interface HCaptchaOptions {
    sitekey: string;
    callback?: (token: string) => void;
    'expired-callback'?: () => void;
    'error-callback'?: (err: string) => void;
    'chalexpired-callback'?: () => void;
    theme?: 'light' | 'dark';
    size?: 'normal' | 'compact' | 'invisible';
}

interface HCaptchaProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    theme?: 'light' | 'dark';
    size?: 'normal' | 'compact';
    className?: string;
}

// hCaptcha official test key — always passes. Used on localhost and as fallback.
// Get a real key at https://dashboard.hcaptcha.com and set VITE_HCAPTCHA_SITE_KEY.
const TEST_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001';

const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
);

const SITE_KEY = isLocalhost
    ? TEST_SITE_KEY
    : (import.meta.env.VITE_HCAPTCHA_SITE_KEY || TEST_SITE_KEY);

export function HCaptcha({
    onVerify,
    onExpire,
    onError,
    theme = 'dark',
    size = 'normal',
    className = '',
}: HCaptchaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    // Store callbacks in refs so the widget isn't recreated on every render
    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onVerifyRef.current = onVerify;
        onExpireRef.current = onExpire;
        onErrorRef.current = onError;
    });

    const renderWidget = useCallback(() => {
        if (!containerRef.current || !window.hcaptcha) return;
        if (widgetIdRef.current) {
            try { window.hcaptcha.remove(widgetIdRef.current); } catch { }
            widgetIdRef.current = null;
        }
        try {
            widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
                sitekey: SITE_KEY,
                callback: (token: string) => onVerifyRef.current(token),
                'expired-callback': () => onExpireRef.current?.(),
                'error-callback': () => onErrorRef.current?.(),
                theme,
                size,
            });
        } catch (err) {
            console.error('hCaptcha render error:', err);
        }
    }, [theme, size]);

    useEffect(() => {
        if (window.hcaptcha) {
            renderWidget();
        } else {
            const prev = window.onHCaptchaLoad;
            window.onHCaptchaLoad = () => {
                renderWidget();
                if (prev) prev();
            };
        }
        return () => {
            if (widgetIdRef.current && window.hcaptcha) {
                try { window.hcaptcha.remove(widgetIdRef.current); } catch { }
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

export function useHCaptchaVerify() {
    const verifyToken = async (token: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/hcaptcha/verify', {
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
