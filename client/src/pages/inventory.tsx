import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useSocialSocket } from '@/hooks/use-social-socket'; // Added import
import { Loader2, Package, Shield, ExternalLink, Check, Sparkles, Crown } from 'lucide-react'; // Added Check, Sparkles, Crown
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import StreamCoin from '@/components/stream-coin';
import { AnimatedAdFreeIcon } from '@/components/animated-ad-free-icon';
import { Switch } from '@/components/ui/switch';
import { THEME_MAPPING, THEME_PREVIEWS } from '@/lib/theme-data'; // Added
import { PreloadedImage } from '@/components/preloaded-image';
import { useTheme } from '@/components/theme-provider'; // Added useTheme
import { useToast } from '@/hooks/use-toast'; // Added useToast
// UIBadge import removed as it is not used or incorrect

export default function InventoryPage() {
    const { user } = useAuth();
    const { setTheme } = useTheme();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: products = [] } = useQuery<any[]>({
        queryKey: ['/api/store/products'],
    });

    const { data: userBadges = [], isLoading } = useQuery<any[]>({
        queryKey: [`/api/users/${user?.id}/badges`],
        enabled: !!user,
    });

    // Real-time updates
    const { onInventoryUpdate } = useSocialSocket();

    useEffect(() => {
        onInventoryUpdate(() => {
            console.log("📦 Real-time inventory update received!");
            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/badges`] });
            toast({
                title: "New Item Received!",
                description: "Your inventory has been updated with a new gift.",
            });
        });
    }, [onInventoryUpdate, queryClient, user?.id, toast]);

    const equipMutation = useMutation({
        mutationFn: async (badgeId: string) => {
            const res = await fetch("/api/badges/equip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ badgeId }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to equip badge");
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/badges`] });
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/profile`] });
            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/public-profile`] });
            if (data.action === "unequipped") {
                toast({ title: "Badge Unequipped", description: "Removed from profile." });
            } else {
                toast({ title: "Badge Equipped", description: "Added to profile!" });
            }
        },
        onError: (error: Error) => {
            toast({ title: "Action Failed", description: error.message, variant: "destructive" });
        }
    });

    const handleApplyTheme = (themeName: string) => {
        const themeId = THEME_MAPPING[themeName];
        if (themeId) {
            setTheme(themeId as any);
            toast({ title: "Theme Applied", description: `${themeName} is now active.` });
        } else {
            toast({ title: "Error", description: "Theme not found configuration", variant: "destructive" });
        }
    };


    // Filter to show only items that are also in the store (purchasable items)
    // This effectively filters out achievement-only badges like "New Comer" if they aren't sold in store.
    const inventoryItems = userBadges.filter((ub: any) =>
        products.some((p: any) => p.id === ub.badgeId)
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                            My Inventory
                        </h1>
                        <p className="text-gray-400 mt-2">Manage your purchased items and collectibles.</p>
                    </div>

                    <Link href="/store">
                        <Button className="bg-primary hover:bg-primary/90">
                            Visit Store
                        </Button>
                    </Link>
                </div>

                {/* Content */}
                {inventoryItems.length === 0 ? (
                    <Card className="bg-zinc-900/50 border-zinc-800 py-16 text-center">
                        <CardContent>
                            <div className="bg-zinc-800/50 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
                                <Package className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Your inventory is empty</h2>
                            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                                You haven't purchased any items yet. Visit the store to find unique themes and badges!
                            </p>
                            <Link href="/store">
                                <Button size="lg" className="gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    Browse Store
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-16">
                        {[
                            { id: 'subscription', label: 'Subscriptions', items: inventoryItems.filter((ub: any) => ub.badge.category === 'subscription' || ub.badge.name.includes('Ad-Free')) },
                            { id: 'skin', label: 'Skins', items: inventoryItems.filter((ub: any) => ub.badge.category === 'skin' || ub.badge.name.includes('Skin')) },
                            { id: 'theme', label: 'Themes', items: inventoryItems.filter((ub: any) => !ub.badge.name.includes('Skin') && (ub.badge.category === 'theme' || ub.badge.name.includes('Theme'))) },
                            { id: 'feature', label: 'Features', items: inventoryItems.filter((ub: any) => ub.badge.category === 'feature') },
                            { id: 'badges', label: 'Badges', items: inventoryItems.filter((ub: any) => (!ub.badge.category || ub.badge.category === 'general' || ub.badge.category === 'achievement' || ub.badge.category === '') && !ub.badge.name.includes('Skin') && !ub.badge.name.includes('Theme') && ub.badge.category !== 'subscription') }
                        ].map(section => (
                            section.items.length > 0 && (
                                <div key={section.id}>
                                    <div className="flex items-center gap-4 mb-8">
                                        <h2 className="text-2xl font-bold">{section.label}</h2>
                                        <div className="h-px bg-white/10 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {section.items.map((ub: any) => {
                                            const item = ub.badge; // The actual badge/item details
                                            const isSkin = item.name.includes("Skin") || item.category === 'skin';
                                            // Use DB category/name for detection, fallback to mapping if needed
                                            const isTheme = (item.category === 'theme' || item.name.includes('Theme')) && !isSkin;
                                            const isSubscription = item.category === 'subscription' || item.name.includes('Ad-Free');
                                            const isEquipped = ub.equipped; // Assuming backend returns this

                                            return (
                                                <div
                                                    key={ub.id}
                                                    className="group relative bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden hover:bg-zinc-900/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
                                                >
                                                    {/* Item Image */}
                                                    {isTheme ? (
                                                        <div className="p-3 pb-0">
                                                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:shadow-primary/20 transition-all duration-500">
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                                                                <PreloadedImage
                                                                    src={item.imageUrl || THEME_PREVIEWS[THEME_MAPPING[item.name || '']]}
                                                                    alt={item.name}
                                                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                                                    containerClassName="w-full h-full"
                                                                />
                                                                <div className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded text-white/90 border border-white/10">
                                                                    THEME
                                                                </div>
                                                            </div>
                                                        </div>

                                                    ) : isSkin ? (
                                                        <div className="p-3 pb-0">
                                                            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 group-hover:shadow-primary/20 transition-all duration-500">
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 opacity-80 group-hover:opacity-60 transition-opacity" />
                                                                <PreloadedImage
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-700"
                                                                    containerClassName="w-full h-full"
                                                                />
                                                                <div className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded text-white/90 border border-white/10">
                                                                    SKIN
                                                                </div>
                                                            </div>
                                                        </div>

                                                    ) : isSubscription ? (
                                                        <div className="relative pt-8 pb-6 flex items-center justify-center bg-gradient-to-b from-yellow-500/5 to-transparent">
                                                            <div className="relative w-24 h-24">
                                                                <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                                                                <div className={`w-full h-full relative z-10 ${item.name.includes('Yearly') ? 'text-amber-500' : 'text-red-500'}`}>
                                                                    <AnimatedAdFreeIcon className="w-full h-full" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="relative pt-8 pb-6 flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent">
                                                            <div className="relative w-24 h-24">
                                                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                                <PreloadedImage
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    className="w-full h-full object-contain relative z-10 drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                                                                    containerClassName="w-full h-full"
                                                                />
                                                            </div>
                                                            {isEquipped && (
                                                                <div className="absolute top-4 right-4 bg-primary/20 text-primary text-xs px-2 py-1 rounded-full border border-primary/50 flex items-center gap-1">
                                                                    <Check className="w-3 h-3" /> Equipped
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="p-5 flex-1 flex flex-col items-center text-center">
                                                        <h3 className="text-lg font-bold mb-1 truncate w-full" title={item.name}>{item.name}</h3>
                                                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-4">
                                                            {item.description}
                                                        </p>

                                                        <div className="mt-auto space-y-3">
                                                            {isSubscription ? (
                                                                <div className="flex flex-col gap-3 w-full">
                                                                    {user?.adFreeUntil && new Date(user.adFreeUntil) > new Date() ? (
                                                                        <Button
                                                                            className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white border-0"
                                                                            disabled
                                                                        >
                                                                            {Math.ceil((new Date(user.adFreeUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days Remaining
                                                                        </Button>
                                                                    ) : (
                                                                        <Button className="w-full" variant="secondary" disabled>
                                                                            Expired
                                                                        </Button>
                                                                    )}
                                                                    <div className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded-lg">
                                                                        <span className="text-sm font-medium text-muted-foreground">Auto-Renew</span>
                                                                        <Switch
                                                                            checked={user?.subscriptionAutoRenew}
                                                                            onCheckedChange={(checked) => {
                                                                                fetch('/api/subscription/autorenew', {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    credentials: 'include',
                                                                                    body: JSON.stringify({ autoRenew: checked }),
                                                                                }).then(() => {
                                                                                    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                                                                                });
                                                                            }}
                                                                            className="scale-90"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : isTheme ? (
                                                                <Button
                                                                    className="w-full gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20"
                                                                    variant="outline"
                                                                    onClick={() => handleApplyTheme(item.name)}
                                                                >
                                                                    <Sparkles className="w-4 h-4" />
                                                                    Apply Theme
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    className={`w-full gap-2`}
                                                                    variant={isEquipped ? "secondary" : "default"}
                                                                    disabled={equipMutation.isPending}
                                                                    onClick={() => equipMutation.mutate(item.id)}
                                                                >
                                                                    {isEquipped ? (
                                                                        <>
                                                                            <Check className="w-4 h-4 text-green-500" /> Equipped (Tap to Remove)
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Shield className="w-4 h-4" /> Equip Badge
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}

                                                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/5 pt-3">
                                                                <span className="flex items-center gap-1">
                                                                    <Package className="h-3 w-3" />
                                                                    {isSubscription ? 'Subscription' : isTheme ? 'Theme' : 'Badge'}
                                                                </span>
                                                                <span>
                                                                    {new Date(ub.earnedAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
