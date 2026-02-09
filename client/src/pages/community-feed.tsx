import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { FeedItem } from "@/components/community-feed/feed-item";
import { SuggestedFriends } from "@/components/community-feed/suggested-friends";
import { ReferralWidget } from "@/components/community-feed/referral-widget";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Zap, Users, AtSign } from "lucide-react";
import type { Activity, User } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";

export default function CommunityFeed() {
    const [realtimeActivities, setRealtimeActivities] = useState<(Activity & { user?: User })[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const { user } = useAuth();

    const { data: onlineUsersData } = useQuery({
        queryKey: ["online-users"],
        queryFn: async () => {
            const res = await fetch("/api/users/online");
            if (!res.ok) throw new Error("Failed to fetch online users");
            return res.json();
        },
        refetchInterval: 30000,
    });

    const [activeTab, setActiveTab] = useState("all");

    // Fetch friends for client-side filtering of real-time events
    const { data: friends = [] } = useQuery<any[]>({
        queryKey: ['/api/friends'],
        enabled: !!user,
    });

    // Fetch initial activities
    const { data: initialActivities, isLoading } = useQuery<(Activity & { user?: User })[]>({
        queryKey: ['/api/feed', activeTab],
        queryFn: async () => {
            const res = await fetch(`/api/feed?filter=${activeTab}`);
            if (!res.ok) throw new Error("Failed to fetch feed");
            return res.json();
        },
        // Refetch less often if we have socket updates, but good to re-sync occassionally
        refetchInterval: 60000,
    });

    // Socket listener for new activities
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.host}`;

        // Connect to social namespace
        const socket = io(`${socketUrl}/social`, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to social feed');
            if (user) {
                socket.emit('setup', user.id); // Assuming setup handles identity
            }
        });

        const handleNewActivity = (activity: Activity & { user?: User }) => {
            console.log("New activity received:", activity);
            setRealtimeActivities(prev => [activity, ...prev]);
        };

        socket.on('feed:new', handleNewActivity);

        return () => {
            socket.off('feed:new', handleNewActivity);
            socket.disconnect();
        };
    }, [user]);

    // Filter real-time activities based on active tab
    const filteredRealtimeActivities = realtimeActivities.filter(activity => {
        if (activeTab === 'all') return true;

        if (activeTab === 'friends') {
            if (!user) return false;
            // Check if activity user is a friend
            // Friend object structure from API: { friendId: string, userId: string, ... } where friendId is the OTHER person relative to payload.userId
            // But /api/friends returns enriched objects. Let's assume we map IDs.
            // Actually, /api/friends returns array of friend objects.
            const friendIds = new Set(friends.map(f => f.friendId));
            return friendIds.has(activity.userId) || activity.userId === user.id; // Show own activity too? Usually yes.
        }

        if (activeTab === 'mentions') { // Mentions tab
            if (!user) return false;
            // Logic: Activity entityId is user (direct interaction) OR metadata mentions user
            if (activity.entityId === user.id) return true;

            try {
                const meta = typeof activity.metadata === 'string' ? JSON.parse(activity.metadata) : activity.metadata;
                if (meta?.targetUserId === user.id) return true;
                if (meta?.mentionedUserIds && Array.isArray(meta.mentionedUserIds) && meta.mentionedUserIds.includes(user.id)) return true;
            } catch (e) { }
            return false;
        }

        return true;
    });

    // Combine initial and filtered realtime activities
    const allActivities = [
        ...filteredRealtimeActivities,
        ...(initialActivities || [])
    ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="container mx-auto px-4 py-8 space-y-8 min-h-screen">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4 pt-16 mb-12">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
                    <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                    Community Pulse
                </h1>
                <p className="text-lg text-muted-foreground">
                    See what's happening on StreamVault right now. Connect with friends, discover new content, and earn rewards together.
                </p>
                <div className="flex justify-center gap-2 text-sm font-medium text-green-400 bg-green-400/10 py-1 px-3 rounded-full w-fit mx-auto border border-green-400/20">
                    <span className="relative flex h-2 w-2 my-auto">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live Feed Active
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Main Feed Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                        <div className="flex items-center justify-between mb-6">
                            <TabsList className="bg-muted/50 border border-white/5">
                                <TabsTrigger value="all" className="gap-2"><Zap className="w-4 h-4" /> All Activity</TabsTrigger>
                                <TabsTrigger value="friends" className="gap-2"><Users className="w-4 h-4" /> Friends Only</TabsTrigger>
                                <TabsTrigger value="mentions" className="gap-2"><AtSign className="w-4 h-4" /> Mentions</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="all" className="mt-0 space-y-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p>Loading the pulse...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <AnimatePresence initial={false}>
                                        {allActivities.map((activity) => (
                                            <FeedItem key={activity.id} activity={activity} />
                                        ))}
                                    </AnimatePresence>

                                    {allActivities.length === 0 && (
                                        <div className="text-center py-16 border rounded-xl bg-muted/5 border-dashed border-white/10">
                                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                                                <Zap className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium">No activity yet</h3>
                                            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                                                Be the first to start watching, commenting, or buying badges!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="friends" className="mt-0 space-y-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p>Loading friends activity...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <AnimatePresence initial={false}>
                                        {allActivities.map((activity) => (
                                            <FeedItem key={activity.id} activity={activity} />
                                        ))}
                                    </AnimatePresence>

                                    {allActivities.length === 0 && (
                                        <div className="text-center py-16 border rounded-xl bg-muted/5 border-dashed border-white/10">
                                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                                                <Users className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium">No friends activity</h3>
                                            <p className="text-muted-foreground mt-2">Connect with friends to see their activity here.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="mentions" className="mt-0 space-y-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p>Loading mentions...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <AnimatePresence initial={false}>
                                        {allActivities.map((activity) => (
                                            <FeedItem key={activity.id} activity={activity} />
                                        ))}
                                    </AnimatePresence>

                                    {allActivities.length === 0 && (
                                        <div className="text-center py-16 border rounded-xl bg-muted/5 border-dashed border-white/10">
                                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                                                <AtSign className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium">No mentions yet</h3>
                                            <p className="text-muted-foreground mt-2">See when people tag you or reply to your comments.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    <ReferralWidget />
                    <SuggestedFriends />

                    {/* Online Users Widget */}
                    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
                        <div className="p-6">
                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                <span>Online Now</span>
                                <span className="text-xs normal-case bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                                    {onlineUsersData?.totalOnline ? `+${onlineUsersData.totalOnline} others` : '0 online'}
                                </span>
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {onlineUsersData?.users?.slice(0, 8).map((u: any) => (
                                    <div key={u.id} className="relative group cursor-pointer">
                                        <Link href={`/profile/${u.username}`}>
                                            <Avatar className="h-10 w-10 ring-2 ring-background transition-transform group-hover:scale-110">
                                                <AvatarImage src={u.avatarUrl || undefined} />
                                                <AvatarFallback>{u.username[0].toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"></span>
                                    </div>
                                ))}
                                {onlineUsersData?.totalOnline > 8 && (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted ring-2 ring-background text-xs font-medium hover:bg-muted/80 cursor-pointer transition-colors">
                                        +{onlineUsersData.totalOnline - 8}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
