import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useKeyboardShortcuts() {
    const [, setLocation] = useLocation();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                (event.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            // Check for Shift + Key combinations
            if (event.shiftKey) {
                switch (event.key.toLowerCase()) {
                    case 'h':
                        event.preventDefault();
                        setLocation('/');
                        break;
                    case 's':
                        event.preventDefault();
                        setLocation('/search');
                        break;
                    case 'w':
                        event.preventDefault();
                        setLocation('/watchlist');
                        break;
                    case 'l':
                        event.preventDefault();
                        setLocation('/leaderboard');
                        break;
                    case 'c':
                        event.preventDefault();
                        setLocation('/calendar');
                        break;
                    case 'f':
                        event.preventDefault();
                        setLocation('/friends');
                        break;
                    case 'p':
                        event.preventDefault();
                        setLocation('/profile');
                        break;
                    case 'a':
                        event.preventDefault();
                        setLocation('/achievements');
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setLocation]);
}
