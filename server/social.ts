import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { storage } from './storage';
import { InsertActivity, WatchActivity as SchemaWatchActivity } from '@shared/schema';

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
                        equippedBadge: fromUser.badges ? JSON.parse(typeof fromUser.badges === 'string' ? fromUser.badges : JSON.stringify(fromUser.badges)).find((b: any) => b.equipped) : undefined
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

            // Log activity: Friend Connection
            try {
                // For the user who accepted (fromUser / sender of this event likely, wait, fromUser is usually the one who triggerred this?)
                // Actually 'friend:accepted' is usually sent by the person who clicked "Accept".
                // Let's assume the socket belongs to the "Acceptor".
                const acceptorId = socketToUser.get(socket.id);
                if (acceptorId) {
                    await logAndBroadcastActivity({
                        userId: acceptorId,
                        type: 'friend_connect',
                        entityId: toUserId,
                        entityType: 'user',
                        metadata: JSON.stringify({ friendUsername: (await storage.getUserById(toUserId))?.username })
                    });
                }
            } catch (e) {
                console.error("Failed to log friend_connect activity", e);
            }
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

            // Log activity: Watch Start (Community Feed)
            try {
                await logAndBroadcastActivity({
                    userId,
                    type: 'watch_start',
                    entityId: contentId,
                    entityType: contentType,
                    metadata: JSON.stringify({
                        title: contentTitle,
                        posterUrl: contentPoster,
                        episode: episodeTitle,
                        link: contentType === 'movie' ? `/movie/${contentId}` : contentType === 'anime' ? `/anime/${contentId}` : `/show/${contentId}`
                    })
                });
            } catch (e) {
                console.error("Failed to log watch_start activity", e);
            }

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
                const activities: { friendId: string; username: string; avatarUrl?: string; equippedBadge?: any; activity: WatchActivity }[] = [];

                for (const friend of friends) {
                    const friendId = friend.userId === userId ? friend.friendId : friend.userId;
                    const activity = userActivities.get(friendId);

                    if (activity) {
                        const friendUser = await storage.getUserById(friendId);
                        activities.push({
                            friendId,
                            username: friendUser?.username || 'Unknown',
                            avatarUrl: friendUser?.avatarUrl || undefined,
                            equippedBadge: friendUser?.badges ? JSON.parse(typeof friendUser.badges === 'string' ? friendUser.badges : JSON.stringify(friendUser.badges)).find((b: any) => b.equipped) : undefined,
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

        // ============= VOICE CALL SIGNALING =============

        // Initiate a voice call to a friend
        socket.on('call:initiate', async (data: { toUserId: string; fromUserId: string; fromUsername: string; fromAvatar?: string }) => {
            console.log(`📞 Call initiated: ${data.fromUserId} -> ${data.toUserId}`);

            // Check if target user is online
            if (!onlineUsers.has(data.toUserId)) {
                socket.emit('call:error', { message: 'User is offline' });
                return;
            }

            // Send incoming call notification to the target user
            io.of('/social').to(`user:${data.toUserId}`).emit('call:incoming', {
                fromUserId: data.fromUserId,
                fromUsername: data.fromUsername,
                fromAvatar: data.fromAvatar,
            });
        });

        // Accept an incoming call
        socket.on('call:accept', (data: { toUserId: string; fromUserId: string }) => {
            console.log(`✅ Call accepted: ${data.fromUserId} accepted call from ${data.toUserId}`);
            io.of('/social').to(`user:${data.toUserId}`).emit('call:accepted', {
                fromUserId: data.fromUserId,
            });
        });

        // Decline an incoming call
        socket.on('call:decline', async (data: { toUserId: string; fromUserId: string; declinedByName?: string }) => {
            console.log(`❌ Call declined: ${data.fromUserId} declined call from ${data.toUserId}`);
            io.of('/social').to(`user:${data.toUserId}`).emit('call:declined', {
                fromUserId: data.fromUserId,
            });

            // Save missed call message to database (visible to both users)
            try {
                const missedCallMsg = await storage.sendMessage(
                    data.toUserId,   // The caller (who initiated the call) is the "from"
                    data.fromUserId, // The recipient (who declined) is the "to"
                    'Missed voice call',
                    'call' // Special attachment type for call logs
                );

                // Notify both users about the new call log message
                io.of('/social').to(`user:${data.toUserId}`).emit('dm:received', missedCallMsg);
                io.of('/social').to(`user:${data.fromUserId}`).emit('dm:received', missedCallMsg);
            } catch (error) {
                console.error('Failed to save missed call message:', error);
            }
        });

        // End an active call
        socket.on('call:end', (data: { toUserId: string; fromUserId: string }) => {
            console.log(`📴 Call ended between ${data.fromUserId} and ${data.toUserId}`);
            io.of('/social').to(`user:${data.toUserId}`).emit('call:ended', {
                fromUserId: data.fromUserId,
            });
        });

        // WebRTC Signaling: Send SDP offer
        socket.on('call:offer', (data: { toUserId: string; fromUserId: string; offer: RTCSessionDescriptionInit }) => {
            io.of('/social').to(`user:${data.toUserId}`).emit('call:offer', {
                fromUserId: data.fromUserId,
                offer: data.offer,
            });
        });

        // WebRTC Signaling: Send SDP answer
        socket.on('call:answer', (data: { toUserId: string; fromUserId: string; answer: RTCSessionDescriptionInit }) => {
            io.of('/social').to(`user:${data.toUserId}`).emit('call:answer', {
                fromUserId: data.fromUserId,
                answer: data.answer,
            });
        });

        // WebRTC Signaling: Send ICE candidate
        socket.on('call:ice-candidate', (data: { toUserId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => {
            io.of('/social').to(`user:${data.toUserId}`).emit('call:ice-candidate', {
                fromUserId: data.fromUserId,
                candidate: data.candidate,
            });
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
                        equippedBadge: user?.badges ? JSON.parse(typeof user.badges === 'string' ? user.badges : JSON.stringify(user.badges)).find((b: any) => b.equipped) : undefined,
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
        const user = await storage.getUserById(userId);

        // Respect user's activity visibility setting
        if (user?.activityVisible === false) {
            // User has disabled activity sharing, send null activity to clear any existing display
            activity = null;
        }

        const friends = await storage.getFriends(userId);

        const badges = user?.badges ? JSON.parse(typeof user.badges === 'string' ? user.badges : JSON.stringify(user.badges)) : [];
        const equippedBadge = badges.find((b: any) => b.equipped);

        for (const friend of friends) {
            const friendId = friend.userId === userId ? friend.friendId : friend.userId;

            // If friend is online, notify them
            if (onlineUsers.has(friendId)) {
                io.of('/social').to(`user:${friendId}`).emit('friend:activity', {
                    friendId: userId,
                    username: user?.username,
                    avatarUrl: user?.avatarUrl,
                    equippedBadge: equippedBadge,
                    activity,
                });
            }
        }

        console.log(`📡 Broadcasted activity for user ${userId} to ${friends.length} friends`);
    } catch (error) {
        console.error('Error broadcasting activity:', error);
    }
}

// Helper to log and broadcast activity to public feed
export async function logAndBroadcastActivity(activityData: InsertActivity) {
    try {
        const activity = await storage.createActivity(activityData);
        // Get user details for the feed
        const user = await storage.getUserById(activity.userId);

        let equippedBadges: any[] = [];
        if (user) {
            const userBadges = await storage.getUserBadges(user.id);
            equippedBadges = userBadges
                .filter(ub => ub.equipped &&
                    ub.badge.category !== 'theme' &&
                    ub.badge.category !== 'skin' &&
                    !ub.badge.name.includes('Skin') &&
                    ub.badge.category !== 'feature'
                )
                .map(ub => ub.badge);
        }

        const feedItem = { ...activity, user: user ? { ...user, equippedBadges } : undefined };

        // Broadcast to ALL connected users (public feed)
        // We broadcast to the '/social' namespace generally? Or maybe a specific room?
        // Let's broadcast to everyone connected to /social for now.
        if (io) {
            io.of('/social').emit('feed:new', feedItem);
        }

        return activity;
    } catch (error) {
        console.error('Error logging activity:', error);
        throw error;
    }
}


export function isUserOnline(userId: string): boolean {
    return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

export function getOnlineUsers(): string[] {
    return Array.from(onlineUsers.keys());
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

export function emitDMReceived(toUserId: string, dm: { id: string; fromUserId: string; message: string; createdAt: string }) {
    if (io) {
        io.of('/social').to(`user:${toUserId}`).emit('dm:received', dm);
    }
}
