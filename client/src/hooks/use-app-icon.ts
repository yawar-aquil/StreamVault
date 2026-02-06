import { useEffect } from 'react';

export function useAppIcon() {
    useEffect(() => {
        // Function to update icon based on preference
        const updateIcon = () => {
            const preference = localStorage.getItem('app-icon-preference');

            const linkIcon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            const linkApple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;

            if (preference === 'custom') {
                if (linkIcon) linkIcon.href = '/icons/alternate-icon.png';
                if (linkApple) linkApple.href = '/icons/alternate-icon.png';
            } else {
                // Default
                if (linkIcon) linkIcon.href = '/favicon.svg';
                if (linkApple) linkApple.href = '/apple-touch-icon.png';
            }
        };

        // Initial load
        updateIcon();

        // Listen for changes
        const handleIconChange = (e: CustomEvent<string>) => {
            updateIcon();
        };

        window.addEventListener('app-icon-changed', handleIconChange as EventListener);

        // Also listen to storage events (cross-tab sync)
        window.addEventListener('storage', updateIcon);

        return () => {
            window.removeEventListener('app-icon-changed', handleIconChange as EventListener);
            window.removeEventListener('storage', updateIcon);
        };
    }, []);
}
