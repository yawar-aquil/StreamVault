import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Trophy, Crown, Star, Twitter, Instagram, Youtube, Heart, Calendar, UserPlus, UserMinus, X, Check, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { SiTiktok, SiDiscord } from 'react-icons/si';
import { THEME_MAPPING, THEME_PREVIEWS } from '@/lib/theme-data';
import { cn } from '@/lib/utils';
import { HeartRain } from '@/components/heart-rain';
import { GalaxyAnimation } from '@/components/galaxy-animation';
import { AnimeMotion } from '@/components/anime-motion';
import { AnimatedAdFreeIcon } from '@/components/animated-ad-free-icon';
import { icons } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/seo';

interface UserProfile {
    id: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    level: number;
    xp: number;
    currentStreak: number;
    longestStreak: number;
    socialLinks?: {
        twitter?: string;
        instagram?: string;
        youtube?: string;
        tiktok?: string;
        discord?: string;
    };
    badges: any[];
    equippedBadges: any[];
    createdAt: string;
    isFriend: boolean;
    friendRequestStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
    friendRequestId?: string;
    favorites?: {
        shows: { id: string, title: string, posterUrl: string, slug: string }[];
        movies: { id: string, title: string, posterUrl: string, slug: string }[];
        anime: { id: string, title: string, posterUrl: string, slug: string }[];
    };
}

