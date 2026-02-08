import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Check out what\'s new on StreamVault!',
        icon: data.icon || '/favicon.svg',
        badge: data.badge || '/favicon.svg',
        image: data.image,
        vibrate: [100, 50, 100],
        data: {
            url: data.url || 'https://streamvault.live',
            timestamp: data.timestamp
        },
        actions: [
            { action: 'open', title: 'Watch Now' },
            { action: 'close', title: 'Dismiss' }
        ],
        requireInteraction: true,
        tag: 'streamvault-notification'
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'StreamVault', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || 'https://streamvault.live';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Focus existing window if available
                for (const client of windowClients) {
                    if (client.url.includes('streamvault') && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window
                return clients.openWindow(url);
            })
    );
});
