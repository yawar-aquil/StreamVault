import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { storage } from './storage';

// Watch activity tracking
interface WatchActivity {
    roomCode: string;
    contentType: 'show' | 'movie' | 'anime';
    contentId: string;
    contentTitle: string;
    contentPoster?: string;
    episodeTitle?: string;
    startedAt: Date;
}

// Track online users by their user ID
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs

// Track socket to user mapping
const socketToUser = new Map<string, string>(); // socketId -> userId

// Track user watch activity
const userActivities = new Map<string, WatchActivity>(); // userId -> WatchActivity

let io: Server;

export function initSocialSocket(server: HttpServer, socketio?: Server) {
    io = socketio || new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    const socialNamespace = io.of('/social');

    socialNamespace.on('connection', (socket: Socket) => {
        console.log('🤝 Social socket connected:', socket.id);

        // User comes online
        socket.on('user:online', async (data: { userId: string }) => {
            const { userId } = data;
            if (!userId) return;

            // Track socket connection
            socketToUser.set(socket.id, userId);

            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId)!.add(socket.id);

            // Join user's personal room for notifications
            socket.join(`user:${userId}`);

            // Notify friends that this user is online
            await notifyFriendsOfStatus(userId, true);

            console.log(`✅ User ${userId} is now online (${onlineUsers.get(userId)?.size} connections)`);
        });

        // Get online friends
        socket.on('friends:get-online', async (data: { userId: string }) => {
            const { userId } = data;
            if (!userId) return;

            try {
                const friends = await storage.getFriends(userId);
                const onlineFriends: string[] = [];

                for (const friend of friends) {
                    const friendId = friend.userId === userId ? friend.friendId : friend.userId;
                    if (onlineUsers.has(friendId) && onlineUsers.get(friendId)!.size > 0) {
                        onlineFriends.push(friendId);
                    }
                }

                socket.emit('friends:online-list', { onlineFriends });
            } catch (error) {
                console.error('Error getting online friends:', error);
            }
        });

        // Send DM in real-time
        socket.on('dm:send', async (data: { fromUserId: string; toUserId: string; message: string }) => {
            const { fromUserId, toUserId, message } = data;
            if (!fromUserId || !toUserId || !message) return;

            try {
                // Save message to storage
                const dm = await storage.sendMessage(fromUserId, toUserId, message);

                // Send to recipient if online
                socialNamespace.to(`user:${toUserId}`).emit('dm:received', {
                    ...dm,
                    fromUserId,
                });

                // Also send back to sender for confirmation
                socket.emit('dm:sent', dm);

                // Create notification
                const fromUser = await storage.getUserById(fromUserId);
                await storage.createNotification({
                    userId: toUserId,
                    type: 'dm',
                    title: 'New Message',
                    message: `${fromUser?.username || 'Someone'}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
                    data: { fromUserId },
                    read: false,
                });

                // Push notification to recipient
                socialNamespace.to(`user:${toUserId}`).emit('notification:new', {
                    type: 'dm',
                    fromUser: fromUser ? {
                        id: fromUser.id,
                        username: fromUser.username,
                        avatarUrl: fromUser.avatarUrl,
                        equippedBadge: (fromUser as any).equippedBadge
                    } : null,
                    message: message.substring(0, 100),
                });
            } catch (error) {
                console.error('Error sending DM:', error);
            }
        });

        // Typing indicators
        socket.on('typing:start', (data: { toUserId: string; fromUserId: string }) => {
            const { toUserId, fromUserId } = data;
            if (!toUserId || !fromUserId) return;
            socialNamespace.to(`user:${toUserId}`).emit('friend:typing', { friendId: fromUserId, isTyping: true });
        });

        socket.on('typing:stop', (data: { toUserId: string; fromUserId: string }) => {
            const { toUserId, fromUserId } = data;
            if (!toUserId || !fromUserId) return;
            socialNamespace.to(`user:${toUserId}`).emit('friend:typing', { friendId: fromUserId, isTyping: false });
        });

        // Friend request sent
        socket.on('friend:request-sent', async (data: { toUserId: string; fromUser: { id: string; username: string; avatarUrl?: string } }) => {
            const { toUserId, fromUser } = data;

            // Notify recipient in real-time
            socialNamespace.to(`user:${toUserId}`).emit('notification:new', {
                type: 'friend_request',
                fromUser,
                message: `${fromUser.username} sent you a friend request`,
            });
        });

        // Friend request accepted
        socket.on('friend:accepted', async (data: { toUserId: string; fromUser: { id: string; username: string; avatarUrl?: string } }) => {
            const { toUserId, fromUser } = data;

            // Notify the original requester
            socialNamespace.to(`user:${toUserId}`).emit('notification:new', {
                type: 'friend_accepted',
                fromUser,
                message: `${fromUser.username} accepted your friend request`,
            });

            // Also update their friend-online status
            socialNamespace.to(`user:${toUserId}`).emit('friend:online', {
                friendId: fromUser.id,
            });
        });

        // User starts watching something
        socket.on('activity:start', async (data: {
            userId: string;
            roomCode: string;
            contentType: 'show' | 'movie' | 'anime';
            contentId: string;
            contentTitle: string;
            contentPoster?: string;
            episodeTitle?: string;
        }) => {
            const { userId, roomCode, contentType, contentId, contentTitle, contentPoster, episodeTitle } = data;
            if (!userId) return;

            const activity: WatchActivity = {
                roomCode,
                contentType,
                contentId,
                contentTitle,
                contentPoster,
                episodeTitle,
                startedAt: new Date(),
            };

            userActivities.set(userId, activity);

            // Broadcast to online friends
            await broadcastActivityToFriends(userId, activity);

            console.log(`📺 User ${userId} started watching: ${contentTitle}`);
        });

        // User stops watching
        socket.on('activity:stop', async (data: { userId: string }) => {
            const { userId } = data;
            if (!userId) return;

            const hadActivity = userActivities.has(userId);
            userActivities.delete(userId);

            if (hadActivity) {
                // Notify friends that user stopped watching
                await broadcastActivityToFriends(userId, null);
                console.log(`⏹️ User ${userId} stopped watching`);
            }
        });

        // Get friends' current activities
        socket.on('friends:get-activities', async (data: { userId: string }) => {
            const { userId } = data;
            if (!userId) return;

            try {
                const friends = await storage.getFriends(userId);
                const activities: { friendId: string; username: string; avatarUrl?: string; equippedBadge?: string; activity: WatchActivity }[] = [];

                for (const friend of friends) {
                    const friendId = friend.userId === userId ? friend.friendId : friend.userId;
                    const activity = userActivities.get(friendId);

                    if (activity) {
                        const friendUser = await storage.getUserById(friendId);
                        activities.push({
                            friendId,
                            username: friendUser?.username || 'Unknown',
                            avatarUrl: friendUser?.avatarUrl || undefined,
                            equippedBadge: (friendUser as any)?.equippedBadge,
                            activity,
                        });
                    }
                }

                socket.emit('friends:activities', { activities });
            } catch (error) {
                console.error('Error getting friend activities:', error);
            }
        });

        // Disconnect handling
        socket.on('disconnect', async () => {
            const userId = socketToUser.get(socket.id);
            if (userId) {
                onlineUsers.get(userId)?.delete(socket.id);
                socketToUser.delete(socket.id);

                // If user has no more connections, they're offline
                if (!onlineUsers.get(userId) || onlineUsers.get(userId)!.size === 0) {
                    onlineUsers.delete(userId);

                    // Clear their watch activity and notify friends
                    const hadActivity = userActivities.has(userId);
                    userActivities.delete(userId);

                    if (hadActivity) {
                        // Notify friends that user stopped watching
                        await broadcastActivityToFriends(userId, null);
                        console.log(`⏹️ User ${userId} activity cleared on disconnect`);
                    }

                    await notifyFriendsOfStatus(userId, false);
                    console.log(`❌ User ${userId} is now offline`);
                }
            }
        });
    });

    console.log('🤝 Social Socket.io namespace initialized');
    return socialNamespace;
}

async function notifyFriendsOfStatus(userId: string, isOnline: boolean) {
    try {
        const friends = await storage.getFriends(userId);
        const user = await storage.getUserById(userId);

        for (const friend of friends) {
            const friendId = friend.userId === userId ? friend.friendId : friend.userId;

            // If friend is online, notify them
            if (onlineUsers.has(friendId)) {
                io.of('/social').to(`user:${friendId}`).emit(
                    isOnline ? 'friend:online' : 'friend:offline',
                    {
                        friendId: userId,
                        username: user?.username,
                        avatarUrl: user?.avatarUrl,
                        equippedBadge: (user as any)?.equippedBadge,
                    }
                );
            }
        }
    } catch (error) {
        console.error('Error notifying friends of status:', error);
    }
}

async function broadcastActivityToFriends(userId: string, activity: WatchActivity | null) {
    try {
        const friends = await storage.getFriends(userId);
        const user = await storage.getUserById(userId);

        for (const friend of friends) {
            const friendId = friend.userId === userId ? friend.friendId : friend.userId;

            // If friend is online, notify them
            if (onlineUsers.has(friendId)) {
                // Privacy Check: Only send if user allows it
                // We need to parse valid settings. Default to TRUE if not set.
                let isVisible = true;
                if (user?.privacySettings) {
                    try {
                        const settings = JSON.parse(user.privacySettings);
                        if (settings.friendActivityVisible === false) isVisible = false;
                    } catch (e) { }
                }

                if (isVisible) {
                    io.of('/social').to(`user:${friendId}`).emit('friend:activity', {
                        friendId: userId,
                        username: user?.username,
                        avatarUrl: user?.avatarUrl,
                        equippedBadge: (user as any)?.equippedBadge,
                        activity,
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error broadcasting activity to friends:', error);
    }
}

export function isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

export function getOnlineUserCount(): number {
    return onlineUsers.size;
}

export function sendNotificationToUser(userId: string, notification: any) {
    if (io) {
        io.of('/social').to(`user:${userId}`).emit('notification:new', notification);
    }
}

export function sendInventoryUpdate(userId: string) {
    if (io) {
        io.of('/social').to(`user:${userId}`).emit('inventory_update');
    }
}

export async function broadcastNewActivity(activity: any) {
    if (!io) return;
    try {
        const friends = await storage.getFriends(activity.userId);
        const user = await storage.getUserById(activity.userId);

        let metadata = activity.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch (e) {
                // Keep as is if parsing fails
            }
        }

        const enrichedActivity = {
            ...activity,
            metadata,
            user: user ? { username: user.username, avatarUrl: user.avatarUrl } : null,
            commentsCount: 0,
            likesCount: 0,
            likedByMe: false
        };

        for (const friend of friends) {
            const friendId = friend.userId === activity.userId ? friend.friendId : friend.userId;

            // If friend is online, notify them
            if (onlineUsers.has(friendId)) {
                // Privacy Check: Only send if user allows it
                let isVisible = true;
                if (user?.privacySettings) {
                    try {
                        const settings = JSON.parse(user.privacySettings);
                        if (settings.friendActivityVisible === false) isVisible = false;
                    } catch (e) { }
                }

                if (isVisible) {
                    io.of('/social').to(`user:${friendId}`).emit('activity:new', enrichedActivity);
                }
            }
        }

        // Also emit to self so the feed updates instantly for the user too
        if (onlineUsers.has(activity.userId)) {
            io.of('/social').to(`user:${activity.userId}`).emit('activity:new', enrichedActivity);
        }

    } catch (error) {
        console.error('Error broadcasting new activity:', error);
    }
}
