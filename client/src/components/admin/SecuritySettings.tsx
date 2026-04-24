import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";

export function SecuritySettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch the current settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ["/api/admin/settings"],
        queryFn: async () => {
            const res = await fetch("/api/admin/settings", {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error("Failed to fetch settings");
            return res.json();
        },
    });

    // Mutation to update the settings
    const updateSettingsMutation = useMutation({
        mutationFn: async (newSettings: { devToolsProtection: boolean }) => {
            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { 
                    ...getAuthHeaders(),
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify(newSettings),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update settings");
            }
            return res.json();
        },
        onSuccess: (updatedSettings) => {
            queryClient.setQueryData(["/api/admin/settings"], updatedSettings);
            // Also invalidate the public config so the frontend picks it up
            queryClient.invalidateQueries({ queryKey: ["/api/config/settings"] });
            toast({
                title: "Settings updated",
                description: "Security settings have been saved successfully.",
            });
        },
        onError: (error: Error) => {
            toast({
                variant: "destructive",
                title: "Update failed",
                description: error.message,
            });
        },
    });

    if (isLoading) {
        return (
            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isEnabled = settings?.devToolsProtection ?? true;

    return (
        <Card className="bg-zinc-900 border-zinc-800 shadow-md">
            <CardHeader className="border-b border-zinc-800/50 pb-4">
                <div className="flex items-center gap-2">
                    {isEnabled ? (
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                    ) : (
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                    )}
                    <CardTitle className="text-zinc-100">Security Settings</CardTitle>
                </div>
                <CardDescription className="text-zinc-400">
                    Manage site-wide security and anti-tampering protections.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="devtools-protection" className="text-base font-medium text-zinc-200">
                            Developer Tools Protection
                        </Label>
                        <p className="text-sm text-zinc-500 max-w-md">
                            When enabled, it blocks users from opening Developer Tools (F12) by pausing script execution and showing a full-screen warning overlay.
                        </p>
                    </div>
                    <Switch
                        id="devtools-protection"
                        checked={isEnabled}
                        disabled={updateSettingsMutation.isPending}
                        onCheckedChange={(checked) => {
                            updateSettingsMutation.mutate({ devToolsProtection: checked });
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
