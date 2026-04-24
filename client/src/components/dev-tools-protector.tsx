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

    useEffect(() => {
        if (!isProtectionEnabled) return;

        let devToolsOpen = false;

        const checkDevTools = () => {
            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;
            
            if (widthDiff || heightDiff) {
                devToolsOpen = true;
                setIsDevToolsOpen(true);
            } else {
                devToolsOpen = false;
                setIsDevToolsOpen(false);
            }
        };

        window.addEventListener('resize', checkDevTools);
        checkDevTools();

        const interval = setInterval(() => {
            const start = performance.now();
            
            // We use an eval-like approach to prevent some minifiers from stripping the debugger
            const check = new Function("debugger");
            check();
            
            const end = performance.now();
            
            // If the debugger took more than 100ms, it means DevTools was open 
            // and the user was trapped until they closed it or forced resume.
            if (end - start > 100) {
                // If they just resumed, it means DevTools is STILL open!
                // We show the warning.
                setIsDevToolsOpen(true);
            }
        }, 1000);

        return () => {
            window.removeEventListener('resize', checkDevTools);
            clearInterval(interval);
        };
    }, [isProtectionEnabled]);

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
