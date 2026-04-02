import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logAndBroadcastActivity } from './social';
import { storage } from './storage';

// Types
interface User {
    id: string;
    sessionId: string; // Persistent session ID for reconnection
    username: string;
    avatarUrl?: string;
    authUserId?: string; // Actual authenticated user ID from database (for friend requests)
    badges?: any[];
    isHost: boolean;
    isMuted: boolean;
}

interface VideoState {
    isPlaying: boolean;
    currentTime: number;
    lastUpdate: number;
    playbackRate: number;
    currentSubtitleIndex: number;
}

interface Room {
    id: string;
    code: string;
    hostId: string;
    hostSessionId: string; // Host's session ID for reconnection
    hostUsername: string; // Host's display name
    contentType: 'show' | 'movie' | 'anime';
    contentId: string;
    contentTitle: string; // Title of the content being watched
    contentPoster?: string; // Poster URL for display
    episodeId?: string;
    episodeTitle?: string; // Episode title if watching a show
    isPublic: boolean; // Public rooms visible to everyone
    password?: string; // Password for private rooms
    description?: string; // Optional description/notes for the party
    scheduledFor?: Date; // Optional scheduled start time for the party
    hostJoinedAt?: number; // Timestamp when host first joined (for scheduled rooms)
    users: Map<string, User>;
    videoState: VideoState;
    createdAt: Date;
    hostDisconnectedAt?: number; // Timestamp when host disconnected (for grace period)
    destroyTimeout?: NodeJS.Timeout; // Timeout to destroy room after host disconnect
}

interface ChatMessage {
    id: string;
    username: string;
    avatarUrl?: string;
    badges?: any[];
    message: string;
    timestamp: Date;
}

// Poll feature interfaces
interface PollOption {
    id: string;
    text: string;
    votes: Set<string>; // Set of user IDs who voted for this option
}

interface Poll {
    id: string;
    roomCode: string;
    question: string;
    options: PollOption[];
    createdBy: string; // User ID who created the poll
    createdAt: Date;
    isActive: boolean;
    expiresAt?: Date; // Optional expiration time
}

// In-memory room storage
const rooms = new Map<string, Room>();
const userToRoom = new Map<string, string>(); // socketId -> roomCode
const sessionToRoom = new Map<string, string>(); // sessionId -> roomCode (for reconnection)
const roomPolls = new Map<string, Poll[]>(); // roomCode -> polls

// Host reconnection grace period (2 minutes)
const HOST_GRACE_PERIOD_MS = 2 * 60 * 1000;

// Scheduled room: wait 10 minutes for host after scheduled time before deleting
const SCHEDULED_ROOM_HOST_WAIT_MS = 10 * 60 * 1000;

// Generate 6-character room code
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

// Export function to get active rooms for HTTP API
export function getActiveRooms() {
    return Array.from(rooms.values()).map(room => ({
        id: room.id,
        code: room.code,
        hostUsername: room.hostUsername,
        contentType: room.contentType,
        contentId: room.contentId,
        contentTitle: room.contentTitle,
        contentPoster: room.contentPoster,
        episodeId: room.episodeId,
        episodeTitle: room.episodeTitle,
        isPublic: room.isPublic,
        hasPassword: !room.isPublic && !!room.password,
        description: room.description,
        scheduledFor: room.scheduledFor,
        userCount: room.users.size,
        createdAt: room.createdAt,
    }));
}

export function checkRoomExists(code: string): boolean {
    return rooms.has(code.toUpperCase());
}