export default function PublicProfile() {
    const [showFullAvatar, setShowFullAvatar] = useState(false);
    const [match, params] = useRoute("/profile/:username");
    const username = params?.username;
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: user, isLoading, error } = useQuery<UserProfile>({
        queryKey: [`/api/users/profile/${username}`],
        enabled: !!username,
    });

    // Friend Actions Mutations
    const sendRequestMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", "/api/friends/request", { toUserId: user?.id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${username}`] });
            toast({ title: "Friend Request Sent", description: `Request sent to ${user?.username}` });
        },
        onError: (error: any) => {
            toast({ title: "Failed to send request", description: error.message, variant: "destructive" });
        }
    });

    const cancelRequestMutation = useMutation({
        mutationFn: async () => {
            if (!user?.friendRequestId) throw new Error("No request ID found");
            await apiRequest("DELETE", `/api/friends/request/${user.friendRequestId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${username}`] });
            toast({ title: "Request Cancelled" });
        },
        onError: (error: any) => {
            toast({ title: "Failed to cancel request", description: error.message, variant: "destructive" });
        }
    });

    const acceptRequestMutation = useMutation({
        mutationFn: async () => {
            if (!user?.friendRequestId) throw new Error("No request ID found");
            await apiRequest("POST", `/api/friends/accept/${user.friendRequestId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${username}`] });
            toast({ title: "Friend Request Accepted" });
        },
        onError: (error: any) => {
            toast({ title: "Failed to accept request", description: error.message, variant: "destructive" });
        }
    });

    const rejectRequestMutation = useMutation({
        mutationFn: async () => {
            if (!user?.friendRequestId) throw new Error("No request ID found");
            await apiRequest("POST", `/api/friends/decline/${user.friendRequestId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${username}`] });
            toast({ title: "Friend Request Declined" });
        },
        onError: (error: any) => {
            toast({ title: "Failed to decline request", description: error.message, variant: "destructive" });
        }
    });

    const unfriendMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("DELETE", `/api/friends/${user?.id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${username}`] });
            toast({ title: "Unfriended", description: `You are no longer friends with ${user?.username}` });
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <SEO
                    title="Profile Not Found"
                    description={`The user profile for ${username || 'this account'} could not be found on StreamVault.`}
                    canonical={`https://streamvault.live/profile/${encodeURIComponent(username || '')}`}
                    robots="noindex,follow"
                />
                <h1 className="text-2xl font-bold">User not found</h1>
                <p className="text-muted-foreground">The user "{username}" does not exist.</p>
            </div>
        );
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Calculate Skin Class
    // user.badges is likely an array in the public profile response (parsed from JSON string or raw array)
    // but the endpoint returns `badges` as parsed JSON, and `equippedBadges` as the filtered list.
    // Let's rely on equippedBadges from the API if available, or parse badges manually.

    // The endpoint returns `badges` (all owned) and `equippedBadges` (only equipped).
    // Logic for skin class:
    const equippedSkin = user.badges.find((b: any) => (b.category === 'theme' || b.category === 'skin') && b.equipped);
    const skinClass = equippedSkin && THEME_MAPPING[equippedSkin.name] ? `skin-${THEME_MAPPING[equippedSkin.name]}` : '';
    const canonicalUrl = `https://streamvault.live/profile/${encodeURIComponent(user.username)}`;
    const profileDescription = user.bio
        ? `${user.bio.slice(0, 155)}${user.bio.length > 155 ? '...' : ''}`
        : `View ${user.username}'s public StreamVault profile, achievements, favorites, and activity.`;
    const sameAs = Object.values(user.socialLinks || {}).filter((link): link is string => Boolean(link));
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "name": `${user.username} - StreamVault Profile`,
        "description": profileDescription,
        "url": canonicalUrl,
        "mainEntity": {
            "@type": "Person",
            "name": user.username,
            "description": profileDescription,
            "image": user.avatarUrl,
            "url": canonicalUrl,
            "identifier": user.id,
            "sameAs": sameAs.length > 0 ? sameAs : undefined
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 pt-24 pb-20">
            <SEO
                title={`${user.username} - Public Profile`}
                description={profileDescription}
                canonical={canonicalUrl}
                image={user.avatarUrl || undefined}
                type="profile"
                keywords={[user.username, 'public profile', 'StreamVault community']}
                structuredData={structuredData}
                imageAlt={`${user.username} profile picture on StreamVault`}
            />
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Hero Profile Card */}
                <Card className={cn("border-primary/20 bg-card/60 backdrop-blur-sm overflow-hidden relative transition-colors duration-500", skinClass)}>
                    {skinClass === 'skin-valentines' && <HeartRain />}
                    {skinClass === 'skin-galaxy' && <GalaxyAnimation />}
                    {skinClass === 'skin-anime' && <AnimeMotion />}
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/5" />

                    <CardContent className="pt-8 relative z-10">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar Section */}
                            <div className="flex-shrink-0 mx-auto md:mx-0">
                                <div className="relative group cursor-pointer" onClick={() => user.avatarUrl && setShowFullAvatar(true)}>
                                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-primary/20 transition-transform hover:scale-105">
                                        <AvatarImage src={user.avatarUrl || undefined} className={user.avatarUrl?.endsWith('.gif') ? '' : 'object-cover'} />
                                        <AvatarFallback className="text-4xl bg-primary/10">
                                            {user.username ? getInitials(user.username) : <User className="h-12 w-12" />}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>

                            {/* User Stats & Info */}
                            <div className="flex-1 w-full space-y-6">
                                <div className="text-center md:text-left space-y-1">
                                    <div className="flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
                                        <h2 className="text-3xl font-bold tracking-tight">{user.username}</h2>

                                        {/* Equipped Badge Icons */}
                                        <div className="flex items-center gap-1.5">
                                            {user.badges
                                                .filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'feature' && b.category !== 'skin' && !b.name.includes('Skin'))
                                                .sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime())
                                                .map((badge: any) => (
                                                    <div key={badge.id} className="relative group/tooltip" title={badge.name}>
                                                        {(badge.category === 'subscription' || badge.name.includes('Ad-Free')) ? (
                                                            <div className={`w-6 h-6 ${badge.name.includes('Yearly') ? 'text-amber-500' : 'text-red-500'}`}>
                                                                <AnimatedAdFreeIcon className="w-full h-full" />
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={badge.imageUrl}
                                                                alt={badge.name}
                                                                className="w-6 h-6 object-contain drop-shadow-md hover:scale-110 transition-transform"
                                                            />
                                                        )}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                    {user.bio && <p className="text-sm italic pt-2 max-w-lg mx-auto md:mx-0 text-muted-foreground/80">{user.bio}</p>}
                                    <p className="text-xs text-muted-foreground pt-1 flex items-center justify-center md:justify-start gap-1">
                                        <Calendar className="w-3 h-3" /> Joined {format(new Date(user.createdAt), 'MMMM yyyy')}
                                    </p>

                                    {/* Friend Actions */}
                                    {user.id !== (useAuth()?.user?.id) && (
                                        <div className="flex gap-2 justify-center md:justify-start pt-2">
                                            {(() => {
                                                if (user.isFriend) {
                                                    return (
                                                        <Button variant="secondary" size="sm" onClick={() => unfriendMutation.mutate()} disabled={unfriendMutation.isPending}>
                                                            <UserMinus className="w-4 h-4 mr-2" /> Unfriend
                                                        </Button>
                                                    );
                                                }
                                                if (user.friendRequestStatus === 'pending_sent') {
                                                    return (
                                                        <Button variant="outline" size="sm" onClick={() => cancelRequestMutation.mutate()} disabled={cancelRequestMutation.isPending}>
                                                            <X className="w-4 h-4 mr-2" /> Cancel Request
                                                        </Button>
                                                    );
                                                }
                                                if (user.friendRequestStatus === 'pending_received') {
                                                    return (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => acceptRequestMutation.mutate()} disabled={acceptRequestMutation.isPending}>
                                                                <Check className="w-4 h-4 mr-2" /> Accept
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => rejectRequestMutation.mutate()} disabled={rejectRequestMutation.isPending}>
                                                                <X className="w-4 h-4 mr-2" /> Reject
                                                            </Button>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <Button size="sm" onClick={() => sendRequestMutation.mutate()} disabled={sendRequestMutation.isPending}>
                                                        <UserPlus className="w-4 h-4 mr-2" /> Add Friend
                                                    </Button>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* XP Bar */}
                                <div className="space-y-2 max-w-md mx-auto md:mx-0">
                                    <div className="flex justify-between items-end px-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] tracking-wider font-bold px-2 py-0.5">
                                                Level {user.level || 1}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground font-medium">Master Viewer</span>
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {(user.xp || 0) % 1000} <span className="text-primary/60">/</span> 1000 XP
                                        </span>
                                    </div>
                                    <Progress value={((user.xp || 0) % 1000) / 10} className="h-2.5 bg-secondary" />
                                </div>

                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Streak Display - Separate Card */}
                {user.currentStreak > 0 && (
                    <Card className="border-orange-500/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                        <CardContent className="pt-6">
                            <div className={`flex items-center gap-4 p-4 rounded-xl border ${user.currentStreak >= 100 ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20' :
                                user.currentStreak >= 30 ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20' :
                                    user.currentStreak >= 7 ? 'bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20' :
                                        'bg-muted/30 border-border/30'
                                }`}>
                                <motion.div
                                    className={`p-3 rounded-full ${user.currentStreak >= 100 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                                        user.currentStreak >= 30 ? 'bg-gradient-to-br from-red-500 to-orange-500' :
                                            user.currentStreak >= 7 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                                                'bg-muted'
                                        }`}
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <Flame className="w-6 h-6 text-white" />
                                </motion.div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-black ${user.currentStreak >= 100 ? 'text-purple-400' :
                                            user.currentStreak >= 30 ? 'text-red-400' :
                                                user.currentStreak >= 7 ? 'text-orange-400' :
                                                    'text-muted-foreground'
                                            }`}>{user.currentStreak}</span>
                                        <span className="text-sm text-muted-foreground">day streak</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${user.currentStreak >= 365 ? 'bg-yellow-500/20 text-yellow-400' :
                                            user.currentStreak >= 100 ? 'bg-purple-500/20 text-purple-400' :
                                                user.currentStreak >= 30 ? 'bg-red-500/20 text-red-400' :
                                                    user.currentStreak >= 7 ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-muted text-muted-foreground'
                                            }`}>
                                            {user.currentStreak >= 365 ? 'Legendary!' :
                                                user.currentStreak >= 100 ? 'Inferno!' :
                                                    user.currentStreak >= 30 ? 'Blazing!' :
                                                        user.currentStreak >= 7 ? 'On Fire!' : 'Starting Out'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Best: <span className="font-bold text-foreground">{user.longestStreak}</span> days
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Social Links - Separate Card */}
                {user.socialLinks && Object.values(user.socialLinks).some(v => v) && (
                    <Card className="border-blue-500/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20">
                                    <Heart className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Social Connections</CardTitle>
                                    <CardDescription>Connect with {user.username} on social media</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                {user.socialLinks.twitter && (
                                    <a href={`https://twitter.com/${user.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 hover:border-[#1DA1F2]/50 hover:bg-[#1DA1F2]/15 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-[#1DA1F2]/15 flex items-center justify-center group-hover:bg-[#1DA1F2]/25 transition-colors">
                                            <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                                        </div>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">@{user.socialLinks.twitter}</span>
                                    </a>
                                )}
                                {user.socialLinks.instagram && (
                                    <a href={`https://instagram.com/${user.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-500/15 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-pink-500/15 flex items-center justify-center group-hover:bg-pink-500/25 transition-colors">
                                            <Instagram className="w-4 h-4 text-pink-500" />
                                        </div>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">@{user.socialLinks.instagram}</span>
                                    </a>
                                )}
                                {user.socialLinks.youtube && (
                                    <a href={`https://youtube.com/@${user.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-600/10 border border-red-600/20 hover:border-red-600/50 hover:bg-red-600/15 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-red-600/15 flex items-center justify-center group-hover:bg-red-600/25 transition-colors">
                                            <Youtube className="w-4 h-4 text-red-600" />
                                        </div>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{user.socialLinks.youtube}</span>
                                    </a>
                                )}
                                {user.socialLinks.tiktok && (
                                    <a href={`https://tiktok.com/@${user.socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/10 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center group-hover:bg-foreground/15 transition-colors">
                                            <SiTiktok className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">@{user.socialLinks.tiktok}</span>
                                    </a>
                                )}
                                {user.socialLinks.discord && (
                                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 cursor-default" title={user.socialLinks.discord}>
                                        <div className="w-8 h-8 rounded-lg bg-[#5865F2]/15 flex items-center justify-center">
                                            <SiDiscord className="w-4 h-4 text-[#5865F2]" />
                                        </div>
                                        <span className="text-sm text-muted-foreground">{user.socialLinks.discord}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Favorites Section */}
                {user.favorites && (user.favorites.shows?.length > 0 || user.favorites.movies?.length > 0 || user.favorites.anime?.length > 0) && (
                    <Card className="border-red-500/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20">
                                    <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Favorites</CardTitle>
                                    <CardDescription>{user.username}'s favorite content</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={user.favorites.movies?.length > 0 ? "movies" : user.favorites.shows?.length > 0 ? "shows" : "anime"}>
                                <TabsList className="bg-muted/50 border border-white/5 mb-4">
                                    {(user.favorites.movies?.length > 0) && <TabsTrigger value="movies">Movies</TabsTrigger>}
                                    {(user.favorites.shows?.length > 0) && <TabsTrigger value="shows">TV Shows</TabsTrigger>}
                                    {(user.favorites.anime?.length > 0) && <TabsTrigger value="anime">Anime</TabsTrigger>}
                                </TabsList>

                                {user.favorites.movies?.length > 0 && (
                                    <TabsContent value="movies" className="mt-0">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                            {user.favorites.movies.map((item: any) => (
                                                <Link key={item.id} href={`/movie/${item.slug}`}>
                                                    <div className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-red-500/30 transition-all hover:scale-[1.03]">
                                                        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2 text-center">
                                                            <span className="text-xs font-medium text-white w-full">{item.title}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </TabsContent>
                                )}

                                {user.favorites.shows?.length > 0 && (
                                    <TabsContent value="shows" className="mt-0">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                            {user.favorites.shows.map((item: any) => (
                                                <Link key={item.id} href={`/show/${item.slug}`}>
                                                    <div className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-red-500/30 transition-all hover:scale-[1.03]">
                                                        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2 text-center">
                                                            <span className="text-xs font-medium text-white w-full">{item.title}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </TabsContent>
                                )}

                                {user.favorites.anime?.length > 0 && (
                                    <TabsContent value="anime" className="mt-0">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                            {user.favorites.anime.map((item: any) => (
                                                <Link key={item.id} href={`/anime/${item.slug}`}>
                                                    <div className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-red-500/30 transition-all hover:scale-[1.03]">
                                                        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2 text-center">
                                                            <span className="text-xs font-medium text-white w-full">{item.title}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                {/* Inventory Sections */}
                {(() => {
                    const badges = user.badges || [];
                    const themes = badges.filter((b: any) => b.category === 'theme');
                    const skins = badges.filter((b: any) => b.category === 'skin' || b.name.includes('Skin'));
                    const regularBadges = badges.filter((b: any) => b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'feature');

                    if (badges.length === 0) return null;

                    return (
                        <>
                            {/* Premium Items (Themes) */}
                            {themes.length > 0 && (
                                <Card className="border-purple-500/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20">
                                                <Crown className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">Premium Themes</CardTitle>
                                                <CardDescription>{themes.length} theme{themes.length !== 1 ? 's' : ''} unlocked</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {themes.map((theme: any) => (
                                                <div key={theme.id} className="relative group w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-lg transition-all hover:scale-[1.03] hover:border-purple-500/40 hover:shadow-purple-500/10" title={theme.name}>
                                                    <div className="aspect-video w-full overflow-hidden">
                                                        <img src={theme.imageUrl || THEME_PREVIEWS[THEME_MAPPING[theme.name]]} alt={theme.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                                                    </div>
                                                    <div className="p-2 text-center absolute bottom-0 left-0 right-0">
                                                        <h4 className="text-[11px] font-bold text-white drop-shadow-md truncate">{theme.name}</h4>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Skins */}
                            {skins.length > 0 && (
                                <Card className="border-pink-500/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/20">
                                                <Crown className="w-5 h-5 text-pink-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">Profile Skins</CardTitle>
                                                <CardDescription>{skins.length} skin{skins.length !== 1 ? 's' : ''} collected</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                            {skins.map((skin: any) => (
                                                <div key={skin.id} className={cn(
                                                    "group relative flex flex-col items-center p-2.5 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg",
                                                    "bg-gradient-to-b from-muted/50 to-muted/20 border",
                                                    skin.equipped ? "border-primary/40 shadow-primary/10 shadow-md" : "border-white/5 hover:border-pink-500/30"
                                                )} title={skin.name}>
                                                    {skin.equipped && (
                                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10">
                                                            <Check className="w-3 h-3 text-primary-foreground" />
                                                        </div>
                                                    )}
                                                    <img src={skin.imageUrl} alt={skin.name} className="w-full aspect-[3/4] object-cover rounded-lg mb-2 drop-shadow-sm transition-transform group-hover:scale-105" />
                                                    <span className="text-[10px] text-center font-medium leading-tight w-full px-0.5 text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">{skin.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Regular Badges */}
                            {regularBadges.length > 0 && (
                                <Card className="border-yellow-500/10 bg-card/60 backdrop-blur-sm overflow-hidden">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/20">
                                                <Trophy className="w-5 h-5 text-yellow-400" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">Badge Collection</CardTitle>
                                                <CardDescription>{regularBadges.length} badge{regularBadges.length !== 1 ? 's' : ''} earned</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                            {regularBadges.map((badge: any) => {
                                                const iconName = badge.icon || 'Star';
                                                const PascalName = iconName.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                                                const IconComponent = (icons as any)[PascalName] || (icons as any)[iconName] || Star;

                                                return (
                                                    <div key={badge.id} className={cn(
                                                        "group relative flex flex-col items-center p-3 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg",
                                                        "bg-gradient-to-b from-muted/50 to-muted/20 border",
                                                        badge.equipped ? "border-yellow-500/30 shadow-yellow-500/10 shadow-md" : "border-white/5 hover:border-yellow-500/20"
                                                    )} title={badge.description}>
                                                        {badge.equipped && (
                                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center z-10">
                                                                <Check className="w-3 h-3 text-black" />
                                                            </div>
                                                        )}
                                                        {(badge.category === 'subscription' || badge.name.includes('Ad-Free')) ? (
                                                            <div className={`w-12 h-12 mb-2 transition-transform group-hover:scale-110 ${badge.name.includes('Yearly') ? 'text-amber-500' : 'text-red-500'}`}>
                                                                <AnimatedAdFreeIcon className="w-full h-full" />
                                                            </div>
                                                        ) : badge.imageUrl ? (
                                                            <img src={badge.imageUrl} alt={badge.name} className="w-12 h-12 object-contain mb-2 drop-shadow-sm transition-transform group-hover:scale-110" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2 group-hover:bg-yellow-500/20 transition-colors">
                                                                <IconComponent className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] text-center font-medium leading-tight w-full px-0.5 text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2 min-h-[28px]">{badge.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Full Avatar Preview */}
            {showFullAvatar && user?.avatarUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowFullAvatar(false)}
                >
                    <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl scale-100 hover:scale-[1.02] transition-transform duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div >
    );
}
