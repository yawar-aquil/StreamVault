import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
            // Show prompt after 30 seconds of browsing
            setTimeout(() => setIsVisible(true), 30000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;

        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setIsVisible(false);
        setInstallPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        // Don't show again for this session
        sessionStorage.setItem('installPromptDismissed', 'true');
    };

    // Don't render if installed, dismissed, or no prompt available
    if (isInstalled || !isVisible || !installPrompt) return null;
    if (sessionStorage.getItem('installPromptDismissed')) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-5">
            <div className="bg-card border border-border rounded-lg shadow-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">Install StreamVault</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Install the app for faster access and offline support
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-1 -mr-1"
                        onClick={handleDismiss}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex gap-2 mt-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleDismiss}
                    >
                        Not now
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleInstall}
                    >
                        Install
                    </Button>
                </div>
            </div>
        </div>
    );
}
