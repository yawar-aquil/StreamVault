import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/auth-context';

interface OnlineFriend {
    friendId: string;
    username?: string;
    avatarUrl?: string;
}

interface DMReceivedEvent {
    id: string;
    fromUserId: string;
    message: string;
    createdAt: string;
}

interface NotificationEvent {
    type: 'friend_request' | 'friend_accepted' | 'dm' | 'room_invite';
    fromUser?: { id: string; username: string; avatarUrl?: string };
    message: string;
}

// Friend watch activity
export interface FriendActivity {
    friendId: string;
    username: string;
    avatarUrl?: string;
    activity: {
        roomCode: string;
        contentType: 'show' | 'movie' | 'anime';
        contentId: string;
        contentTitle: string;
        contentPoster?: string;
        episodeTitle?: string;
        startedAt: string;
    } | null;
}

export function useSocialSocket() {
    const { user, isAuthenticated } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [onlineFriends, setOnlineFriends] = useState<Set<string>>(new Set());
    const [friendActivities, setFriendActivities] = useState<Map<string, FriendActivity>>(new Map());
    const [typingFriends, setTypingFriends] = useState<Set<string>>(new Set());
    const [isConnected, setIsConnected] = useState(false);

    // Callbacks for events
    const dmReceivedCallbackRef = useRef<((dm: DMReceivedEvent) => void) | null>(null);
    const notificationCallbackRef = useRef<((notification: NotificationEvent) => void) | null>(null);
    const friendRequestCallbackRef = useRef<(() => void) | null>(null);
    const inventoryUpdateCallbackRef = useRef<(() => void) | null>(null);
    const friendStatusChangeCallbackRef = useRef<((friendId: string, isOnline: boolean) => void) | null>(null);
    const dmReactionCallbackRef = useRef<((dm: any) => void) | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Connect to social namespace
        const socket = io('/social', {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🤝 Connected to social socket');
            setIsConnected(true);

            // Tell server we're online
            socket.emit('user:online', { userId: user.id });

            // Get initial online friends list
            socket.emit('friends:get-online', { userId: user.id });
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from social socket');
            setIsConnected(false);
        });

        // Online friends list response
        socket.on('friends:online-list', (data: { onlineFriends: string[] }) => {
            setOnlineFriends(new Set(data.onlineFriends));
        });

        // Friend comes online
        socket.on('friend:online', (data: { friendId: string }) => {
            setOnlineFriends(prev => new Set(Array.from(prev).concat(data.friendId)));
            if (friendStatusChangeCallbackRef.current) {
                friendStatusChangeCallbackRef.current(data.friendId, true);
            }
        });

        // Friend goes offline
        socket.on('friend:offline', (data: { friendId: string }) => {
            setOnlineFriends(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.friendId);
                return newSet;
            });
            if (friendStatusChangeCallbackRef.current) {
                friendStatusChangeCallbackRef.current(data.friendId, false);
            }
        });

        // Real-time DM received
        socket.on('dm:received', (dm: DMReceivedEvent) => {
            if (dmReceivedCallbackRef.current) {
                dmReceivedCallbackRef.current(dm);
            }
        });

        // Real-time DM reaction
        socket.on('dm:reaction', (dm: any) => {
            if (dmReactionCallbackRef.current) {
                dmReactionCallbackRef.current(dm);
            }
        });

        // Real-time notification
        socket.on('notification:new', (notification: NotificationEvent) => {
            if (notificationCallbackRef.current) {
                notificationCallbackRef.current(notification);
            }
            // Auto-refresh friend requests when a friend_request notification is received
            if (notification.type === 'friend_request' && friendRequestCallbackRef.current) {
                friendRequestCallbackRef.current();
            }
            // Auto-refresh friends list when friend_accepted notification is received
            if (notification.type === 'friend_accepted' && friendRequestCallbackRef.current) {
                friendRequestCallbackRef.current();
            }
        });

        // Friend activities list response
        socket.on('friends:activities', (data: { activities: FriendActivity[] }) => {
            const newMap = new Map<string, FriendActivity>();
            for (const activity of data.activities) {
                newMap.set(activity.friendId, activity);
            }
            setFriendActivities(newMap);
        });

        // Real-time friend activity update
        socket.on('friend:activity', (data: FriendActivity) => {
            setFriendActivities(prev => {
                const newMap = new Map(prev);
                if (data.activity) {
                    newMap.set(data.friendId, data);
                } else {
                    newMap.delete(data.friendId);
                }
                return newMap;
            });
        });

        // Friend typing status
        socket.on('friend:typing', (data: { friendId: string; isTyping: boolean }) => {
            setTypingFriends(prev => {
                const newSet = new Set(prev);
                if (data.isTyping) {
                    newSet.add(data.friendId);
                } else {
                    newSet.delete(data.friendId);
                }
                return newSet;
            });
        });



        // Inventory update received
        socket.on('inventory_update', () => {
            if (inventoryUpdateCallbackRef.current) {
                inventoryUpdateCallbackRef.current();
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, user?.id]);

    const sendDM = useCallback((toUserId: string, message: string, replyToId?: string) => {
        if (socketRef.current && user?.id) {
            socketRef.current.emit('dm:send', {
                fromUserId: user.id,
                toUserId,
                message,
                replyToId,
            });
        }
    }, [user?.id]);

    const notifyFriendRequest = useCallback((toUserId: string) => {
        if (socketRef.current && user) {
            socketRef.current.emit('friend:request-sent', {
                toUserId,
                fromUser: {
                    id: user.id,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                },
            });
        }
    }, [user]);

    const notifyFriendAccepted = useCallback((toUserId: string) => {
        if (socketRef.current && user) {
            socketRef.current.emit('friend:accepted', {
                toUserId,
                fromUser: {
                    id: user.id,
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                },
            });
        }
    }, [user]);

    const onDMReceived = useCallback((callback: (dm: DMReceivedEvent) => void) => {
        dmReceivedCallbackRef.current = callback;
    }, []);

    const onNotification = useCallback((callback: (notification: NotificationEvent) => void) => {
        notificationCallbackRef.current = callback;
    }, []);

    const onFriendRequestReceived = useCallback((callback: () => void) => {
        friendRequestCallbackRef.current = callback;
    }, []);

    const onInventoryUpdate = useCallback((callback: () => void) => {
        inventoryUpdateCallbackRef.current = callback;
    }, []);

    const onFriendStatusChange = useCallback((callback: (friendId: string, isOnline: boolean) => void) => {
        friendStatusChangeCallbackRef.current = callback;
    }, []);

    const onDMReaction = useCallback((callback: (dm: any) => void) => {
        dmReactionCallbackRef.current = callback;
        return () => {
            dmReactionCallbackRef.current = null;
        };
    }, []);

    const isFriendOnline = useCallback((friendId: string) => {
        return onlineFriends.has(friendId);
    }, [onlineFriends]);

    // Start watch activity
    const startActivity = useCallback((data: {
        roomCode: string;
        contentType: 'show' | 'movie' | 'anime';
        contentId: string;
        contentSlug?: string;
        contentTitle: string;
        contentPoster?: string;
        episodeTitle?: string;
    }) => {
        if (socketRef.current && user?.id) {
            socketRef.current.emit('activity:start', {
                userId: user.id,
                ...data,
            });
        }
    }, [user?.id]);

    // Stop watch activity
    const stopActivity = useCallback(() => {
        if (socketRef.current && user?.id) {
            socketRef.current.emit('activity:stop', { userId: user.id });
        }
    }, [user?.id]);

    // Request friend activities
    const requestFriendActivities = useCallback(() => {
        if (socketRef.current && user?.id) {
            socketRef.current.emit('friends:get-activities', { userId: user.id });
        }
    }, [user?.id]);

    // Get a specific friend's activity
    const getFriendActivity = useCallback((friendId: string) => {
        return friendActivities.get(friendId);
    }, [friendActivities]);

    const startTyping = useCallback((toUserId: string) => {
        if (socketRef.current && user?.id) {
            socketRef.current.emit('typing:start', {
                fromUserId: user.id,
                toUserId,
            });
        }
    }, [user?.id]);

    const stopTyping = useCallback((toUserId: string) => {
        if (socketRef.current && user?.id) {
            socketRef.current.emit('typing:stop', {
                fromUserId: user.id,
                toUserId,
            });
        }
    }, [user?.id]);

    return {
        socket: socketRef.current,
        isConnected,
        onlineFriends,
        friendActivities,
        typingFriends,
        isFriendOnline,
        getFriendActivity,
        startTyping,
        stopTyping,
        sendDM,
        notifyFriendRequest,
        notifyFriendAccepted,
        onDMReceived,
        onNotification,
        onFriendRequestReceived,
        startActivity,
        stopActivity,
        requestFriendActivities,
        onInventoryUpdate,
        onFriendStatusChange,
        onDMReaction
    };
}
