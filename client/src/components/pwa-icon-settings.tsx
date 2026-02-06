import { useState, useEffect } from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Smartphone } from 'lucide-react';

export function PWAIconSettings() {
    const [isPWA, setIsPWA] = useState(false);
    const [appIcon, setAppIcon] = useState('default');

    useEffect(() => {
        // Detect if running in standalone mode (installed PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        setIsPWA(isStandalone);

        // Load saved preference
        const savedIcon = localStorage.getItem('app-icon-preference');
        if (savedIcon) {
            setAppIcon(savedIcon);
        }
    }, []);

    const handleIconChange = (value: string) => {
        setAppIcon(value);
        localStorage.setItem('app-icon-preference', value);

        // Dispatch event for immediate update
        window.dispatchEvent(new CustomEvent('app-icon-changed', { detail: value }));
    };

    if (!isPWA) return null;

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-primary" />
                        App Icon
                    </Label>
                    <p className="text-sm text-muted-foreground">Choose the icon for your home screen</p>
                </div>
            </div>

            <RadioGroup value={appIcon} onValueChange={handleIconChange} className="grid grid-cols-2 gap-4">

                {/* Default Icon */}
                <div>
                    <RadioGroupItem value="default" id="icon-default" className="peer sr-only" />
                    <Label
                        htmlFor="icon-default"
                        className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer relative overflow-hidden group"
                    >
                        <div className="mb-3 rounded-2xl overflow-hidden w-16 h-16 bg-black flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <img src="/favicon.svg" alt="Default" className="w-12 h-12" />
                        </div>
                        <span className="font-semibold text-sm">Default</span>
                        <div className="absolute top-2 right-2 opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity text-primary">
                            <Check className="w-4 h-4" />
                        </div>
                    </Label>
                </div>

                {/* Custom Icon */}
                <div>
                    <RadioGroupItem value="custom" id="icon-custom" className="peer sr-only" />
                    <Label
                        htmlFor="icon-custom"
                        className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer relative overflow-hidden group"
                    >
                        <div className="mb-3 rounded-2xl overflow-hidden w-16 h-16 bg-black flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <img src="/icons/alternate-icon.png" alt="Custom" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-sm">StreamVault Pro</span>
                        <div className="absolute top-2 right-2 opacity-0 peer-data-[state=checked]:opacity-100 transition-opacity text-primary">
                            <Check className="w-4 h-4" />
                        </div>
                    </Label>
                </div>
            </RadioGroup>
        </div>
    );
}
