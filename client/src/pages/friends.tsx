import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { differenceInMinutes, parseISO } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';
import { RoleBadge, getUserRole } from "@/components/role-badge";
import {
    Users,
    UserPlus,
    Search,
    Check,
    X,
    MessageCircle,
    MoreVertical,
    Trash2,
    Clock,
    Loader2,
    Play,
    Tv
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFriends } from '@/contexts/friends-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { DMPanel } from '@/components/dm-panel';
import { UserProfileModal } from '@/components/user-profile-modal';
import { useSocialSocket } from '@/hooks/use-social-socket';

export default function Friends() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const { isFriendOnline, getFriendActivity, requestFriendActivities, isConnected, onFriendStatusChange, onDMReceived } = useSocialSocket();
    const [activeTab, setActiveTab] = useState('friends');
    const {
        friends,
        friendRequests,
        isLoading,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        searchUsers,
        updateFriendLastActive
    } = useFriends();
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatarUrl: string | null; badges?: any[] }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
    const [selectedDMFriendId, setSelectedDMFriendId] = useState<string | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [selectedProfileUser, setSelectedProfileUser] = useState<{
        username: string;
        avatarUrl?: string;
        authUserId?: string;
        bio?: string;
        socialLinks?: {
            twitter?: string;
            instagram?: string;
            youtube?: string;
            tiktok?: string;
            discord?: string;
        } | null;
        favorites?: {
            shows?: Array<{ id: string; title: string; posterUrl: string | null }>;
            movies?: Array<{ id: string; title: string; posterUrl: string | null }>;
        } | null;
        xp?: number;
        level?: number;
        badges?: any[];
        isModerator?: boolean;
    } | null>(null);

    // Handle ?dm=friendId URL parameter
    const searchString = useSearch();
    useEffect(() => {
        const params = new URLSearchParams(searchString);
        const dmParam = params.get('dm');
        if (dmParam) {
            setSelectedDMFriendId(dmParam);
            // Clear the URL param without page reload
            window.history.replaceState({}, '', '/friends');
        }
    }, [searchString]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            setLocation('/login?redirect=/friends');
        }
    }, [authLoading, isAuthenticated, setLocation]);

    // Request friend activities when connected
    useEffect(() => {
        if (isConnected && isAuthenticated) {
            requestFriendActivities();
        }
    }, [isConnected, isAuthenticated, requestFriendActivities]);

    // Fetch initial unread counts
    useEffect(() => {
        if (!isAuthenticated) return;
        fetch('/api/messages/unread-counts', { credentials: 'include' })
            .then(res => res.ok ? res.json() : {})
            .then(data => setUnreadCounts(data))
            .catch(() => { });
    }, [isAuthenticated]);

    // Real-time DM received - increment unread count
    useEffect(() => {
        onDMReceived((dm) => {
            // Only increment if DM panel is not open for that friend
            if (selectedDMFriendId !== dm.fromUserId) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [dm.fromUserId]: (prev[dm.fromUserId] || 0) + 1
                }));
            }
        });
    }, [onDMReceived, selectedDMFriendId]);

    // Handle instant offline status updates
    useEffect(() => {
        onFriendStatusChange((friendId, isOnline) => {
            if (!isOnline) {
                // Instantly update local state when user goes offline
                updateFriendLastActive(friendId, new Date().toISOString());
            }
        });
    }, [onFriendStatusChange, updateFriendLastActive]);

    // View friend profile
    const handleViewProfile = async (friendId: string, username: string, avatarUrl?: string | null) => {
        let bio: string | undefined;
        let socialLinks: any = null;
        let favorites: any = null;
        let xp: number | undefined;
        let level: number | undefined;
        let badges: any[] | undefined;
        let isModerator: boolean | undefined;

        try {
            const response = await fetch(`/api/users/${friendId}/profile`, { cache: 'no-store' });
            if (response.ok) {
                const profile = await response.json();
                bio = profile.bio;
                socialLinks = profile.socialLinks;
                favorites = profile.favorites;
                xp = profile.xp;
                level = profile.level;
                badges = profile.badges ? (typeof profile.badges === 'string' ? JSON.parse(profile.badges) : profile.badges) : [];
                isModerator = profile.isModerator;
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }

        setSelectedProfileUser({
            username,
            avatarUrl: avatarUrl || undefined,
            authUserId: friendId,
            bio,
            socialLinks,
            favorites,
            xp,
            level,
            badges,
            isModerator
        });
    };

    // Search users with debounce
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, searchUsers]);

    const handleSendRequest = async (toUserId: string) => {
        setPendingRequests(prev => new Set(prev).add(toUserId));

        try {
            await sendFriendRequest(toUserId);

            // If we get here, it succeeded (context handles its own toasts but we can show one too or rely on context)
            // The context already shows 'Friend request sent', so we might duplicate toast if we keep it here.
            // But checking the context code, it does show a toast.
            // Let's rely on context for the toast, or keep the specific one here?
            // The context throws on error.

            setSentRequests(prev => new Set(prev).add(toUserId));
        } catch (error: any) {
            // Context already shows error toast, so we might not need another one,
            // but for safety we can log or just let the context handle UI feedback.
            console.error("Friend request failed:", error);
        } finally {
            setPendingRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(toUserId);
                return newSet;
            });
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        await acceptFriendRequest(requestId);
        toast({
            title: 'Friend Added',
            description: 'You are now friends!',
        });
    };

    const handleDeclineRequest = async (requestId: string) => {
        await declineFriendRequest(requestId);
        toast({
            title: 'Request Declined',
            description: 'Friend request has been declined.',
        });
    };

    const handleRemoveFriend = async (friendId: string, username: string) => {
        await removeFriend(friendId);
        toast({
            title: 'Friend Removed',
            description: `${username} has been removed from your friends.`,
        });
    };

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
                <Users className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Friends</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="friends" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Friends
                        {friends.length > 0 && (
                            <span className="ml-1 bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                                {friends.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Requests
                        {friendRequests.length > 0 && (
                            <span className="ml-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                                {friendRequests.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="search" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Friends
                    </TabsTrigger>
                </TabsList>

                {/* Friends List */}
                <TabsContent value="friends" className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : friends.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-lg border">
                            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No Friends Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Start connecting with other users!
                            </p>
                            <Button onClick={() => setActiveTab('search')}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Find Friends
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {friends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="flex items-center gap-4 p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors"
                                >
                                    {/* Avatar - Clickable to view profile */}
                                    <button
                                        className="relative cursor-pointer"
                                        onClick={() => handleViewProfile(friend.friendId, friend.username, friend.avatarUrl)}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
                                            {friend.avatarUrl ? (
                                                <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-medium">{friend.username.slice(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        {(() => {
                                            const isOnline = isFriendOnline(friend.friendId);
                                            const lastActiveDate = friend.lastActive ? new Date(friend.lastActive) : null;
                                            // Consider online ONLY if socket connected (instant updates)
                                            const showOnline = isOnline;

                                            if (showOnline) {
                                                return <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />;
                                            } else if (lastActiveDate) {
                                                // Mobile/Away indicator (gray with green ring or just gray?) - user asked for text, but dot is good too
                                                // Let's stick to just the green dot for online, and text for offline
                                                return null;
                                            }
                                            return null;
                                        })()}
                                    </button>

                                    {/* Info and Activity */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{friend.username}</h3>
                                            <RoleBadge role={getUserRole(friend as any)} />
                                            {/* Equipped Badges */}
                                            {friend.badges && friend.badges.filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin')).length > 0 && (
                                                <div className="flex items-center gap-0.5">
                                                    {friend.badges.filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin')).sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime()).map((badge: any) => (
                                                        <div key={badge.id} title={badge.name} className="relative group/tooltip">
                                                            <img
                                                                src={badge.imageUrl}
                                                                alt={badge.name}
                                                                className="w-4 h-4 object-contain"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {(() => {
                                            const activity = getFriendActivity(friend.friendId);
                                            if (activity?.activity) {
                                                return (
                                                    <div className="mt-2 flex gap-3 bg-gradient-to-r from-green-500/10 to-emerald-500/5 rounded-lg p-2 border border-green-500/20">
                                                        {/* Content Poster */}
                                                        {activity.activity.contentPoster && (
                                                            <img
                                                                src={activity.activity.contentPoster.startsWith('/')
                                                                    ? activity.activity.contentPoster
                                                                    : `https://image.tmdb.org/t/p/w92${activity.activity.contentPoster}`
                                                                }
                                                                alt={activity.activity.contentTitle}
                                                                className="w-12 h-16 rounded object-cover flex-shrink-0"
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                                                                    {activity.activity.contentType}
                                                                </span>
                                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                                <span className="text-xs text-green-400">LIVE</span>
                                                            </div>
                                                            <p className="text-sm font-medium truncate mt-1">
                                                                {activity.activity.contentTitle}
                                                            </p>
                                                            {activity.activity.episodeTitle && (
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {activity.activity.episodeTitle}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="text-sm text-muted-foreground">
                                                    <div className="flex flex-col gap-0.5">
                                                        {(() => {
                                                            const isOnline = isFriendOnline(friend.friendId);
                                                            const lastActiveDate = friend.lastActive ? new Date(friend.lastActive) : null;
                                                            const showOnline = isOnline;

                                                            if (showOnline) {
                                                                return <span className="text-xs text-green-500 font-medium">Online</span>;
                                                            } else if (lastActiveDate) {
                                                                return <span className="text-xs text-muted-foreground">Active {formatDistanceToNow(lastActiveDate, { addSuffix: true })}</span>;
                                                            } else {
                                                                return <span className="text-xs text-muted-foreground">Friends since {formatDistanceToNow(new Date(friend.createdAt), { addSuffix: true })}</span>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {/* Join button if friend is watching something */}
                                        {(() => {
                                            const activity = getFriendActivity(friend.friendId);
                                            if (activity?.activity) {
                                                return (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => setLocation(`/watch-together/${activity.activity!.roomCode}`)}
                                                    >
                                                        <Play className="h-4 w-4 mr-2" />
                                                        Join
                                                    </Button>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <Button variant="outline" size="sm" className="relative" onClick={() => {
                                            setUnreadCounts(prev => {
                                                const newCounts = { ...prev };
                                                delete newCounts[friend.friendId];
                                                return newCounts;
                                            });
                                            setSelectedDMFriendId(friend.friendId);
                                        }}>
                                            <MessageCircle className="h-4 w-4 mr-2" />
                                            Message
                                            {unreadCounts[friend.friendId] > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                    {unreadCounts[friend.friendId] > 9 ? '9+' : unreadCounts[friend.friendId]}
                                                </span>
                                            )}
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleRemoveFriend(friend.friendId, friend.username)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Remove Friend
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Friend Requests */}
                <TabsContent value="requests" className="space-y-4">
                    {friendRequests.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-lg border">
                            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                            <p className="text-muted-foreground">
                                You don't have any friend requests at the moment.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {friendRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center gap-4 p-4 bg-card rounded-lg border"
                                >
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                        {request.fromUser?.avatarUrl ? (
                                            <img src={request.fromUser.avatarUrl} alt={request.fromUser.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-lg font-medium">
                                                {request.fromUser?.username.slice(0, 2).toUpperCase() || '??'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{request.fromUser?.username || 'Unknown'}</h3>
                                            <RoleBadge role={getUserRole(request.fromUser as any)} />
                                            {/* Equipped Badges for Requests - assuming backend sends them */}
                                            {request.fromUser?.badges && request.fromUser.badges.filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin')).length > 0 && (
                                                <div className="flex items-center gap-0.5">
                                                    {request.fromUser.badges.filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin')).sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime()).map((badge: any) => (
                                                        <div key={badge.id} title={badge.name} className="relative group/tooltip">
                                                            <img
                                                                src={badge.imageUrl}
                                                                alt={badge.name}
                                                                className="w-4 h-4 object-contain"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Sent {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={() => handleAcceptRequest(request.id)}>
                                            <Check className="h-4 w-4 mr-2" />
                                            Accept
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleDeclineRequest(request.id)}>
                                            <X className="h-4 w-4 mr-2" />
                                            Decline
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Search / Add Friends */}
                <TabsContent value="search" className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users by username..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {isSearching && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    )}

                    {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No users found matching "{searchQuery}"
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="grid gap-4">
                            {searchResults.map((resultUser) => (
                                <div
                                    key={resultUser.id}
                                    className="flex items-center gap-4 p-4 bg-card rounded-lg border"
                                >
                                    {/* Avatar */}
                                    {/* Avatar - Clickable to view profile */}
                                    <button
                                        className="relative cursor-pointer"
                                        onClick={() => handleViewProfile(resultUser.id, resultUser.username, resultUser.avatarUrl)}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
                                            {resultUser.avatarUrl ? (
                                                <img src={resultUser.avatarUrl} alt={resultUser.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-medium">{resultUser.username.slice(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                    </button>

                                    {/* Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{resultUser.username}</h3>
                                            <RoleBadge role={getUserRole(resultUser as any)} />
                                            {/* Equipped Badges */}
                                            {resultUser.badges && (
                                                <div className="flex items-center gap-1">
                                                    {(Array.isArray(resultUser.badges)
                                                        ? resultUser.badges
                                                        : (typeof resultUser.badges === 'string' ? JSON.parse(resultUser.badges) : [])
                                                    )
                                                        .filter((b: any) => b.equipped && b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'theme')
                                                        .sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime())
                                                        .map((badge: any) => (
                                                            <div key={badge.id} title={badge.name} className="relative group/tooltip">
                                                                <img
                                                                    src={badge.imageUrl}
                                                                    alt={badge.name}
                                                                    className="w-5 h-5 object-contain"
                                                                />
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action */}
                                    {user?.id === resultUser.id ? (
                                        <Button size="sm" variant="outline" disabled>
                                            You
                                        </Button>
                                    ) : sentRequests.has(resultUser.id) ? (
                                        <Button size="sm" variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10" disabled>
                                            <Check className="h-4 w-4 mr-2" />
                                            Sent
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleSendRequest(resultUser.id)}
                                            disabled={pendingRequests.has(resultUser.id)}
                                        >
                                            {pendingRequests.has(resultUser.id) ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <UserPlus className="h-4 w-4 mr-2" />
                                            )}
                                            Add Friend

                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {searchQuery.length < 2 && (
                        <div className="text-center py-12 bg-card rounded-lg border">
                            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">Find Friends</h3>
                            <p className="text-muted-foreground">
                                Enter at least 2 characters to search for users
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* DM Panel */}
            {selectedDMFriendId && (
                <DMPanel
                    friendId={selectedDMFriendId}
                    friend={friends.find(f => f.friendId === selectedDMFriendId) ? {
                        id: selectedDMFriendId,
                        username: friends.find(f => f.friendId === selectedDMFriendId)!.username,
                        avatarUrl: friends.find(f => f.friendId === selectedDMFriendId)!.avatarUrl,
                        badges: friends.find(f => f.friendId === selectedDMFriendId)!.badges,
                        lastActive: friends.find(f => f.friendId === selectedDMFriendId)!.lastActive,
                    } : null}
                    onClose={() => setSelectedDMFriendId(null)}
                />
            )}

            {/* User Profile Modal */}
            {selectedProfileUser && (
                <UserProfileModal
                    isOpen={!!selectedProfileUser}
                    onClose={() => setSelectedProfileUser(null)}
                    user={selectedProfileUser}
                    isFriend={friends.some(f => f.friendId === selectedProfileUser.authUserId)}
                />
            )}
        </div>
    );
}
