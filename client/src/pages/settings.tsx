import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings, Bot, Bell, Volume2, Palette, Shield, Trash2, Key, Copy, Plus, Lock, Check, BarChart3, Smartphone, Zap, ArrowUpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useTheme } from '@/components/theme-provider';
import { apiRequest } from '@/lib/queryClient';
import { ReferralSection } from '@/components/referral-section';
import { THEME_MAPPING, THEME_PREVIEWS, DISPLAY_THEMES } from '@/lib/theme-data';
import { PreloadedImage } from '@/components/preloaded-image';
import { Badge } from '@/components/ui/badge';
import StreamCoin from '@/components/stream-coin';
import { useQuery } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';

// Settings stored in localStorage
const SETTINGS_KEY = 'streamvault_settings';

interface AppSettings {
    chatbotEnabled: boolean;
    soundEnabled: boolean;
    autoplayTrailers: boolean;
    showAdultContent: boolean;
    pushNotifications: boolean;
    emailNotifications: boolean;
    friendActivityVisible: boolean;
    defaultVideoQuality: 'auto' | '1080p' | '720p' | '480p';
    subtitlesEnabled: boolean;
}

const defaultSettings: AppSettings = {
    chatbotEnabled: true,
    soundEnabled: true,
    autoplayTrailers: true,
    showAdultContent: false,
    pushNotifications: true,
    emailNotifications: true,
    friendActivityVisible: true,
    defaultVideoQuality: 'auto',
    subtitlesEnabled: true,
};

interface ApiKey {
    id: string;
    key: string;
    name: string;
    scope: string;
    createdAt: string;
    lastUsed?: string;
    requestsToday: number;
    requestsThisMinute: number;
    lastMinuteReset: string;
    lastDayReset: string;
    // New fields
    rateLimitDaily: number;
    rateLimitMinute: number;
    tier: 'free' | 'pro' | 'enterprise';
}

const TIER_CONFIG = {
    'free': { daily: 1000, minute: 60, cost: 0, name: 'Free' },
    'pro': { daily: 10000, minute: 600, cost: 1000, name: 'Pro' },
    'enterprise': { daily: 100000, minute: 6000, cost: 5000, name: 'Enterprise' }
};

