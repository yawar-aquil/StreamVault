import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function NotificationPrompt() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [showPrompt, setShowPrompt] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Check if notifications are supported
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            return;
        }

        setPermission(Notification.permission);

        // Show prompt after delay if permission not granted
        if (Notification.permission === "default") {
            const timer = setTimeout(() => setShowPrompt(true), 45000); // 45 seconds
            return () => clearTimeout(timer);
        }
    }, []);

    const subscribe = async () => {
        setIsSubscribing(true);
        try {
            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== "granted") {
                toast({
                    title: "Notifications Blocked",
                    description: "Please enable notifications in your browser settings.",
                    variant: "destructive",
                });
                setIsSubscribing(false);
                return;
            }

            // Get VAPID key
            const vapidRes = await fetch("/api/push/vapid-key");
            const { publicKey } = await vapidRes.json();

            if (!publicKey) {
                throw new Error("VAPID key not configured");
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
            });

            // Send subscription to server
            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
            });

            toast({
                title: "Notifications Enabled! 🔔",
                description: "You'll receive updates about new shows and movies.",
            });

            setShowPrompt(false);
        } catch (error) {
            console.error("Push subscription error:", error);
            toast({
                title: "Error",
                description: "Failed to enable notifications. Please try again.",
                variant: "destructive",
            });
        }
        setIsSubscribing(false);
    };

    if (!showPrompt || permission === "granted") {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
            <button
                onClick={() => setShowPrompt(false)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                    <Bell className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-sm">Stay Updated! 🎬</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Get notified when new movies and shows are added.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button
                            size="sm"
                            onClick={subscribe}
                            disabled={isSubscribing}
                            className="bg-red-600 hover:bg-red-700 text-xs"
                        >
                            {isSubscribing ? "Enabling..." : "Enable Notifications"}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowPrompt(false)}
                            className="text-xs"
                        >
                            Not Now
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
