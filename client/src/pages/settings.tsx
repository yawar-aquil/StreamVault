import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings, Bot, Bell, Volume2, Palette, Shield, Trash2, Key, Copy, Plus, Lock, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme-provider';
import { apiRequest } from '@/lib/queryClient';
import { ReferralSection } from '@/components/referral-section';
import { THEME_MAPPING, THEME_PREVIEWS, DISPLAY_THEMES } from '@/lib/theme-data';
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
}

export default function SettingsPage() {
    const [, navigate] = useLocation();
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
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

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings({ ...defaultSettings, ...parsed });
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        }
    }, []);

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

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));

        // Dispatch event for other components to react
        window.dispatchEvent(new CustomEvent('settings-changed', { detail: { key, value } }));
    };

    const handleSaveSettings = () => {
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
                            Generate API keys for external access (read-only). Rate limited to 10 req/min, 50 req/day.
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
                            <div className="space-y-2">
                                {apiKeys.map((key) => (
                                    <div key={key.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{key.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{key.key}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Created {new Date(key.createdAt).toLocaleDateString()} •
                                                {key.requestsToday} requests today
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => deleteApiKey(key.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
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
        </div>
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
                    <img
                        src={imageUrl || THEME_PREVIEWS[id]}
                        alt={name}
                        className="w-full h-full object-cover"
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