export default function SettingsPage() {
    const [, navigate] = useLocation();
    const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [, setLocation] = useLocation();

    // Fetch User Badges to check ownership
    const { data: userBadges = [] } = useQuery<any[]>({
        queryKey: [`/api/users/${user?.id}/badges`],
        enabled: !!user,
    });

    // Fetch store products to get updated images
    const { data: products = [] } = useQuery<any[]>({
        queryKey: ['/api/store/products'],
    });
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isSaving, setIsSaving] = useState(false);

    // API Keys state
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

    // Delete account state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Upgrade state
    const [upgradeKey, setUpgradeKey] = useState<ApiKey | null>(null);
    const [isUpgrading, setIsUpgrading] = useState(false);


    // PWA App Icon state
    const [isPWA, setIsPWA] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState<string>(() => {
        return localStorage.getItem('streamvault_app_icon') || 'default';
    });

    // Detect if running as installed PWA
    useEffect(() => {
        const checkPWA = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                || (window.navigator as any).standalone === true;
            setIsPWA(isStandalone);
        };
        checkPWA();
        const mql = window.matchMedia('(display-mode: standalone)');
        mql.addEventListener('change', checkPWA);
        return () => mql.removeEventListener('change', checkPWA);
    }, []);

    const handleIconChange = (iconId: string) => {
        setSelectedIcon(iconId);
        localStorage.setItem('streamvault_app_icon', iconId);

        // Swap the manifest link tag
        const existingLink = document.querySelector('link[rel="manifest"]');
        if (existingLink) {
            (existingLink as HTMLLinkElement).href = iconId === 'alt'
                ? '/manifest-alt.json'
                : '/manifest.webmanifest';
        }

        toast({
            title: 'App Icon Updated',
            description: 'The icon will update next time you relaunch the app.',
        });
    };

    // Load settings from server (with localStorage fallback)
    useEffect(() => {
        const loadSettings = async () => {
            if (!isAuthenticated) {
                // Not logged in, use localStorage only
                const savedSettings = localStorage.getItem(SETTINGS_KEY);
                if (savedSettings) {
                    try {
                        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
                    } catch (e) {
                        console.error('Failed to parse local settings:', e);
                    }
                }
                return;
            }

            try {
                // Fetch settings from server
                const response = await apiRequest('GET', '/api/user/settings');
                const serverSettings = await response.json();
                const mergedSettings = { ...defaultSettings, ...serverSettings };
                setSettings(mergedSettings);
                // Also save to localStorage for offline access
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
            } catch (error) {
                console.error('Failed to fetch settings from server:', error);
                // Fall back to localStorage
                const savedSettings = localStorage.getItem(SETTINGS_KEY);
                if (savedSettings) {
                    try {
                        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
                    } catch (e) {
                        console.error('Failed to parse local settings:', e);
                    }
                }
            }
        };
        loadSettings();
    }, [isAuthenticated]);

    // Fetch API keys
    useEffect(() => {
        if (isAuthenticated) {
            fetchApiKeys();
        }
    }, [isAuthenticated]);

    const fetchApiKeys = async () => {
        try {
            const response = await apiRequest('GET', '/api/keys');
            const keys = await response.json();
            setApiKeys(keys);
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
        }
    };

    const createApiKey = async () => {
        if (!newKeyName.trim()) {
            toast({ title: 'Error', description: 'Please enter a name for the API key', variant: 'destructive' });
            return;
        }
        setIsCreatingKey(true);
        try {
            const response = await apiRequest('POST', '/api/keys', { name: newKeyName.trim() });
            const key = await response.json();
            setNewlyCreatedKey(key.key);
            setNewKeyName('');
            fetchApiKeys();
            toast({ title: 'API Key Created', description: 'Copy your key now - it won\'t be shown again!' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to create API key', variant: 'destructive' });
        } finally {
            setIsCreatingKey(false);
        }
    };

    const deleteApiKey = async (id: string) => {
        try {
            await apiRequest('DELETE', `/api/keys/${id}`);
            setApiKeys(apiKeys.filter(k => k.id !== id));
            toast({ title: 'API Key Deleted', description: 'The API key has been revoked' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete API key', variant: 'destructive' });
        }
    };

    const handleUpgrade = (key: ApiKey) => {
        setUpgradeKey(key);
    };

    const confirmUpgrade = async (tier: 'pro' | 'enterprise') => {
        if (!upgradeKey) return;

        const config = TIER_CONFIG[tier];
        if (user.coins < config.cost) {
            toast({
                title: 'Insufficient Coins',
                description: `You need ${config.cost} coins for this upgrade. You have ${user.coins}.`,
                variant: 'destructive'
            });
            return;
        }

        setIsUpgrading(true);
        try {
            const res = await apiRequest('POST', `/api/keys/${upgradeKey.id}/upgrade`, { tier });
            const updatedKey = await res.json();

            // Update local state
            setApiKeys(apiKeys.map(k => k.id === updatedKey.id ? updatedKey : k));

            // Refresh user to get updated coin balance
            window.location.reload(); // Simple way to refresh auth context or invalidate query
            // Or better: invalidate query
            // queryClient.invalidateQueries(['/api/auth/me']); // Need queryClient access

            toast({
                title: 'Upgrade Successful!',
                description: `API Key upgraded to ${config.name} tier.`
            });
            setUpgradeKey(null);
        } catch (error: any) {
            toast({
                title: 'Upgrade Failed',
                description: error.message || 'Failed to upgrade API key',
                variant: 'destructive'
            });
        } finally {
            setIsUpgrading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied!', description: 'API key copied to clipboard' });
    };

    // Redirect if not logged in
    if (!authLoading && !isAuthenticated) {
        navigate('/login');
        return null;
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));

        // Save all settings to server
        if (isAuthenticated) {
            try {
                await apiRequest('PUT', '/api/user/settings', newSettings);
            } catch (error) {
                console.error('Failed to save settings to server:', error);
            }
        }

        // Dispatch event for other components to react
        window.dispatchEvent(new CustomEvent('settings-changed', { detail: { key, value } }));
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            toast({ title: 'Error', description: "Please type 'DELETE' to confirm", variant: 'destructive' });
            return;
        }
        if (!deletePassword) {
            toast({ title: 'Error', description: 'Password is required', variant: 'destructive' });
            return;
        }

        setIsDeleting(true);
        try {
            const response = await apiRequest('DELETE', '/api/user/account', {
                password: deletePassword,
                confirmText: deleteConfirmText
            });
            const result = await response.json();

            if (result.success) {
                toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted' });
                localStorage.removeItem(SETTINGS_KEY);
                localStorage.removeItem('streamvault_watchlist');
                localStorage.removeItem('streamvault_progress');
                logout();
                navigate('/');
            }
        } catch (error: any) {
            const message = error?.message || 'Failed to delete account';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
            setDeletePassword('');
            setDeleteConfirmText('');
        }
    };

    const handleSaveSettings = () => {
        // Validate username if it has been changed
        // Note: We don't have direct access to the form state here unless we lift it up or check current settings vs initial
        // But settings page usually updates settings state directly. 
        // Wait, settings page updates `settings` object which has preferences, but USER PROFILE updates are separate?
        // Ah, looking at the code, SettingsPage updates APP SETTINGS (notifications, theme etc).
        // It does NOT seem to look like it updates the username/bio.
        // Let me double check the code I viewed earlier.

        setIsSaving(true);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        setTimeout(() => {
            setIsSaving(false);
            toast({
                title: 'Settings saved',
                description: 'Your preferences have been updated.',
            });
        }, 500);
    };

    const handleResetSettings = () => {
        setSettings(defaultSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        toast({
            title: 'Settings reset',
            description: 'All settings have been restored to defaults.',
        });
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Settings className="h-8 w-8" />
                    Settings
                </h1>
                <p className="text-muted-foreground mt-2">Customize your StreamVault experience</p>
            </div>

            <div className="space-y-6">
                {/* Appearance */}
                {/* Appearance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            Appearance
                        </CardTitle>
                        <CardDescription>Customize the look and feel of StreamVault</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-base">System Theme</Label>
                            <div className="flex flex-wrap gap-4">
                                <Button
                                    variant={theme === 'light' ? 'default' : 'outline'}
                                    className="w-24"
                                    onClick={() => setTheme('light')}
                                >
                                    Light
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'default' : 'outline'}
                                    className="w-24"
                                    onClick={() => setTheme('dark')}
                                >
                                    Dark
                                </Button>
                                <Button
                                    variant={theme === 'system' ? 'default' : 'outline'}
                                    className="w-24"
                                    onClick={() => setTheme('system')}
                                >
                                    System
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <Label className="text-base">App Themes</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {DISPLAY_THEMES.map(({ name, id }) => {
                                    // Check if user owns ANY badge that maps to this theme ID
                                    // This ensures old "Neon" or "Neon Skin" owners can still use "Neon Theme" if we map them together,
                                    // OR gives us flexibility. But here, we specifically want to see if they own the badge corresponding to the theme.
                                    // Adjusted Logic: Check if they own a badge with the exact name OR if they own a badge that maps to the same ID?
                                    // Let's check for the Name specifically first, or map their badges.

                                    const owned = userBadges.some((ub: any) => {
                                        const badgeName = ub.badge?.name || ub.badgeId;
                                        // Specific check: DOES this user's badge map to the CURRENT theme ID we are showing?
                                        // e.g. "Neon" maps to "neon-theme". "Neon Theme" (displayed) is "neon-theme". Match!
                                        return THEME_MAPPING[badgeName] === id;
                                    });

                                    // Find product to get dynamic image
                                    const product = products.find((p: any) => p.name === name);
                                    const imageUrl = product?.imageUrl || THEME_PREVIEWS[id];

                                    return (
                                        <ThemeCard
                                            key={id}
                                            id={id}
                                            name={name}
                                            imageUrl={imageUrl} // Pass dynamic image
                                            active={theme === id}
                                            locked={!owned}
                                            setTheme={(t) => setTheme(t as any)}
                                            setLocation={setLocation}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* App Icon - Only visible in installed PWA */}
                {isPWA && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Smartphone className="h-5 w-5" />
                                App Icon
                            </CardTitle>
                            <CardDescription>Change your app icon on the home screen</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {/* Default Icon */}
                                <button
                                    onClick={() => handleIconChange('default')}
                                    className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${selectedIcon === 'default'
                                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                        : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md">
                                        <img src="/icons/icon.svg" alt="Default" className="w-full h-full object-cover bg-[#0a0a0a]" />
                                    </div>
                                    <span className="text-sm font-medium">Default</span>
                                    {selectedIcon === 'default' && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3 h-3 text-primary-foreground" />
                                        </div>
                                    )}
                                </button>

                                {/* Alternate Icon - Red S */}
                                <button
                                    onClick={() => handleIconChange('alt')}
                                    className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${selectedIcon === 'alt'
                                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                        : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md">
                                        <img src="/icons/icon-alt.png" alt="Red S" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-sm font-medium">Red S</span>
                                    {selectedIcon === 'alt' && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3 h-3 text-primary-foreground" />
                                        </div>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                After changing the icon, relaunch the app for the change to take effect on your home screen.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Features */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            Features
                        </CardTitle>
                        <CardDescription>Enable or disable app features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="chatbot">AI Chatbot</Label>
                                <p className="text-sm text-muted-foreground">Show the AI assistant chat widget</p>
                            </div>
                            <Switch
                                id="chatbot"
                                checked={settings.chatbotEnabled}
                                onCheckedChange={(checked) => updateSetting('chatbotEnabled', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="autoplay">Autoplay Trailers</Label>
                                <p className="text-sm text-muted-foreground">Automatically play trailers on content pages</p>
                            </div>
                            <Switch
                                id="autoplay"
                                checked={settings.autoplayTrailers}
                                onCheckedChange={(checked) => updateSetting('autoplayTrailers', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="subtitles">Subtitles by Default</Label>
                                <p className="text-sm text-muted-foreground">Enable subtitles automatically when available</p>
                            </div>
                            <Switch
                                id="subtitles"
                                checked={settings.subtitlesEnabled}
                                onCheckedChange={(checked) => updateSetting('subtitlesEnabled', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Playback */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Volume2 className="h-5 w-5" />
                            Playback
                        </CardTitle>
                        <CardDescription>Video and audio preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="quality">Default Video Quality</Label>
                                <p className="text-sm text-muted-foreground">Preferred streaming quality</p>
                            </div>
                            <Select
                                value={settings.defaultVideoQuality}
                                onValueChange={(value: 'auto' | '1080p' | '720p' | '480p') => updateSetting('defaultVideoQuality', value)}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="1080p">1080p</SelectItem>
                                    <SelectItem value="720p">720p</SelectItem>
                                    <SelectItem value="480p">480p</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="sound">Sound Effects</Label>
                                <p className="text-sm text-muted-foreground">Play notification and UI sounds</p>
                            </div>
                            <Switch
                                id="sound"
                                checked={settings.soundEnabled}
                                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notifications
                        </CardTitle>
                        <CardDescription>Manage your notification preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="push">Push Notifications</Label>
                                <p className="text-sm text-muted-foreground">Get browser notifications for updates</p>
                            </div>
                            <Switch
                                id="push"
                                checked={settings.pushNotifications}
                                onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="email">Email Notifications</Label>
                                <p className="text-sm text-muted-foreground">Receive email updates about new content</p>
                            </div>
                            <Switch
                                id="email"
                                checked={settings.emailNotifications}
                                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Privacy */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Privacy
                        </CardTitle>
                        <CardDescription>Control your privacy settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="activity">Show Activity to Friends</Label>
                                <p className="text-sm text-muted-foreground">Let friends see what you're watching</p>
                            </div>
                            <Switch
                                id="activity"
                                checked={settings.friendActivityVisible}
                                onCheckedChange={(checked) => updateSetting('friendActivityVisible', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="adult">Adult Content</Label>
                                <p className="text-sm text-muted-foreground">Show 18+ content in search results</p>
                            </div>
                            <Switch
                                id="adult"
                                checked={settings.showAdultContent}
                                onCheckedChange={(checked) => updateSetting('showAdultContent', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Referral System */}
                <ReferralSection showLeaderboard={false} />

                {/* API Keys */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            API Keys
                        </CardTitle>
                        <CardDescription>
                            Generate API keys for external access (read-only). Rate limited to 60 req/min and 1000 req/day.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Create new key */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Key name (e.g., My Bot)"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={createApiKey} disabled={isCreatingKey}>
                                {isCreatingKey ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Create
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Newly created key (show once) */}
                        {newlyCreatedKey && (
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <p className="text-sm font-medium text-green-500 mb-1">🎉 New API Key Created!</p>
                                <p className="text-xs text-muted-foreground mb-2">Copy this key now - it won't be shown again:</p>
                                <div className="flex gap-2">
                                    <code className="flex-1 p-2 bg-background rounded text-xs break-all">{newlyCreatedKey}</code>
                                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(newlyCreatedKey)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-xs"
                                    onClick={() => setNewlyCreatedKey(null)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}

                        {/* Existing keys */}
                        {apiKeys.length > 0 ? (
                            <div className="space-y-3">
                                {apiKeys.map((key) => {
                                    const dailyPercent = Math.min((key.requestsToday / (key.rateLimitDaily || 1000)) * 100, 100);
                                    const minutePercent = Math.min((key.requestsThisMinute / (key.rateLimitMinute || 60)) * 100, 100);
                                    const dayResetDate = new Date(key.lastDayReset);
                                    dayResetDate.setUTCDate(dayResetDate.getUTCDate() + 1);
                                    dayResetDate.setUTCHours(0, 0, 0, 0);
                                    const minuteResetDate = new Date(key.lastMinuteReset);
                                    minuteResetDate.setTime(minuteResetDate.getTime() + 60000);

                                    return (
                                        <div key={key.id} className="p-4 bg-muted/50 rounded-lg border relative overflow-hidden">
                                            <div className="flex items-start justify-between mb-3 pr-16 relative">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 font-medium">
                                                        {key.name}
                                                        <Badge variant={key.tier === 'enterprise' ? 'default' : key.tier === 'pro' ? 'secondary' : 'outline'} className="uppercase text-[10px]">
                                                            {key.tier || 'FREE'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-mono">{key.key}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Created {new Date(key.createdAt).toLocaleDateString()}
                                                        {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleString()}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1 absolute top-0 right-0">
                                                    {(!key.tier || key.tier === 'free') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1 text-xs"
                                                            onClick={() => handleUpgrade(key)}
                                                        >
                                                            <Zap className="h-3 w-3 text-yellow-500" />
                                                            Upgrade
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => deleteApiKey(key.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Usage Stats */}
                                            <div className="space-y-2 pt-2 border-t mt-2">
                                                <div className="flex items-center gap-2">
                                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-xs font-medium">Usage</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span>Daily ({key.requestsToday}/{key.rateLimitDaily || 1000})</span>
                                                            <span className="text-muted-foreground">Resets at midnight UTC</span>
                                                        </div>
                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${dailyPercent > 90 ? 'bg-red-500' : dailyPercent > 70 ? 'bg-yellow-500' : 'bg-primary'}`}
                                                                style={{ width: `${dailyPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span>Per minute ({key.requestsThisMinute}/{key.rateLimitMinute || 60})</span>
                                                            <span className="text-muted-foreground">Resets every minute</span>
                                                        </div>
                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${minutePercent > 90 ? 'bg-red-500' : minutePercent > 70 ? 'bg-yellow-500' : 'bg-primary'}`}
                                                                style={{ width: `${minutePercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No API keys yet. Create one to access the API externally.
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Use your API key by including the <code className="bg-muted px-1 rounded">X-API-Key</code> header in your requests.
                        </p>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-500/30 bg-red-950/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-400">
                            <Trash2 className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription className="text-red-400/70">
                            Irreversible and destructive actions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-red-400">Delete Account</Label>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete your account and all data. This cannot be undone.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                Delete Account
                            </Button>
                        </div>

                        {/* Delete Confirmation Dialog */}
                        {showDeleteDialog && (
                            <div className="mt-4 p-4 border border-red-500/50 rounded-lg bg-red-950/20">
                                <h4 className="font-semibold text-red-400 mb-3">Confirm Account Deletion</h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    This will permanently delete your account, including all your watchlist, progress, friends, messages, badges, comments, and settings. This action is irreversible.
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="deletePassword" className="text-sm">Enter your password</Label>
                                        <Input
                                            id="deletePassword"
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder="Your password"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="deleteConfirm" className="text-sm">Type <strong>DELETE</strong> to confirm</Label>
                                        <Input
                                            id="deleteConfirm"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder="DELETE"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            variant="destructive"
                                            onClick={handleDeleteAccount}
                                            disabled={isDeleting || deleteConfirmText !== 'DELETE' || !deletePassword}
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Deleting...
                                                </>
                                            ) : 'Permanently Delete My Account'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowDeleteDialog(false);
                                                setDeletePassword('');
                                                setDeleteConfirmText('');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upgrade Dialog */}
                <Dialog open={!!upgradeKey} onOpenChange={(open) => !open && setUpgradeKey(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Upgrade API Plan</DialogTitle>
                            <DialogDescription>
                                Purchase higher rate limits for <strong>{upgradeKey?.name}</strong> using StreamCoins.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {/* Pro Tier */}
                            <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${(!upgradeKey?.tier || upgradeKey?.tier === 'free') ? 'border-primary/50 hover:border-primary' : 'opacity-50 border-muted'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold flex items-center gap-2">
                                            Pro Tier
                                            {upgradeKey?.tier === 'pro' && <Badge variant="secondary">Current</Badge>}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">For serious developers</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-lg text-yellow-500">1,000</span>
                                        <span className="text-xs text-muted-foreground block">coins</span>
                                    </div>
                                </div>
                                <ul className="text-sm space-y-1">
                                    <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 10,000 requests / day</li>
                                    <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 600 requests / minute</li>
                                </ul>
                                {(!upgradeKey?.tier || upgradeKey?.tier === 'free') && (
                                    <Button className="w-full mt-4" onClick={() => confirmUpgrade('pro')} disabled={isUpgrading}>
                                        {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase Pro"}
                                    </Button>
                                )}
                            </div>

                            {/* Enterprise Tier */}
                            <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${upgradeKey?.tier !== 'enterprise' ? 'border-primary/50 hover:border-primary' : 'opacity-50 border-muted'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold flex items-center gap-2">
                                            Enterprise Tier
                                            {upgradeKey?.tier === 'enterprise' && <Badge variant="default">Current</Badge>}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">For commercial apps</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-lg text-yellow-500">5,000</span>
                                        <span className="text-xs text-muted-foreground block">coins</span>
                                    </div>
                                </div>
                                <ul className="text-sm space-y-1">
                                    <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 100,000 requests / day</li>
                                    <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" /> 6,000 requests / minute</li>
                                </ul>
                                {upgradeKey?.tier !== 'enterprise' && (
                                    <Button className="w-full mt-4" onClick={() => confirmUpgrade('enterprise')} disabled={isUpgrading}>
                                        {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Purchase Enterprise"}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-between text-xs text-muted-foreground">
                            <span>Your Balance: <span className="text-yellow-500 font-bold">{user?.coins || 0}</span> Coins</span>
                            {/* <Button type="button" variant="secondary" onClick={() => setUpgradeKey(null)}>
                                Close
                            </Button> */}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>


                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleSaveSettings} disabled={isSaving} className="flex-1">
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </Button>
                    <Button variant="outline" onClick={handleResetSettings}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Reset to Defaults
                    </Button>
                </div>
            </div>
        </div >
    );
}

function ThemeCard({ id, name, imageUrl, active, locked, setTheme, setLocation }: {
    id: string;
    name: string;
    imageUrl?: string;
    active: boolean;
    locked?: boolean;
    setTheme: (t: string) => void;
    setLocation: (path: string) => void;
}) {
    return (
        <div
            className={`
                relative group cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300
                ${active ? 'border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] ring-2 ring-primary/20 scale-[1.02]' : 'border-white/5 hover:border-white/20 hover:scale-[1.01] hover:shadow-xl'}
                ${locked ? 'opacity-90' : ''}
            `}
            onClick={() => {
                if (locked) {
                    setLocation(`/store?search=${encodeURIComponent(name)}`);
                } else {
                    setTheme(id);
                }
            }}
        >
            <div className="aspect-video bg-muted relative overflow-hidden">
                {/* Background Preview */}
                <div className={`absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110 ${locked ? 'grayscale-[0.7] blur-[1px] group-hover:blur-none group-hover:grayscale-0' : ''}`}>
                    <PreloadedImage
                        src={imageUrl || THEME_PREVIEWS[id]}
                        alt={name}
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                    />
                </div>

                {/* Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity`} />

                {/* Active Indicator */}
                {active && (
                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground p-1.5 px-3 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                        <Check className="w-3.5 h-3.5" />
                        Active
                    </div>
                )}

                {/* Locked Indicator / Price */}
                {locked && (
                    <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center justify-end bg-gradient-to-t from-black/90 to-transparent pt-12">
                        <div className="flex flex-col items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-colors">
                                <Lock className="w-3 h-3 group-hover:hidden" />
                                <span className="font-bold text-sm group-hover:hidden">Unlock</span>
                                <span className="hidden group-hover:inline font-bold text-sm">Buy Now</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-yellow-500 font-bold text-sm bg-black/60 px-2 py-0.5 rounded-md mt-1 mb-1">
                                <StreamCoin size="sm" />
                                <span>500</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-card/50 backdrop-blur-sm border-t border-white/5 relative z-10 text-center">
                <div className="font-bold text-base truncate flex items-center justify-center relative">
                    {name}
                    {!locked && !active && (
                        <div className="absolute right-0 w-2 h-2 rounded-full bg-white/20 group-hover:bg-primary transition-colors" />
                    )}
                </div>
            </div>
        </div>
    );
}
