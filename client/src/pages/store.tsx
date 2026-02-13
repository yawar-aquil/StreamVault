import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ShoppingBag, Gift, Crown, Heart, Star, Sparkles, AlertCircle, Check, ArrowLeft, Search, Zap, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import type { Badge } from '@shared/schema';
import StreamCoin from '@/components/stream-coin';
import { AnimatedAdFreeIcon } from '@/components/animated-ad-free-icon';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export default function StorePage() {
    const { user, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Parse user badges safely
    const userBadges = user?.badges ? (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges) : [];

    const [selectedProduct, setSelectedProduct] = useState<Badge | null>(null);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showGiftModal, setShowGiftModal] = useState(false);

    // Multi-user gifting state
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [searchRecipient, setSearchRecipient] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [openCombobox, setOpenCombobox] = useState(false);

    const [giftMessage, setGiftMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'theme' | 'feature'>('all');
    const [email, setEmail] = useState('');

    // Pre-fill email when user data is loaded
    useState(() => {
        if (user?.email) setEmail(user.email);
    });

    // Handle URL query params for initial category
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        if (category && ['all', 'general', 'theme', 'feature'].includes(category)) {
            setActiveCategory(category as any);
        }
    }, [window.location.search]);

    // Fetch store products
    const { data: products = [], isLoading } = useQuery<Badge[]>({
        queryKey: ['/api/store/products'],
    });

    // Purchase mutation
    const [purchasedItem, setPurchasedItem] = useState<any | null>(null);

    const purchaseMutation = useMutation({
        mutationFn: async ({ badgeId, email }: { badgeId: string, email: string }) => {
            const res = await fetch('/api/store/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ badgeId, email }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Return data even on error to handle 402 with details
                if (res.status === 402) {
                    const error = new Error(data.error);
                    (error as any).required = data.required;
                    (error as any).currentBalance = data.currentBalance;
                    (error as any).status = 402;
                    throw error;
                }
                throw new Error(data.error || 'Purchase failed');
            }
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] }); // Update coins

            // Find the item details
            const item = products.find(p => p.id === variables.badgeId);
            // variables is object { badgeId, email }
            const itemFound = products.find(p => p.id === variables.badgeId);
            setPurchasedItem(itemFound); // Set state for Success Modal

            setShowPurchaseModal(false);
            queryClient.invalidateQueries({ queryKey: ['/api/store/products'] });
        },
        onError: (error: any) => {
            if (error.status === 402) {
                toast({
                    title: 'Insufficient Coins',
                    description: `You need ${error.required - error.currentBalance} more coins.`,
                    variant: 'destructive',
                    action: (
                        <Link href="/wallet">
                            <Button size="sm" variant="outline" className="bg-white/10 border-0 hover:bg-white/20 text-white">
                                Buy Coins
                            </Button>
                        </Link>
                    )
                });
            } else {
                toast({
                    title: 'Purchase Failed',
                    description: error.message,
                    variant: 'destructive',
                });
            }
        },
    });

    // ... (keep gift mutation same) ...
    // Gift mutation (Bulk)
    const giftMutation = useMutation({
        mutationFn: async ({ badgeId, receiverUsernames, message }: { badgeId: string; receiverUsernames: string[]; message?: string }) => {
            const res = await fetch('/api/store/gift-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ badgeId, receiverUsernames, message }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gift failed');
            }
            return res.json();
        },
        onSuccess: (data) => {
            if (data.results && data.results.some((r: any) => r.status === 'failed')) {
                const failed = data.results.filter((r: any) => r.status === 'failed').length;
                const success = data.results.filter((r: any) => r.status === 'success').length;
                toast({
                    title: 'Gift sending complete',
                    description: `Sent ${success} gifts. ${failed} failed.`,
                    variant: failed > 0 ? "destructive" : "default"
                });
            } else {
                toast({
                    title: '🎁 Gifts Sent!',
                    description: `Successfully sent gift to ${data.results?.length || 'all'} users!`,
                });
            }

            setShowGiftModal(false);
            setSelectedUsers([]);
            setSearchRecipient('');
            setGiftMessage('');
            queryClient.invalidateQueries({ queryKey: ['/api/store/products'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user'] }); // Deducts coins
        },
        onError: (error: Error) => {
            toast({
                title: 'Gift Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Debounced Search for recipients
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchRecipient.length >= 2) {
                try {
                    const res = await fetch(`/api/store/users/search?query=${encodeURIComponent(searchRecipient)}`);
                    if (res.ok) {
                        const data = await res.json();
                        // Filter out self and already selected
                        const filtered = data.filter((u: any) =>
                            u.id !== user?.id &&
                            !selectedUsers.find(sel => sel.id === u.id)
                        );
                        setSearchResults(filtered);
                    }
                } catch (e) {
                    console.error("Search error", e);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchRecipient, user?.id, selectedUsers]);

    const handlePurchase = () => {
        if (!isAuthenticated) {
            toast({
                title: 'Login Required',
                description: 'Please login to make a purchase',
                variant: 'destructive',
            });
            return;
        }
        if (selectedProduct) {
            purchaseMutation.mutate({ badgeId: selectedProduct.id, email });
        }
    };

    const handleGift = () => {
        if (!isAuthenticated) {
            toast({
                title: 'Login Required',
                description: 'Please login to send a gift',
                variant: 'destructive',
            });
            return;
        }
        if (selectedProduct && selectedUsers.length > 0) {
            giftMutation.mutate({
                badgeId: selectedProduct.id,
                receiverUsernames: selectedUsers.map(u => u.username),
                message: giftMessage || undefined,
            });
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCategory = false;
        if (activeCategory === 'all') {
            matchesCategory = true;
        } else if (activeCategory === 'theme') {
            // Include both 'theme' and 'skin' categories for the "Themes" tab
            matchesCategory = p.category === 'theme' || p.category === 'skin';
        } else if (activeCategory === 'general') {
            // Include 'general', 'achievement', and items with no category in the "Badges" tab
            matchesCategory = !p.category || p.category === 'general' || p.category === 'achievement' || p.category === '';
        } else {
            matchesCategory = p.category === activeCategory;
        }

        return matchesSearch && matchesCategory;
    });

    const formatPrice = (price: number | null) => {
        if (!price || price === 0) return 'FREE';
        return `${price}`;
    };


    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Hero Section */}
            <div className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-background/80 to-background z-0" />
                <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-70 z-0" />

                <div className="container mx-auto px-4 relative z-10 text-center">


                    <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40">
                        StreamVault Store
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        Level up your profile with exclusive badges, limited editions, and premium digital assets.
                        Stand out from the crowd.
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-xl mx-auto relative group mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-500" />
                        <div className="relative bg-background/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl flex items-center p-1.5 ring-1 ring-white/5 focus-within:ring-primary/50 transition-all">
                            <Search className="h-5 w-5 text-muted-foreground ml-3 mr-2" />
                            <Input
                                placeholder="Search for items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 text-base placeholder:text-muted-foreground/50"
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex justify-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
                        {['all', 'general', 'theme', 'feature'].map((cat) => (
                            <Button
                                key={cat}
                                variant={activeCategory === cat ? "default" : "outline"}
                                onClick={() => setActiveCategory(cat as any)}
                                className={`rounded-full px-6 capitalize ${activeCategory === cat
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 border-primary"
                                    : "bg-background/50 backdrop-blur border-white/10 hover:bg-white/5 hover:border-white/20"}`}
                            >
                                {cat === 'general' ? 'Badges' : cat === 'theme' ? 'Themes' : cat === 'feature' ? 'Features' : 'All'}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pb-24">
                {/* No Refund Notice - Subtle */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                        <AlertCircle className="h-4 w-4" />
                        <span>All purchases are final.</span>
                        <Link href="/refund" className="underline hover:text-primary">View Refund Policy</Link>
                    </div>
                </div>

                {/* Subscriptions Section */}
                <div className="mb-16">
                    <div className="flex items-center gap-4 mb-8">
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-2">
                            <Crown className="w-6 h-6 text-yellow-500" />
                            Premium Subscriptions
                        </h2>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Monthly Ad-Free */}
                        <div className="relative group bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-primary/10 rounded-2xl">
                                        <AnimatedAdFreeIcon className="w-8 h-8 text-primary" />
                                    </div>
                                    <UIBadge className="bg-primary/20 text-primary border-0">POPULAR</UIBadge>
                                </div>

                                <h3 className="text-2xl font-bold mb-2">Ad-Free Monthly</h3>
                                <p className="text-muted-foreground mb-6 h-12">Remove all ads across StreamVault.in for one month.</p>

                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-bold text-white">500</span>
                                    <StreamCoin className="w-6 h-6" />
                                    <span className="text-muted-foreground text-sm">/ month</span>
                                </div>

                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all"
                                    onClick={() => {
                                        // Direct purchase or open modal with specific content
                                        // For now, let's use a specialized purchase handler
                                        toast({ title: "Coming Soon", description: "Subscription system is being finalized." });
                                    }}
                                >
                                    Subscribe Now
                                </Button>
                            </div>
                        </div>

                        {/* Yearly Ad-Free */}
                        <div className="relative group bg-gradient-to-b from-amber-900/20 to-slate-950 border border-amber-500/20 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-amber-500/10 rounded-2xl">
                                        <Crown className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <UIBadge className="bg-amber-500/20 text-amber-500 border-0">BEST VALUE</UIBadge>
                                </div>

                                <h3 className="text-2xl font-bold mb-2">Ad-Free Yearly</h3>
                                <p className="text-muted-foreground mb-6 h-12">Uninterrupted streaming for a full year. Save 17%.</p>

                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl font-bold text-white">5,000</span>
                                    <StreamCoin className="w-6 h-6" />
                                    <span className="text-muted-foreground text-sm">/ year</span>
                                </div>

                                <Button
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all"
                                    onClick={() => {
                                        toast({ title: "Coming Soon", description: "Subscription system is being finalized." });
                                    }}
                                >
                                    Subscribe Yearly
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-[400px] rounded-3xl bg-muted/20 animate-pulse" />
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-muted/5 rounded-3xl border border-border/50">
                        <Package className="h-16 w-16 mx-auto text-muted-foreground/40 mb-6" />
                        <h2 className="text-2xl font-bold mb-2">No items found</h2>
                        <p className="text-muted-foreground">Try adjusting your search terms or check back later.</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Sections Logic */}
                        {[
                            { id: 'skin', label: 'Skins', items: filteredProducts.filter(p => p.category === 'skin' || p.name.includes('Skin')) },
                            { id: 'theme', label: 'Themes', items: filteredProducts.filter(p => !p.name.includes('Skin') && (p.category === 'theme' || p.name.includes('Theme'))) },
                            { id: 'feature', label: 'Features', items: filteredProducts.filter(p => p.category === 'feature') },
                            { id: 'badges', label: 'Badges', items: filteredProducts.filter(p => (!p.category || p.category === 'general' || p.category === 'achievement' || p.category === '') && !p.name.includes('Skin') && !p.name.includes('Theme')) }
                        ].map(section => (
                            section.items.length > 0 && (
                                <div key={section.id}>
                                    <div className="flex items-center gap-4 mb-8">
                                        <h2 className="text-2xl font-bold">{section.label}</h2>
                                        <div className="h-px bg-white/10 flex-1" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                        {section.items.map((product) => (
                                            <div
                                                key={product.id}
                                                className="group relative bg-card/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden hover:bg-card/60 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
                                            >
                                                {/* card gradients */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                {/* Badges */}
                                                <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
                                                    {product.limited ? (
                                                        <UIBadge variant="destructive" className="bg-red-500/90 hover:bg-red-500/90 text-white border-0 shadow-lg shadow-red-500/20">
                                                            LIMITED
                                                        </UIBadge>
                                                    ) : (
                                                        <div />
                                                    )}

                                                    {product.isSpecial ? (
                                                        <UIBadge className="bg-gradient-to-r from-amber-400 to-orange-500 text-black border-0 font-bold shadow-lg shadow-amber-500/20">
                                                            <Crown className="h-3 w-3 mr-1" />
                                                            VIP
                                                        </UIBadge>
                                                    ) : null}
                                                </div>

                                                {/* Image Area - Aspect Ratio Handling */}
                                                {(product.category === 'skin' || product.name.includes('Skin')) ? (
                                                    <div className="p-3 pb-0">
                                                        <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/50 group-hover:shadow-primary/20 transition-all duration-500">
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 opacity-80 group-hover:opacity-60 transition-opacity" />
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.name}
                                                                className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-700"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = product.imageUrl;
                                                                }}
                                                            />
                                                            {/* Preview Badge */}
                                                            <div className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded text-white/90 border border-white/10">
                                                                SKIN
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (product.category === 'theme' || product.name.includes('Theme')) ? (
                                                    <div className="p-3 pb-0">
                                                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:shadow-primary/20 transition-all duration-500">
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = product.imageUrl;
                                                                }}
                                                            />
                                                            {/* Preview Badge */}
                                                            <div className="absolute top-2 right-2 z-20 bg-black/50 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded text-white/90 border border-white/10">
                                                                THEME
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative pt-12 pb-6 flex items-center justify-center">
                                                        <div className="relative w-32 h-32 md:w-40 md:h-40">
                                                            {/* Glow effect */}
                                                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-500 scale-75 group-hover:scale-100" />
                                                            <div className="relative w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 delay-75">
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-contain drop-shadow-2xl"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>';
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Content */}
                                                <div className="p-6 relative">
                                                    <div className="mb-4 text-center">
                                                        <h3 className="text-xl font-bold truncate mb-1 text-foreground/90 group-hover:text-primary transition-colors">
                                                            {product.name}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                                                            {product.description}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-end justify-between mb-6">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                                                            <div className="flex items-center gap-2 text-2xl font-bold text-white tracking-tight">
                                                                {product.price === 0 ? 'FREE' : (
                                                                    <>
                                                                        <StreamCoin size="md" />
                                                                        {product.price}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {product.limited && product.stock !== null && (
                                                            <div className="text-right">
                                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stock</p>
                                                                <p className={`text-sm font-bold ${product.stock === 0 ? 'text-destructive' : product.stock < 10 ? 'text-red-400' : 'text-green-400'}`}>
                                                                    {product.stock === 0 ? "Out of Stock" : `${product.stock} left`}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="grid grid-cols-[1fr,auto] gap-2">
                                                        <Button
                                                            className="w-full bg-white/5 hover:bg-primary hover:text-primary-foreground border-white/5 hover:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={() => {
                                                                setSelectedProduct(product);
                                                                setShowPurchaseModal(true);
                                                            }}
                                                            disabled={(!!product.limited && product.stock === 0) || userBadges.some((b: any) => (b.badgeId === product.id || b.id === product.id))}
                                                        >
                                                            <ShoppingBag className="h-4 w-4 mr-2" />
                                                            {userBadges.some((b: any) => (b.badgeId === product.id || b.id === product.id))
                                                                ? "Owned"
                                                                : (!!product.limited && product.stock === 0)
                                                                    ? "Out of Stock"
                                                                    : "Purchase"}
                                                        </Button>

                                                        {product.giftable && (
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="border-white/10 hover:border-pink-500 hover:text-pink-500 hover:bg-pink-500/10 transition-colors"
                                                                onClick={() => {
                                                                    setSelectedProduct(product);
                                                                    setShowGiftModal(true);
                                                                }}
                                                                disabled={!!product.limited && product.stock === 0}
                                                            >
                                                                <Gift className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* Purchase Modal */}
            <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
                <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Zap className="h-5 w-5 text-primary" />
                            Confirm Purchase
                        </DialogTitle>
                        <DialogDescription>
                            Add this exclusive item to your collection.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="py-6">
                            {/* Theme Preview Logic */}
                            {/* Theme Preview Logic */}
                            {selectedProduct.category === 'theme' && !selectedProduct.name.includes('Skin') && (
                                <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative aspect-video group">
                                    <img
                                        src={selectedProduct.imageUrl}
                                        alt="Theme Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white/90 font-medium">
                                        Preview
                                    </div>
                                </div>
                            )}

                            {/* Skin Preview Logic */}
                            {(selectedProduct.category === 'skin' || selectedProduct.name.includes('Skin')) && (
                                <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative aspect-[2/3] w-2/3 mx-auto group bg-black/50">
                                    <img
                                        src={selectedProduct.imageUrl}
                                        alt="Skin Preview"
                                        className="w-full h-full object-contain"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                                    <div className="absolute bottom-2 left-2 z-20 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs text-white/90 font-medium">
                                        Preview
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl border border-white/5">
                                <div className={`rounded-xl bg-background flex items-center justify-center p-2 border border-white/10 ${(selectedProduct.category === 'skin' || selectedProduct.name.includes('Skin'))
                                    ? "w-12 h-16"
                                    : (selectedProduct.category === 'theme' || selectedProduct.name.includes('Theme'))
                                        ? "w-28 h-16"
                                        : "w-16 h-16"
                                    }`}>
                                    <img
                                        src={selectedProduct.imageUrl}
                                        alt={selectedProduct.name}
                                        className={`w-full h-full ${(selectedProduct.category === 'skin' || selectedProduct.name.includes('Skin') || selectedProduct.category === 'theme' || selectedProduct.name.includes('Theme'))
                                            ? "object-cover rounded-sm"
                                            : "object-contain"
                                            }`}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold truncate">{selectedProduct.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <UIBadge variant="secondary" className="bg-primary/10 text-primary border-0">
                                            Digital Item
                                        </UIBadge>
                                    </div>
                                </div>
                                <div className="text-xl font-bold flex items-center gap-2">
                                    {selectedProduct.price === 0 ? 'FREE' : (
                                        <>
                                            <StreamCoin size="md" />
                                            {selectedProduct.price}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <Label htmlFor="email">Receipt Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-muted/30"
                                />
                                <p className="text-xs text-muted-foreground">We'll send your receipt here.</p>
                            </div>

                            <div className="mt-6 flex items-start gap-3 p-3 text-xs text-muted-foreground bg-muted/20 rounded-lg">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <p>
                                    By confirming, you agree that this purchase is for a virtual item and is non-refundable
                                    once delivered.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setShowPurchaseModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePurchase}
                            disabled={purchaseMutation.isPending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                        >
                            {purchaseMutation.isPending ? (
                                'Processing...'
                            ) : (
                                <>
                                    Pay {selectedProduct && formatPrice(selectedProduct.price)}
                                    <Check className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Gift Modal */}
            <Dialog open={showGiftModal} onOpenChange={setShowGiftModal}>
                <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Gift className="h-5 w-5 text-pink-500" />
                            Send a Gift
                        </DialogTitle>
                        <DialogDescription>
                            Surprise a friend with this digital collectible.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-start gap-4 p-4 bg-pink-500/5 rounded-2xl border border-pink-500/10">
                                {/* Conditional Card Sizing */}
                                <div className={cn(
                                    "flex-shrink-0 rounded-lg bg-background flex items-center justify-center p-1.5 border border-pink-500/10 overflow-hidden",
                                    (selectedProduct.category === 'theme' || selectedProduct.name.includes('Theme')) ? "w-28 aspect-video" :
                                        (selectedProduct.category === 'skin' || selectedProduct.name.includes('Skin')) ? "w-[90px] aspect-[2/3]" :
                                            "w-12 h-12"
                                )}>
                                    <img
                                        src={selectedProduct.imageUrl}
                                        alt={selectedProduct.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0 self-center">
                                    <h3 className="font-bold text-pink-500 truncate">{selectedProduct.name}</h3>
                                    <p className="text-xs opacity-70">Gift for someone special</p>
                                </div>
                                <div className="font-bold flex items-center gap-1.5 self-center bg-background/50 px-2 py-1 rounded-md border border-white/5">
                                    {formatPrice(selectedProduct.price)}
                                    <StreamCoin className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Recipients</Label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedUsers.map(user => (
                                            <UIBadge key={user.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                                                {user.username}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 hover:bg-transparent hover:text-red-500 rounded-full"
                                                    onClick={() => setSelectedUsers(selectedUsers.filter(u => u.id !== user.id))}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </UIBadge>
                                        ))}
                                    </div>

                                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCombobox}
                                                className="w-full justify-between bg-muted/30 border-white/10"
                                            >
                                                {selectedUsers.length > 0
                                                    ? `Add more users...`
                                                    : "Search users..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0 bg-popover border-border">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Type username..."
                                                    value={searchRecipient}
                                                    onValueChange={setSearchRecipient}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>{searchRecipient.length < 2 ? "Type at least 2 chars..." : "No user found."}</CommandEmpty>
                                                    <CommandGroup>
                                                        {searchResults.map((user) => (
                                                            <CommandItem
                                                                key={user.id}
                                                                value={user.username}
                                                                onSelect={() => {
                                                                    setSelectedUsers([...selectedUsers, user]);
                                                                    setSearchRecipient("");
                                                                    setOpenCombobox(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4 opacity-0",
                                                                        // Check logic if needed but we remove selected from list so always unchecked
                                                                    )}
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 rounded-full bg-slate-700 overflow-hidden">
                                                                        {user.avatarUrl && <img src={user.avatarUrl} className="w-full h-full object-cover" />}
                                                                    </div>
                                                                    <span>{user.username}</span>
                                                                    {user.badges && user.badges.length > 0 && (
                                                                        <div className="flex items-center gap-0.5 ml-1">
                                                                            {user.badges.filter((b: any) => b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'theme').sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime()).map((badge: any) => (
                                                                                <img
                                                                                    key={badge.id}
                                                                                    src={badge.imageUrl}
                                                                                    alt={badge.name}
                                                                                    title={badge.name}
                                                                                    className="w-3 h-3 object-contain"
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                        Total Cost: <span className="text-white font-bold flex items-center gap-1">{selectedProduct.price * (selectedUsers.length || 1)} <StreamCoin className="w-3 h-3" /></span> Coins ({(selectedUsers.length || 0)} recipients)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">Personal Message <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Hope you like this!"
                                        value={giftMessage}
                                        onChange={(e) => setGiftMessage(e.target.value)}
                                        className="bg-muted/30 resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => {
                            setShowGiftModal(false);
                            setSelectedUsers([]);
                            setSearchRecipient('');
                            setGiftMessage('');
                        }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGift}
                            disabled={giftMutation.isPending || selectedUsers.length === 0}
                            className="bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-600/20"
                        >
                            {giftMutation.isPending ? (
                                'Sending...'
                            ) : (
                                <>
                                    Send Gift
                                    <Heart className="h-4 w-4 ml-2 fill-current" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!purchasedItem} onOpenChange={(open) => !open && setPurchasedItem(null)}>
                <DialogContent className="sm:max-w-md border-0 bg-zinc-950 p-0 overflow-hidden shadow-2xl shadow-purple-500/10">
                    <div className="relative pt-12 pb-8 px-6 text-center bg-gradient-to-b from-purple-900/20 to-zinc-950">
                        {/* Glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-primary/20 blur-3xl rounded-full opacity-30 pointer-events-none" />

                        <div className="relative mx-auto w-40 h-40 mb-8">
                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 to-purple-500/10 rounded-2xl blur-xl animate-pulse" />
                            <div className="relative w-full h-full bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-white/10 flex items-center justify-center p-6 shadow-2xl">
                                <img
                                    src={purchasedItem?.imageUrl}
                                    alt={purchasedItem?.name}
                                    className="w-full h-full object-contain drop-shadow-xl"
                                />
                            </div>
                            {/* Centered Checkmark Badge */}
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2.5 rounded-full border-[6px] border-zinc-950 shadow-xl flex items-center justify-center transform hover:scale-110 transition-transform">
                                <Check className="w-6 h-6 stroke-[3]" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Purchase Successful!</h2>
                        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mb-4 rounded-full" />
                        <p className="text-zinc-400 mb-8 max-w-xs mx-auto leading-relaxed">
                            You are now the proud owner of <br />
                            <span className="text-yellow-400 font-bold text-lg inline-block mt-1">{purchasedItem?.name}</span>
                        </p>

                        <div className="grid gap-3 relative z-10">
                            <Link href="/inventory">
                                <Button
                                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold h-12 shadow-lg shadow-orange-500/20 border-0 text-base"
                                >
                                    <Package className="mr-2 h-5 w-5" />
                                    View in Inventory
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                className="w-full text-zinc-500 hover:text-white hover:bg-white/5 h-12"
                                onClick={() => setPurchasedItem(null)}
                            >
                                Keep Shopping
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