export function setupWatchTogether(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        path: '/watch-together-socket'
    });

    const watchNamespace = io.of('/watch-together');

    watchNamespace.on('connection', (socket: Socket) => {
        console.log(`🎬 Watch Together: User connected ${socket.id}`);

        // Get list of active rooms (for watch-rooms page)
        socket.on('rooms:list', () => {
            const roomsList = Array.from(rooms.values()).map(room => ({
                id: room.id,
                code: room.code,
                hostUsername: room.hostUsername,
                contentType: room.contentType,
                contentId: room.contentId,
                contentTitle: room.contentTitle,
                contentPoster: room.contentPoster,
                episodeId: room.episodeId,
                episodeTitle: room.episodeTitle,
                isPublic: room.isPublic,
                hasPassword: !room.isPublic && !!room.password,
                description: room.description,
                scheduledFor: room.scheduledFor,
                userCount: room.users.size,
                createdAt: room.createdAt,
            }));
            socket.emit('rooms:list', roomsList);
        });

        // Create a new room
        socket.on('room:create', (data: {
            contentType: 'show' | 'movie' | 'anime';
            contentId: string;
            contentTitle: string;
            contentPoster?: string;
            episodeId?: string;
            episodeTitle?: string;
            username: string;
            avatarUrl?: string;
            sessionId: string;
            isPublic: boolean;
            password?: string;
            description?: string;
            scheduledFor?: string; // ISO date string
            authUserId?: string;
        }) => {
            // Check if user already has an active room with this session
            const existingRoomCode = sessionToRoom.get(data.sessionId);
            if (existingRoomCode) {
                const existingRoom = rooms.get(existingRoomCode);
                if (existingRoom && existingRoom.hostSessionId === data.sessionId) {
                    // Host reconnecting - restore their session
                    console.log(`🎬 Host reconnecting to room ${existingRoomCode}`);

                    // Cancel destroy timeout if pending
                    if (existingRoom.destroyTimeout) {
                        clearTimeout(existingRoom.destroyTimeout);
                        existingRoom.destroyTimeout = undefined;
                        existingRoom.hostDisconnectedAt = undefined;
                    }

                    // Update host's socket ID
                    const oldHostId = existingRoom.hostId;
                    existingRoom.hostId = socket.id;

                    // Update user entry
                    existingRoom.users.delete(oldHostId);
                    const user: User = {
                        id: socket.id,
                        sessionId: data.sessionId,
                        username: data.username,
                        isHost: true,
                        isMuted: false,
                        badges: existingRoom.users.get(oldHostId)?.badges
                    };
                    existingRoom.users.set(socket.id, user);

                    userToRoom.set(socket.id, existingRoomCode);
                    socket.join(existingRoomCode);

                    // Send room info to reconnecting host
                    socket.emit('room:joined', {
                        roomId: existingRoom.id,
                        roomCode: existingRoom.code,
                        contentType: existingRoom.contentType,
                        contentId: existingRoom.contentId,
                        contentTitle: existingRoom.contentTitle,
                        contentPoster: existingRoom.contentPoster,
                        episodeId: existingRoom.episodeId,
                        episodeTitle: existingRoom.episodeTitle,
                        users: Array.from(existingRoom.users.values()),
                        videoState: existingRoom.videoState,
                        user
                    });

                    // Notify others that host reconnected
                    socket.to(existingRoomCode).emit('room:host-reconnected', { user });
                    console.log(`🎬 Host ${data.username} reconnected to room ${existingRoomCode}`);
                    return;
                }
            }

            let code = generateRoomCode();
            while (rooms.has(code)) {
                code = generateRoomCode();
            }

            const room: Room = {
                id: generateId(),
                code,
                hostId: socket.id,
                hostSessionId: data.sessionId,
                hostUsername: data.username,
                contentType: data.contentType,
                contentId: data.contentId,
                contentTitle: data.contentTitle,
                contentPoster: data.contentPoster,
                episodeId: data.episodeId,
                episodeTitle: data.episodeTitle,
                isPublic: data.isPublic,
                password: data.isPublic ? undefined : data.password,
                description: data.description,
                scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
                hostJoinedAt: Date.now(), // Track when host joined
                users: new Map(),
                videoState: {
                    isPlaying: false,
                    currentTime: 0,
                    lastUpdate: Date.now(),
                    playbackRate: 1,
                    currentSubtitleIndex: 0
                },
                createdAt: new Date()
            };

            const user: User = {
                id: socket.id,
                sessionId: data.sessionId,
                username: data.username,
                avatarUrl: data.avatarUrl,
                authUserId: data.authUserId, // Actual user ID from auth system
                isHost: true,
                isMuted: false
            };

            // Fetch latest badge if authenticated
            // Fetch latest badge if authenticated
            if (data.authUserId) {
                storage.getUserBadges(data.authUserId).then(userBadges => {
                    const equipped = userBadges.filter(ub => ub.equipped).map(ub => ({
                        id: ub.badge.id,
                        name: ub.badge.name,
                        imageUrl: ub.badge.imageUrl,
                        equipped: true,
                        equippedAt: ub.equippedAt
                    }));

                    if (equipped.length > 0) {
                        user.badges = equipped;
                        watchNamespace.to(room.code).emit('room:user-updated', { user });
                    }
                });
            }

            room.users.set(socket.id, user);
            rooms.set(code, room);
            userToRoom.set(socket.id, code);
            sessionToRoom.set(data.sessionId, code);

            socket.join(code);
            socket.emit('room:created', {
                roomId: room.id,
                roomCode: code,
                contentType: room.contentType,
                contentId: room.contentId,
                contentTitle: room.contentTitle,
                contentPoster: room.contentPoster,
                episodeId: room.episodeId,
                episodeTitle: room.episodeTitle,
                description: room.description,
                scheduledFor: room.scheduledFor?.toISOString(),
                user,
                videoState: room.videoState
            });

            console.log(`🎬 Room created: ${code} by ${data.username}`);

            // Log activity: Room Created
            if (data.authUserId) {
                try {
                    logAndBroadcastActivity({
                        userId: data.authUserId,
                        type: 'room_created',
                        entityId: room.id,
                        entityType: 'room',
                        metadata: JSON.stringify({
                            title: room.contentTitle,
                            posterUrl: room.contentPoster,
                            roomCode: room.code,
                            contentType: room.contentType,
                            link: `/watch-party/${room.code}` // Add link for feed click
                        })
                    });
                } catch (e) {
                    console.error("Failed to log room_created activity", e);
                }
            }
        });

        // Join an existing room
        socket.on('room:join', (data: { roomCode: string; username: string; avatarUrl?: string; sessionId: string; password?: string; authUserId?: string }) => {
            const room = rooms.get(data.roomCode.toUpperCase());

            if (!room) {
                socket.emit('room:error', { message: 'Room not found' });
                return;
            }

            // Validate password for private rooms (unless it's the host reconnecting)
            const isHostReconnecting = room.hostSessionId === data.sessionId;
            if (!room.isPublic && !isHostReconnecting && room.password) {
                if (!data.password || data.password !== room.password) {
                    socket.emit('room:error', { message: 'Invalid password' });
                    return;
                }
            }

            // Check if this is the HOST reconnecting (matches hostSessionId)
            // (isHostReconnecting already declared above)

            if (isHostReconnecting) {
                console.log(`🎬 Host reconnecting to room ${room.code} via join`);

                // Cancel destroy timeout if pending
                if (room.destroyTimeout) {
                    clearTimeout(room.destroyTimeout);
                    room.destroyTimeout = undefined;
                    room.hostDisconnectedAt = undefined;
                    console.log(`🎬 Cancelled room destruction for ${room.code}`);
                }

                // Update host's socket ID
                room.hostId = socket.id;
            }

            // Check if this session was previously in this room (reconnection)
            const previousRoom = sessionToRoom.get(data.sessionId);
            const isReconnecting = previousRoom === room.code;

            // Check if this is a reconnection (same session ID still in room for non-host users)
            let existingUser: User | undefined;
            room.users.forEach((user, oldSocketId) => {
                if (user.sessionId === data.sessionId) {
                    existingUser = user;
                    // Remove old socket entry
                    room.users.delete(oldSocketId);
                    userToRoom.delete(oldSocketId);
                }
            });

            const user: User = {
                id: socket.id,
                sessionId: data.sessionId,
                username: data.username,
                avatarUrl: data.avatarUrl,
                authUserId: data.authUserId, // Actual user ID from auth system
                isHost: isHostReconnecting || (existingUser?.isHost ?? false),
                isMuted: existingUser?.isMuted || false
            };

            // Fetch latest badge if authenticated
            if (data.authUserId) {
                storage.getUserBadges(data.authUserId).then(userBadges => {
                    const equipped = userBadges.filter(ub => ub.equipped).map(ub => ({
                        id: ub.badge.id,
                        name: ub.badge.name,
                        imageUrl: ub.badge.imageUrl,
                        equipped: true,
                        equippedAt: ub.equippedAt
                    }));

                    if (equipped.length > 0) {
                        user.badges = equipped;
                        watchNamespace.to(room.code).emit('room:user-updated', { user });
                    }
                });
            } else if (existingUser?.badges) {
                user.badges = existingUser.badges;
            }

            room.users.set(socket.id, user);
            userToRoom.set(socket.id, room.code);
            sessionToRoom.set(data.sessionId, room.code);

            socket.join(room.code);

            // Send room info to joining user
            socket.emit('room:joined', {
                roomId: room.id,
                roomCode: room.code,
                contentType: room.contentType,
                contentId: room.contentId,
                contentTitle: room.contentTitle,
                contentPoster: room.contentPoster,
                episodeId: room.episodeId,
                episodeTitle: room.episodeTitle,
                description: room.description,
                scheduledFor: room.scheduledFor?.toISOString(),
                users: Array.from(room.users.values()),
                videoState: room.videoState,
                user
            });

            // Notify others in room - use isReconnecting OR existingUser to detect reconnection
            if (isHostReconnecting) {
                console.log(`🎬 Host ${data.username} reconnected to room ${room.code}`);
                socket.to(room.code).emit('room:host-reconnected', { user });
            } else if (existingUser || isReconnecting) {
                console.log(`🎬 ${data.username} reconnected to room ${room.code}`);
                socket.to(room.code).emit('room:user-reconnected', { user });
            } else {
                console.log(`🎬 ${data.username} joined room ${room.code}`);
                socket.to(room.code).emit('room:user-joined', { user });
            }
        });

        // Leave room
        socket.on('room:leave', () => {
            handleUserLeave(socket);
        });

        // Video sync events (host only)
        socket.on('video:play', (data: { currentTime: number }) => {
            const roomCode = userToRoom.get(socket.id);
            console.log('🎬 Server received video:play from', socket.id, 'roomCode:', roomCode, 'time:', data.currentTime);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) {
                console.log('🎬 video:play rejected - room:', !!room, 'isHost:', room?.hostId === socket.id);
                return;
            }

            room.videoState = {
                isPlaying: true,
                currentTime: data.currentTime,
                lastUpdate: Date.now(),
                playbackRate: room.videoState.playbackRate,
                currentSubtitleIndex: room.videoState.currentSubtitleIndex
            };

            console.log('🎬 Broadcasting video:sync to room', roomCode, room.videoState);
            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        socket.on('video:pause', (data: { currentTime: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState = {
                isPlaying: false,
                currentTime: data.currentTime,
                lastUpdate: Date.now(),
                playbackRate: room.videoState.playbackRate,
                currentSubtitleIndex: room.videoState.currentSubtitleIndex
            };

            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        socket.on('video:seek', (data: { currentTime: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState.currentTime = data.currentTime;
            room.videoState.lastUpdate = Date.now();

            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        socket.on('video:playbackRate', (data: { rate: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState.playbackRate = data.rate;
            room.videoState.lastUpdate = Date.now();

            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        // Request current video state (for late joiners/reconnect)
        socket.on('video:request-state', () => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            socket.emit('video:sync', room.videoState);
        });

        // Subtitle sync (host only) - broadcast subtitle changes to all room users
        socket.on('video:subtitle', (data: { subtitleIndex: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) return;

            room.videoState.currentSubtitleIndex = data.subtitleIndex;
            room.videoState.lastUpdate = Date.now();

            console.log(`🎬 Host changed subtitle to index ${data.subtitleIndex} in room ${roomCode}`);
            // Broadcast to all other users in room
            socket.to(roomCode).emit('video:subtitle', { subtitleIndex: data.subtitleIndex });
            socket.to(roomCode).emit('video:sync', room.videoState);
        });

        // Change content (episode/movie) - host only
        socket.on('video:change-content', (data: { episodeId?: string; contentId?: string; contentType?: 'show' | 'movie' }) => {
            const roomCode = userToRoom.get(socket.id);
            console.log('🎬 Server received video:change-content from', socket.id, 'data:', data);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room || room.hostId !== socket.id) {
                console.log('🎬 video:change-content rejected - not host');
                return;
            }

            // Update room content
            if (data.episodeId) {
                room.episodeId = data.episodeId;
            }
            if (data.contentId) {
                room.contentId = data.contentId;
            }
            if (data.contentType) {
                room.contentType = data.contentType;
            }

            // Reset video state for new content
            room.videoState = {
                isPlaying: false,
                currentTime: 0,
                lastUpdate: Date.now(),
                playbackRate: 1,
                currentSubtitleIndex: 0
            };

            // Broadcast content change to all users including host
            const contentChangeData = {
                episodeId: room.episodeId,
                contentId: room.contentId,
                contentType: room.contentType,
                videoState: room.videoState
            };

            console.log('🎬 Broadcasting content:changed to room', roomCode, contentChangeData);
            io.of('/watch-together').to(roomCode).emit('content:changed', contentChangeData);
        });


        // Chat messages
        socket.on('chat:message', (data: { message: string }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            if (!user) return;

            const chatMessage: ChatMessage = {
                id: generateId(),
                username: user.username,
                avatarUrl: user.avatarUrl,
                badges: user.badges,
                message: data.message,
                timestamp: new Date()
            };

            watchNamespace.to(roomCode).emit('chat:receive', chatMessage);
        });

        // Emoji reactions
        socket.on('reaction:send', (data: { emoji: string }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            if (!user) return;

            watchNamespace.to(roomCode).emit('reaction:show', {
                username: user.username,
                emoji: data.emoji,
                id: generateId()
            });
        });

        // Voice chat signaling (WebRTC)
        socket.on('voice:signal', (data: { targetId: string; signal: any }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) {
                console.log(`🔇 Voice signal rejected: ${socket.id} not in a room`);
                return;
            }

            console.log(`📡 Voice signal from ${socket.id} to ${data.targetId}`);

            // Send signal directly to target socket using namespace
            watchNamespace.to(data.targetId).emit('voice:signal', {
                fromId: socket.id,
                signal: data.signal
            });
        });

        // Broadcast speaking state to all users in room
        socket.on('voice:speaking', (data: { isSpeaking: boolean }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;

            // Broadcast to all other users in the room
            socket.to(roomCode).emit('voice:user-speaking', {
                userId: socket.id,
                isSpeaking: data.isSpeaking
            });
        });

        socket.on('voice:toggle-mute', (data: { isMuted: boolean }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            if (user) {
                user.isMuted = data.isMuted;
                watchNamespace.to(roomCode).emit('room:user-updated', { user });
            }
        });

        // Host can mute/unmute other participants
        socket.on('voice:host-mute', (data: { targetUserId: string; isMuted: boolean }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            // Check if sender is host
            if (room.hostId !== socket.id) {
                socket.emit('room:error', { message: 'Only host can mute others' });
                return;
            }

            const targetUser = room.users.get(data.targetUserId);
            if (targetUser) {
                targetUser.isMuted = data.isMuted;
                watchNamespace.to(roomCode).emit('room:user-updated', { user: targetUser });
                // Notify the muted user
                watchNamespace.to(data.targetUserId).emit('voice:muted-by-host', {
                    isMuted: data.isMuted
                });
                console.log(`🎬 Host ${data.isMuted ? 'muted' : 'unmuted'} ${targetUser.username}`);
            }
        });

        // ============================================
        // POLL FEATURE SOCKET EVENTS
        // ============================================

        // Create a new poll (host only)
        socket.on('poll:create', (data: { question: string; options: string[]; expiresInMinutes?: number }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            // Only host can create polls
            if (room.hostId !== socket.id) {
                socket.emit('poll:error', { message: 'Only the host can create polls' });
                return;
            }

            if (!data.question || !data.options || data.options.length < 2) {
                socket.emit('poll:error', { message: 'Poll must have a question and at least 2 options' });
                return;
            }

            const pollId = generateId();
            const poll: Poll = {
                id: pollId,
                roomCode,
                question: data.question,
                options: data.options.map(text => ({
                    id: generateId(),
                    text,
                    votes: new Set<string>()
                })),
                createdBy: socket.id,
                createdAt: new Date(),
                isActive: true,
                expiresAt: data.expiresInMinutes ? new Date(Date.now() + data.expiresInMinutes * 60 * 1000) : undefined
            };

            // Store poll
            if (!roomPolls.has(roomCode)) {
                roomPolls.set(roomCode, []);
            }
            roomPolls.get(roomCode)!.push(poll);

            // Broadcast to room
            const pollData = {
                id: poll.id,
                question: poll.question,
                options: poll.options.map(o => ({
                    id: o.id,
                    text: o.text,
                    voteCount: o.votes.size
                })),
                isActive: poll.isActive,
                createdAt: poll.createdAt,
                expiresAt: poll.expiresAt
            };

            watchNamespace.to(roomCode).emit('poll:created', pollData);
            console.log(`📊 Poll created in room ${roomCode}: "${data.question}"`);
        });

        // Vote on a poll
        socket.on('poll:vote', (data: { pollId: string; optionId: string }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;

            const polls = roomPolls.get(roomCode);
            if (!polls) return;

            const poll = polls.find(p => p.id === data.pollId);
            if (!poll || !poll.isActive) {
                socket.emit('poll:error', { message: 'Poll not found or already closed' });
                return;
            }

            // Check if poll expired
            if (poll.expiresAt && new Date() > poll.expiresAt) {
                poll.isActive = false;
                socket.emit('poll:error', { message: 'Poll has expired' });
                return;
            }

            // Remove any previous vote from this user
            poll.options.forEach(o => o.votes.delete(socket.id));

            // Add new vote
            const option = poll.options.find(o => o.id === data.optionId);
            if (option) {
                option.votes.add(socket.id);

                // Broadcast updated results
                const pollData = {
                    id: poll.id,
                    question: poll.question,
                    options: poll.options.map(o => ({
                        id: o.id,
                        text: o.text,
                        voteCount: o.votes.size
                    })),
                    isActive: poll.isActive
                };
                watchNamespace.to(roomCode).emit('poll:updated', pollData);
                console.log(`📊 Vote cast in poll ${poll.id} by ${socket.id}`);
            }
        });

        // Close a poll (host only)
        socket.on('poll:close', (data: { pollId: string }) => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;
            const room = rooms.get(roomCode);
            if (!room) return;

            // Only host can close polls
            if (room.hostId !== socket.id) {
                socket.emit('poll:error', { message: 'Only the host can close polls' });
                return;
            }

            const polls = roomPolls.get(roomCode);
            if (!polls) return;

            const poll = polls.find(p => p.id === data.pollId);
            if (poll) {
                poll.isActive = false;
                watchNamespace.to(roomCode).emit('poll:closed', { pollId: poll.id });
                console.log(`📊 Poll closed: ${poll.id}`);
            }
        });

        // Get active polls for room
        socket.on('poll:get', () => {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;

            const polls = roomPolls.get(roomCode) || [];
            const activePolls = polls.filter(p => p.isActive).map(poll => ({
                id: poll.id,
                question: poll.question,
                options: poll.options.map(o => ({
                    id: o.id,
                    text: o.text,
                    voteCount: o.votes.size
                })),
                isActive: poll.isActive,
                createdAt: poll.createdAt,
                expiresAt: poll.expiresAt
            }));

            socket.emit('poll:list', activePolls);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            handleUserLeave(socket);
            console.log(`🎬 Watch Together: User disconnected ${socket.id}`);
        });

        function handleUserLeave(socket: Socket) {
            const roomCode = userToRoom.get(socket.id);
            if (!roomCode) return;

            const room = rooms.get(roomCode);
            if (!room) return;

            const user = room.users.get(socket.id);
            const wasHost = room.hostId === socket.id;

            room.users.delete(socket.id);
            userToRoom.delete(socket.id);
            socket.leave(roomCode);

            // If host left, start grace period instead of immediately destroying
            if (wasHost && user) {
                const now = Date.now();
                const scheduledTime = room.scheduledFor?.getTime();
                const isScheduledRoom = !!scheduledTime;
                const isAfterScheduledTime = !scheduledTime || now >= scheduledTime;
                const hostJoinedAfterScheduledTime = room.hostJoinedAt && scheduledTime && room.hostJoinedAt >= scheduledTime;

                // Determine grace period based on room type and state
                let gracePeriod: number;
                if (isScheduledRoom && !isAfterScheduledTime) {
                    // Scheduled room but time hasn't arrived - DON'T DELETE, just wait
                    console.log(`🎬 Host disconnected from scheduled room ${roomCode}, waiting for scheduled time`);
                    room.hostDisconnectedAt = now;

                    // Notify others
                    watchNamespace.to(roomCode).emit('room:host-disconnected', {
                        message: 'Host disconnected. Room will start at scheduled time.',
                        gracePeriodMs: null // No destruction countdown
                    });
                    return; // Don't set destroy timeout
                } else if (isScheduledRoom && isAfterScheduledTime && !hostJoinedAfterScheduledTime) {
                    // Scheduled room, time arrived, host never joined - 10 min wait
                    gracePeriod = SCHEDULED_ROOM_HOST_WAIT_MS;
                    console.log(`🎬 Host disconnected from scheduled room ${roomCode} (never joined after schedule), waiting 10min`);
                } else {
                    // Normal room OR scheduled room where host joined after scheduled time - 2 min rule
                    gracePeriod = HOST_GRACE_PERIOD_MS;
                    console.log(`🎬 Host disconnected from room ${roomCode}, starting ${gracePeriod / 1000}s grace period`);
                }

                room.hostDisconnectedAt = now;

                // Notify others that host disconnected (but room still active)
                watchNamespace.to(roomCode).emit('room:host-disconnected', {
                    message: 'Host disconnected. Waiting for reconnection...',
                    gracePeriodMs: gracePeriod
                });

                // Set timeout to destroy room if host doesn't reconnect
                room.destroyTimeout = setTimeout(() => {
                    // Check if host reconnected
                    if (room.hostDisconnectedAt) {
                        watchNamespace.to(roomCode).emit('room:destroyed', {
                            message: 'Host did not reconnect in time'
                        });

                        // Clean up session mappings for all users
                        room.users.forEach(u => {
                            sessionToRoom.delete(u.sessionId);
                        });
                        sessionToRoom.delete(room.hostSessionId);

                        rooms.delete(roomCode);
                        console.log(`🎬 Room ${roomCode} destroyed (host didn't reconnect)`);
                    }
                }, gracePeriod);

            } else if (user) {
                // Non-host user left - notify others but keep session mapping for reconnection
                socket.to(roomCode).emit('room:user-left', {
                    userId: socket.id,
                    username: user.username
                });
                // DON'T delete sessionToRoom - we need it to detect reconnection
                // sessionToRoom will be cleaned up when room is destroyed
            }
        }
    });

    // Cleanup inactive rooms every 5 minutes
    setInterval(() => {
        const now = Date.now();
        const timeout = 2 * 60 * 60 * 1000; // 2 hours

        const roomCodes = Array.from(rooms.keys());
        roomCodes.forEach(code => {
            const room = rooms.get(code);
            if (!room) return;

            const scheduledTime = room.scheduledFor?.getTime();
            const isScheduledForFuture = scheduledTime && now < scheduledTime;

            // Don't delete scheduled rooms before their time
            if (isScheduledForFuture) return;

            // Delete empty rooms or rooms older than 2 hours
            if (room.users.size === 0 || now - room.createdAt.getTime() > timeout) {
                rooms.delete(code);
                console.log(`🎬 Room ${code} cleaned up (inactive)`);
            }
        });
    }, 5 * 60 * 1000);

    console.log('🎬 Watch Together: Socket.io initialized');
    return io;
}
