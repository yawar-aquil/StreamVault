import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Bot, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Extracted for stability and performance
export function VaultAISettingsCard({ user, updateSettings }: { user: any, updateSettings: (s: any) => Promise<void> }) {
    const { toast } = useToast();

    // Parse initial settings safely
    // DEFAULT TO DISABLED (false) as requested by user
    const getInitialSettings = () => {
        try {
            return user?.vaultSettings ? JSON.parse(user.vaultSettings) : {
                enabled: false,
                inputMode: "voice_always",
                activationWord: "hey vault",
                glowColor: "#ef4444",
                fontFamily: "Inter",
                fontSize: "lg",
                glowIntensity: 50,
            };
        } catch (e) {
            return {
                enabled: false,
                inputMode: "voice_always",
                activationWord: "hey vault",
                glowColor: "#ef4444",
                fontFamily: "Inter",
                fontSize: "lg",
                glowIntensity: 50,
            };
        }
    };

    // Local state for immediate UI updates
    const [localSettings, setLocalSettings] = useState(getInitialSettings());
    const [isSyncing, setIsSyncing] = useState(false);

    // Ref for debouncing
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync from server ONLY if we are not currently editing (optional, usually safer to just let local drive)
    // Actually, we should sync if the user object changes from OUTSIDE (e.g. initial load), but avoid overwriting local edits.
    // For now, let's rely on local state being the truth while on this page.
    useEffect(() => {
        if (!user) return;
        // Only update if we haven't touched it yet? 
        // Or better: Update local state when user loads, effectively resetting "dirty" state.
        // But doing this naively causes the "snap back" issue if the server is slow.
        // We will only set it ONCE on mount or if user ID changes.
    }, [user?.id]);

    const handleChange = (key: string, value: any) => {
        // 1. Update Local State Immediately
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        setIsSyncing(true);

        // 2. Debounce Server Update
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                // Wrap in expected backend format
                await updateSettings({ vaultSettings: JSON.stringify(newSettings) });
                // Success - silent
            } catch (error) {
                console.error("Failed to sync settings:", error);
                toast({
                    title: "Sync Failed",
                    description: "Check your connection. Settings may not be saved.",
                    variant: "destructive"
                });
            } finally {
                setIsSyncing(false);
            }
        }, 500); // 500ms debounce
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Vault AI Assistant
                    {isSyncing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-2" />}
                </CardTitle>
                <CardDescription>Configure your voice assistant settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="vault-enabled">Enable Assistant</Label>
                        <p className="text-sm text-muted-foreground">Show the Vault AI orb and enable voice commands</p>
                    </div>
                    <Switch
                        id="vault-enabled"
                        checked={localSettings.enabled}
                        onCheckedChange={(checked) => handleChange("enabled", checked)}
                    />
                </div>

                <div className="space-y-4">
                    <Label>Input Mode</Label>
                    <Select
                        value={localSettings.inputMode}
                        onValueChange={(value) => handleChange("inputMode", value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="voice_always">Always Listening (Wake Word)</SelectItem>
                            <SelectItem value="voice_button">Button Activation</SelectItem>
                            <SelectItem value="text">Text Only</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        "Always Listening" activates when you say "Hey Vault". "Button Activation" requires clicking the orb.
                    </p>
                </div>

                <Separator />

                {/* Customization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <Label>Font Family</Label>
                        <Select
                            value={localSettings.fontFamily}
                            onValueChange={(value) => handleChange("fontFamily", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Font" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Inter">Inter (Default)</SelectItem>
                                <SelectItem value="Roboto Mono">Roboto Mono</SelectItem>
                                <SelectItem value="Orbitron">Orbitron (Sci-Fi)</SelectItem>
                                <SelectItem value="Cinzel">Cinzel (Fantasy)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <Label>Font Size</Label>
                        <Select
                            value={localSettings.fontSize}
                            onValueChange={(value) => handleChange("fontSize", value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sm">Small</SelectItem>
                                <SelectItem value="md">Medium</SelectItem>
                                <SelectItem value="lg">Large</SelectItem>
                                <SelectItem value="xl">Extra Large</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Label>Glow Intensity</Label>
                        <span className="text-sm text-muted-foreground">
                            {localSettings.glowIntensity}%
                        </span>
                    </div>
                    <Input
                        type="range"
                        min="10"
                        max="100"
                        step="10"
                        className="cursor-pointer"
                        value={localSettings.glowIntensity}
                        onChange={(e) => handleChange("glowIntensity", parseInt(e.target.value))}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
