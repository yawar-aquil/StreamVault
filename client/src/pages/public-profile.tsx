import { Link, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Trophy, Crown, Star, Twitter, Instagram, Youtube, Heart, Calendar, UserPlus, UserMinus, X, Check } from 'lucide-react';
import { SiTiktok, SiDiscord } from 'react-icons/si';
import { THEME_MAPPING, THEME_PREVIEWS } from '@/lib/theme-data';
import { cn } from '@/lib/utils';
import { HeartRain } from '@/components/heart-rain';
import { GalaxyAnimation } from '@/components/galaxy-animation';
import { AnimeMotion } from '@/components/anime-motion';
import { icons } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
    id: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    level: number;
    xp: number;
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 pt-24 pb-20">
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
                                <div className="relative group">
                                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-primary/20">
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
                                                .map((badge: any) => (
                                                    <div key={badge.id} className="relative group/tooltip" title={badge.name}>
                                                        <img
                                                            src={badge.imageUrl}
                                                            alt={badge.name}
                                                            className="w-6 h-6 object-contain drop-shadow-md hover:scale-110 transition-transform"
                                                        />
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

                                {/* Social Links - Read Only */}
                                {user.socialLinks && Object.keys(user.socialLinks).length > 0 ? (
                                    <div className="flex gap-3 justify-center md:justify-start pt-2">
                                        {user.socialLinks.twitter && (
                                            <a href={`https://twitter.com/${user.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#1DA1F2] transition-colors"><Twitter className="w-5 h-5" /></a>
                                        )}
                                        {user.socialLinks.instagram && (
                                            <a href={`https://instagram.com/${user.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-pink-500 transition-colors"><Instagram className="w-5 h-5" /></a>
                                        )}
                                        {user.socialLinks.youtube && (
                                            <a href={`https://youtube.com/@${user.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-red-600 transition-colors"><Youtube className="w-5 h-5" /></a>
                                        )}
                                        {user.socialLinks.tiktok && (
                                            <a href={`https://tiktok.com/@${user.socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiTiktok className="w-5 h-5" /></a>
                                        )}
                                        {user.socialLinks.discord && (
                                            <div className="text-muted-foreground hover:text-[#5865F2] transition-colors cursor-help" title={user.socialLinks.discord}><SiDiscord className="w-5 h-5" /></div>
                                        )}
                                    </div>
                                ) : (
                                    user.id !== (useAuth()?.user?.id) && (
                                        <p className="text-xs text-muted-foreground italic pt-2">Social links are visible to friends only.</p>
                                    )
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Favorites Section */}
                {user.favorites && (user.favorites.shows?.length > 0 || user.favorites.movies?.length > 0 || user.favorites.anime?.length > 0) && (
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-red-500" />
                                Favorites
                            </h3>
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
                                                    <div className="group relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer">
                                                        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                                                            <span className="text-xs font-medium text-white">{item.title}</span>
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
                                                    <div className="group relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer">
                                                        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                                                            <span className="text-xs font-medium text-white">{item.title}</span>
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
                                                    <div className="group relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer">
                                                        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                                                            <span className="text-xs font-medium text-white">{item.title}</span>
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

                {/* Badge Collection Section (Read Only) */}
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Badge Collection
                        </h3>

                        {(() => {
                            const badges = user.badges || [];
                            const themes = badges.filter((b: any) => b.category === 'theme');
                            const skins = badges.filter((b: any) => b.category === 'skin' || b.name.includes('Skin'));
                            const regularBadges = badges.filter((b: any) => b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'feature');

                            if (badges.length === 0) return <p className="text-muted-foreground italic">No badges earned yet.</p>;

                            return (
                                <div className="space-y-6">
                                    {/* Themes/Premium */}
                                    {themes.length > 0 && (
                                        <div>
                                            <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                                <Crown className="w-3 h-3 text-purple-500" /> Premium Items
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                                {themes.map((theme: any) => (
                                                    <div key={theme.id} className="relative aspect-video rounded-lg overflow-hidden border border-white/10" title={theme.name}>
                                                        <img src={theme.imageUrl || THEME_PREVIEWS[THEME_MAPPING[theme.name]]} alt={theme.name} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Skins */}
                                    {skins.length > 0 && (
                                        <div>
                                            <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                                <Crown className="w-3 h-3 text-pink-500" /> Skins
                                            </h4>
                                            <div className="flex flex-wrap gap-3">
                                                {skins.map((skin: any) => (
                                                    <div key={skin.id} className="flex flex-col items-center p-2 bg-muted/30 rounded-lg w-[80px]" title={skin.name}>
                                                        <img src={skin.imageUrl} alt={skin.name} className="w-full h-20 object-cover rounded mb-1" />
                                                        <span className="text-[10px] text-center truncate w-full">{skin.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Regular Badges */}
                                    {regularBadges.length > 0 && (
                                        <div>
                                            <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                                <Star className="w-3 h-3" /> Achievements
                                            </h4>
                                            <div className="flex flex-wrap gap-3">
                                                {regularBadges.map((badge: any) => {
                                                    const iconName = badge.icon || 'Star';
                                                    const PascalName = iconName.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                                                    const IconComponent = (icons as any)[PascalName] || (icons as any)[iconName] || Star;

                                                    return (
                                                        <div key={badge.id} className="flex flex-col items-center p-3 bg-muted/30 rounded-lg w-[100px] h-[100px] justify-center text-center" title={badge.description}>
                                                            {badge.imageUrl ? (
                                                                <img src={badge.imageUrl} alt={badge.name} className="w-10 h-10 object-contain mb-2" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2">
                                                                    <IconComponent className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                            <span className="text-[10px] font-medium leading-tight line-clamp-2">{badge.name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
