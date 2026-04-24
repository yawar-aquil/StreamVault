import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';

export function DevToolsProtector() {
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

    // Fetch site settings
    const { data: settings } = useQuery({
        queryKey: ['/api/config/settings'],
        refetchInterval: 30000, // Check for updates every 30s
    });

    const isProtectionEnabled = settings?.devToolsProtection ?? true;

    const detectDevTools = useCallback(() => {
        if (!isProtectionEnabled) {
            setIsDevToolsOpen(false);
            return;
        }

        // Method 1: Screen size difference (detects docked DevTools)
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        
        if (widthDiff || heightDiff) {
            setIsDevToolsOpen(true);
            return;
        }

        // Method 2: Performance timing (detects debugger pause)
        // This is done in the interval below, but we also clear the flag
        // if neither method detects it.
        setIsDevToolsOpen(false);
    }, [isProtectionEnabled]);

    useEffect(() => {
        if (!isProtectionEnabled) return;

        // 1. Listen for window resize (when DevTools is docked/undocked)
        window.addEventListener('resize', detectDevTools);
        
        // 2. Initial check
        detectDevTools();

        // 3. Interval for debugger trap and timing detection
        let lastTime = performance.now();
        const interval = setInterval(() => {
            // Measure time elapsed before and after debugger
            const before = performance.now();
            
            // The actual debugger trap that freezes the DevTools
            // eslint-disable-next-line no-debugger
            debugger;
            
            const after = performance.now();
            
            // If the time between before and after is large, the debugger was triggered
            // meaning DevTools is open (even if undocked).
            if (after - before > 100) {
                setIsDevToolsOpen(true);
            } else {
                // Double check with size method just in case
                detectDevTools();
            }
            
            lastTime = after;
        }, 1000);

        return () => {
            window.removeEventListener('resize', detectDevTools);
            clearInterval(interval);
        };
    }, [isProtectionEnabled, detectDevTools]);

    if (!isDevToolsOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="bg-zinc-900/80 p-8 rounded-2xl border border-red-500/30 max-w-lg shadow-2xl backdrop-blur-sm">
                <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-6 animate-pulse" />
                <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
                    Developer Tools Detected
                </h1>
                <p className="text-zinc-300 text-lg mb-8 leading-relaxed">
                    For security reasons, this website cannot be used while Developer Tools are open. 
                    Please close the developer tools to continue watching.
                </p>
                <div className="text-sm font-medium text-zinc-500 bg-black/40 px-4 py-2 rounded-lg inline-block border border-zinc-800">
                    The page will automatically resume once closed.
                </div>
            </div>
        </div>
    );
}
