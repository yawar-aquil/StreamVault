import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { io, Socket } from 'socket.io-client';
import {
    Users,
    Lock,
    Globe,
    Play,
    Tv,
    Film,
    Sparkles,
    RefreshCw,
    Plus,
    Search,
    ArrowRight,
    SortAsc,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SEO } from '@/components/seo';

interface WatchRoom {
    id: string;
    code: string;
    hostUsername: string;
    contentType: 'show' | 'movie' | 'anime';
    contentId: string;
    contentTitle: string;
    contentPoster?: string;
    episodeId?: string;
    episodeTitle?: string;
    isPublic: boolean;
    hasPassword: boolean;
    description?: string;
    scheduledFor?: string;
    userCount: number;
    createdAt: string;
}

export default function WatchRooms() {
    const [, setLocation] = useLocation();
    const [rooms, setRooms] = useState<WatchRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<WatchRoom | null>(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Filter & Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [contentFilter, setContentFilter] = useState<'all' | 'show' | 'movie' | 'anime'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'viewers'>('newest');

    // Quick join state
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');

    // Tab state for Live/Upcoming
    const [roomTab, setRoomTab] = useState<'live' | 'upcoming'>('live');

    // Fetch rooms via HTTP API
    const { data: roomsData, refetch } = useQuery<WatchRoom[]>({
        queryKey: ['/api/watch-rooms'],
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    useEffect(() => {
        if (roomsData) {
            setRooms(roomsData);
            setIsLoading(false);
        }
    }, [roomsData]);

    // Alternative: Connect via socket for real-time updates
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.host}`;

        const socket = io(`${socketUrl}/watch-together`, {
            path: '/watch-together-socket',
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('rooms:list');
        });

        socket.on('rooms:list', (roomsList: WatchRoom[]) => {
            setRooms(roomsList);
            setIsLoading(false);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleJoinRoom = (room: WatchRoom) => {
        if (room.hasPassword) {
            setSelectedRoom(room);
            setPassword('');
            setPasswordError('');
            setShowPasswordModal(true);
        } else {
            // Direct join for public rooms
            setLocation(`/watch-together/${room.code}`);
        }
    };

    const handlePasswordSubmit = () => {
        if (!password.trim()) {
            setPasswordError('Please enter a password');
            return;
        }

        // Navigate with password in state
        setLocation(`/watch-together/${selectedRoom?.code}?password=${encodeURIComponent(password)}`);
        setShowPasswordModal(false);
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case 'show':
                return <Tv className="w-4 h-4" />;
            case 'movie':
                return <Film className="w-4 h-4" />;
            case 'anime':
                return <Sparkles className="w-4 h-4" />;
            default:
                return <Tv className="w-4 h-4" />;
        }
    };

    const getContentTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            show: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            movie: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            anime: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        };
        return colors[type] || colors.show;
    };

    // Filter and sort rooms
    const filteredRooms = rooms
        .filter(room => {
            // Content type filter
            if (contentFilter !== 'all' && room.contentType !== contentFilter) return false;
            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                return room.contentTitle.toLowerCase().includes(query) ||
                    room.hostUsername.toLowerCase().includes(query);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'viewers') {
                return b.userCount - a.userCount;
            }
            // Sort by newest (createdAt)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    // Separate live rooms from upcoming scheduled rooms
    const now = new Date();
    const liveRooms = filteredRooms.filter(room =>
        !room.scheduledFor || new Date(room.scheduledFor) <= now
    );
    const upcomingRooms = filteredRooms.filter(room =>
        room.scheduledFor && new Date(room.scheduledFor) > now
    ).sort((a, b) =>
        new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime()
    );

    // Format scheduled time
    const formatScheduledTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        } else if (hours > 0) {
            return `Starts in ${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `Starts in ${minutes}m`;
        }
        return 'Starting soon';
    };

    // Handle quick join
    const handleQuickJoin = () => {
        const code = joinCode.trim().toUpperCase();
        if (!code) {
            setJoinError('Please enter a room code');
            return;
        }
        if (code.length !== 6) {
            setJoinError('Room code must be 6 characters');
            return;
        }
        setJoinError('');
        setLocation(`/watch-together/${code}`);
    };

    return (
        <div className="min-h-screen bg-background">
            <SEO
                title="Watch Rooms | StreamVault"
                description="Join live watch parties and watch shows and movies together with friends"
            />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary" />
                            Watch Rooms
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Join live watch sessions with other viewers
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/create-room">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Create Room
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => refetch()}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Quick Join & Filters Section */}
                <div className="mb-8 space-y-4">
                    {/* Quick Join */}
                    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border rounded-lg">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Join by Room Code</label>
                            <div className="flex gap-2">
                                <Input
                                    value={joinCode}
                                    onChange={(e) => {
                                        setJoinCode(e.target.value.toUpperCase());
                                        setJoinError('');
                                    }}
                                    placeholder="Enter 6-digit code"
                                    maxLength={6}
                                    className="uppercase font-mono tracking-wider"
                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickJoin()}
                                />
                                <Button onClick={handleQuickJoin} className="gap-2">
                                    <ArrowRight className="w-4 h-4" />
                                    Join
                                </Button>
                            </div>
                            {joinError && <p className="text-sm text-destructive mt-1">{joinError}</p>}
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by title or host..."
                                className="pl-10"
                            />
                        </div>

                        {/* Content Type Filter */}
                        <div className="flex gap-2">
                            {(['all', 'show', 'movie', 'anime'] as const).map((type) => (
                                <Button
                                    key={type}
                                    variant={contentFilter === type ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setContentFilter(type)}
                                    className="capitalize"
                                >
                                    {type === 'all' ? 'All' : type === 'show' ? 'Shows' : type === 'movie' ? 'Movies' : 'Anime'}
                                </Button>
                            ))}
                        </div>

                        {/* Sort */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortBy(sortBy === 'newest' ? 'viewers' : 'newest')}
                            className="gap-2"
                        >
                            <SortAsc className="w-4 h-4" />
                            {sortBy === 'newest' ? 'Newest' : 'Most Viewers'}
                        </Button>
                    </div>

                    {/* Live/Upcoming Tabs */}
                    {!isLoading && (
                        <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-muted/30">
                            <Button
                                variant={roomTab === 'live' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setRoomTab('live')}
                                className="gap-2"
                            >
                                <Play className="w-4 h-4" />
                                Live Now
                                <span className={`${roomTab === 'live' ? 'bg-primary-foreground/20' : 'bg-muted'} px-2 py-0.5 rounded-full text-xs font-medium`}>
                                    {liveRooms.length}
                                </span>
                            </Button>
                            <Button
                                variant={roomTab === 'upcoming' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setRoomTab('upcoming')}
                                className="gap-2"
                            >
                                <Clock className="w-4 h-4" />
                                Upcoming
                                <span className={`${roomTab === 'upcoming' ? 'bg-primary-foreground/20' : 'bg-muted'} px-2 py-0.5 rounded-full text-xs font-medium`}>
                                    {upcomingRooms.length}
                                </span>
                            </Button>
                        </div>
                    )}

                    {/* Filtered notice */}
                    {!isLoading && (searchQuery || contentFilter !== 'all') && (
                        <p className="text-sm text-muted-foreground">(filtered)</p>
                    )}
                </div>

                {/* Upcoming Rooms Section - only show when tab is 'upcoming' */}
                {!isLoading && roomTab === 'upcoming' && upcomingRooms.length > 0 && (
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {upcomingRooms.map((room) => (
                                <Card
                                    key={room.id}
                                    className="group overflow-hidden border-amber-500/30 hover:border-amber-500 transition-all duration-300 cursor-pointer"
                                    onClick={() => handleJoinRoom(room)}
                                >
                                    {/* Poster */}
                                    <div className="relative aspect-video overflow-hidden bg-muted">
                                        {room.contentPoster ? (
                                            <img
                                                src={room.contentPoster}
                                                alt={room.contentTitle}
                                                className="w-full h-full object-cover opacity-70"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {getContentIcon(room.contentType)}
                                            </div>
                                        )}

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                                        {/* Scheduled Badge */}
                                        <div className="absolute top-3 left-3">
                                            <Badge className="bg-amber-500/90 text-black border-amber-600">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {formatScheduledTime(room.scheduledFor!)}
                                            </Badge>
                                        </div>

                                        {/* Viewers */}
                                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-xs flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {room.userCount} waiting
                                        </div>
                                    </div>

                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{room.contentTitle}</h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                            Hosted by <span className="font-medium">{room.hostUsername}</span>
                                        </p>
                                        {room.description && (
                                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">"{room.description}"</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Live Room Grid - only show when tab is 'live' */}
                {!isLoading && roomTab === 'live' && liveRooms.length > 0 && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {liveRooms.map((room) => (
                                <Card
                                    key={room.id}
                                    className="group overflow-hidden hover:border-primary transition-all duration-300 cursor-pointer"
                                    onClick={() => handleJoinRoom(room)}
                                >
                                    {/* Poster */}
                                    <div className="relative aspect-video overflow-hidden bg-muted">
                                        {room.contentPoster ? (
                                            <img
                                                src={room.contentPoster}
                                                alt={room.contentTitle}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {getContentIcon(room.contentType)}
                                            </div>
                                        )}

                                        {/* Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                        {/* Status Badges */}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <Badge className={getContentTypeBadge(room.contentType)}>
                                                {getContentIcon(room.contentType)}
                                                <span className="ml-1 capitalize">{room.contentType}</span>
                                            </Badge>
                                        </div>

                                        <div className="absolute top-3 right-3">
                                            {room.isPublic ? (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                    <Globe className="w-3 h-3 mr-1" />
                                                    Public
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                                    <Lock className="w-3 h-3 mr-1" />
                                                    Private
                                                </Badge>
                                            )}
                                        </div>

                                        {/* User Count */}
                                        <div className="absolute bottom-3 right-3">
                                            <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm">
                                                <Users className="w-3 h-3 mr-1" />
                                                {room.userCount} watching
                                            </Badge>
                                        </div>

                                        {/* Play Button on Hover */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                                                <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                                            </div>
                                        </div>
                                    </div>

                                    <CardContent className="p-4">
                                        {/* Title */}
                                        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                            {room.contentTitle}
                                        </h3>

                                        {/* Episode Info */}
                                        {room.episodeTitle && (
                                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                                {room.episodeTitle}
                                            </p>
                                        )}

                                        {/* Host Info */}
                                        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                <span className="text-xs font-medium text-primary">
                                                    {room.hostUsername.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <span>Hosted by <span className="text-foreground">{room.hostUsername}</span></span>
                                        </div>

                                        {/* Room Code */}
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Room Code:</span>
                                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                                {room.code}
                                            </code>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="aspect-video bg-muted" />
                                <CardContent className="p-4">
                                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Empty State for Live tab */}
                {!isLoading && roomTab === 'live' && liveRooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Users className="w-16 h-16 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No Live Rooms</h2>
                        <p className="text-muted-foreground mb-6 max-w-md">
                            There aren't any live watch rooms right now. Be the first to create one!
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link href="/create-room">
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create New Room
                                </Button>
                            </Link>
                            {upcomingRooms.length > 0 && (
                                <Button variant="outline" className="gap-2" onClick={() => setRoomTab('upcoming')}>
                                    <Clock className="w-4 h-4" />
                                    View {upcomingRooms.length} Upcoming
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State for Upcoming tab */}
                {!isLoading && roomTab === 'upcoming' && upcomingRooms.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Clock className="w-16 h-16 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No Upcoming Watch Parties</h2>
                        <p className="text-muted-foreground mb-6 max-w-md">
                            No scheduled watch parties yet. Create one and invite friends!
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link href="/create-room">
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Schedule a Watch Party
                                </Button>
                            </Link>
                            {liveRooms.length > 0 && (
                                <Button variant="outline" className="gap-2" onClick={() => setRoomTab('live')}>
                                    <Play className="w-4 h-4" />
                                    View {liveRooms.length} Live
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Password Modal */}
                <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-orange-400" />
                                Private Room
                            </DialogTitle>
                            <DialogDescription>
                                Enter the password to join "{selectedRoom?.contentTitle}"
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input
                                type="password"
                                placeholder="Enter room password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                            />
                            {passwordError && (
                                <p className="text-sm text-destructive">{passwordError}</p>
                            )}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowPasswordModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handlePasswordSubmit}
                                >
                                    Join Room
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
