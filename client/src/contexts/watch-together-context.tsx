import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSocialSocket } from '@/hooks/use-social-socket';

// Types
export interface User {
    id: string;
    username: string;
    avatarUrl?: string;
    authUserId?: string; // Actual authenticated user ID from database
    badges?: any[]; // Updated to array of badges
    isHost: boolean;
    isMuted: boolean;
}

export interface VideoState {
    isPlaying: boolean;
    currentTime: number;
    lastUpdate: number;
    currentSubtitleIndex: number; // -1 = off, 0+ = subtitle track index
}

export interface ChatMessage {
    id: string;
    username: string;
    avatarUrl?: string;
    badges?: any[]; // Updated to array
    message: string;
    timestamp: Date;
}

export interface Reaction {
    id: string;
    username: string;
    emoji: string;
}

// Poll types
export interface PollOption {
    id: string;
    text: string;
    voteCount: number;
}

export interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    isActive: boolean;
    createdAt: Date;
    expiresAt?: Date;
}

export interface RoomInfo {
    roomId: string;
    roomCode: string;
    contentType: 'show' | 'movie' | 'anime';
    contentId: string;
    contentTitle?: string;
    contentPoster?: string;
    episodeId?: string;
    episodeTitle?: string;
    description?: string;
    scheduledFor?: string;
    users: User[];
    videoState: VideoState;
    user: User;
}

interface WatchTogetherContextType {
    socket: Socket | null;
    isConnected: boolean;
    roomInfo: RoomInfo | null;
    users: User[];
    speakingUsers: Set<string>;
    messages: ChatMessage[];
    reactions: Reaction[];
    videoState: VideoState | null;
    isHost: boolean;
    currentUser: User | null;
    error: string | null;
    hostDisconnected: boolean;
    reconnectCountdown: number | null;
    // Actions
    createRoom: (contentType: 'show' | 'movie' | 'anime', contentId: string, username: string, avatarUrl?: string, episodeId?: string, authUserId?: string, options?: { contentTitle?: string; contentPoster?: string; episodeTitle?: string; isPublic?: boolean; password?: string; description?: string; scheduledFor?: string }) => void;
    joinRoom: (roomCode: string, username: string, avatarUrl?: string, password?: string, authUserId?: string) => void;
    leaveRoom: () => void;
    sendMessage: (message: string) => void;
    sendReaction: (emoji: string) => void;
    videoPlay: (currentTime: number) => void;
    videoPause: (currentTime: number) => void;
    videoSeek: (currentTime: number) => void;
    videoPlaybackRate: (rate: number) => void;
    videoSubtitle: (subtitleIndex: number) => void; // -1 = off, 0+ = track index
    requestVideoState: () => void;
    hostMuteUser: (targetUserId: string, isMuted: boolean) => void;
    changeContent: (episodeId?: string, contentId?: string, contentType?: 'show' | 'movie' | 'anime') => void;
    clearError: () => void;
    // Poll actions
    polls: Poll[];
    createPoll: (question: string, options: string[], expiresInMinutes?: number) => void;
    votePoll: (pollId: string, optionId: string) => void;
    closePoll: (pollId: string) => void;
}

const WatchTogetherContext = createContext<WatchTogetherContextType | null>(null);

export function useWatchTogether() {
    const context = useContext(WatchTogetherContext);
    if (!context) {
        throw new Error('useWatchTogether must be used within WatchTogetherProvider');
    }
    return context;
}

interface Props {
    children: ReactNode;
}

export function WatchTogetherProvider({ children }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [videoState, setVideoState] = useState<VideoState | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hostDisconnected, setHostDisconnected] = useState(false);
    const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
    const [polls, setPolls] = useState<Poll[]>([]);

    const isHost = currentUser?.isHost ?? false;
    const { stopActivity } = useSocialSocket();

    // Generate or retrieve session ID from localStorage
    const getSessionId = (): string => {
        const storageKey = 'watch-together-session-id';
        let sessionId = localStorage.getItem(storageKey);
        if (!sessionId) {
            sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem(storageKey, sessionId);
        }
        return sessionId;
    };

    // Initialize socket connection
    useEffect(() => {
        const socketUrl = typeof window !== 'undefined'
            ? `${window.location.protocol}//${window.location.host}`
            : '';

        const newSocket = io(`${socketUrl}/watch-together`, {
            path: '/watch-together-socket',
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('🎬 Connected to Watch Together');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('🎬 Disconnected from Watch Together');
            setIsConnected(false);
        });

        // Room events
        newSocket.on('room:created', (data: RoomInfo) => {
            setRoomInfo(data);
            setUsers([data.user]);
            setCurrentUser(data.user);
            setVideoState(data.videoState);
            setMessages([]);
            setError(null);
            // Save to localStorage for auto-rejoin
            localStorage.setItem('watch-together-username', data.user.username);
            localStorage.setItem('watch-together-room', data.roomCode);
        });

        newSocket.on('room:joined', (data: RoomInfo) => {
            setRoomInfo(data);
            setUsers(data.users);
            setCurrentUser(data.user);
            setVideoState(data.videoState);
            setMessages([]);
            setError(null);
            setHostDisconnected(false);
            setReconnectCountdown(null);
            // Save to localStorage for auto-rejoin
            localStorage.setItem('watch-together-username', data.user.username);
            localStorage.setItem('watch-together-room', data.roomCode);
        });

        newSocket.on('room:user-joined', ({ user }: { user: User }) => {
            setUsers(prev => [...prev, user]);
            setMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                username: 'System',
                message: `${user.username} joined the room`,
                timestamp: new Date()
            }]);
        });

        newSocket.on('room:user-left', ({ username }: { username: string }) => {
            setUsers(prev => prev.filter(u => u.username !== username));
            setMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                username: 'System',
                message: `${username} left the room`,
                timestamp: new Date()
            }]);
        });

        newSocket.on('room:user-updated', ({ user }: { user: User }) => {
            setUsers(prev => prev.map(u => u.id === user.id ? user : u));
        });

        newSocket.on('room:destroyed', ({ message }: { message: string }) => {
            setRoomInfo(null);
            setUsers([]);
            setCurrentUser(null);
            setVideoState(null);
            setMessages([]);
            setError(message);
        });

        newSocket.on('room:error', ({ message }: { message: string }) => {
            setError(message);
        });

        // Host disconnected - show waiting message
        newSocket.on('room:host-disconnected', ({ message, gracePeriodMs }: { message: string; gracePeriodMs: number }) => {
            setHostDisconnected(true);
            setReconnectCountdown(Math.floor(gracePeriodMs / 1000));
            setMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                username: 'System',
                message: message,
                timestamp: new Date()
            }]);

            // Start countdown timer
            const interval = setInterval(() => {
                setReconnectCountdown(prev => {
                    if (prev && prev > 1) {
                        return prev - 1;
                    } else {
                        clearInterval(interval);
                        return null;
                    }
                });
            }, 1000);
        });

        // Host reconnected - clear warning and replace old host entry
        newSocket.on('room:host-reconnected', ({ user }: { user: User }) => {
            setHostDisconnected(false);
            setReconnectCountdown(null);
            // Remove any existing entries with same username and add the new one
            setUsers(prev => {
                const filtered = prev.filter(u => u.username !== user.username);
                return [...filtered, user];
            });
            setMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                username: 'System',
                message: `Host reconnected`,
                timestamp: new Date()
            }]);
        });

        // User reconnected - replace old entry
        newSocket.on('room:user-reconnected', ({ user }: { user: User }) => {
            // Remove any existing entries with same username and add the new one
            setUsers(prev => {
                const filtered = prev.filter(u => u.username !== user.username);
                return [...filtered, user];
            });
            setMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                username: 'System',
                message: `${user.username} reconnected`,
                timestamp: new Date()
            }]);
        });

        // Video sync
        newSocket.on('video:sync', (state: VideoState) => {
            setVideoState(state);
            // Broadcast to extension for Google Drive video sync
            window.postMessage({
                source: 'streamvault-page',
                type: 'VIDEO_SYNC',
                action: state.isPlaying ? 'play' : 'pause',
                time: state.currentTime,
                playbackRate: 1
            }, '*');
        });

        // Content changed (host changed episode/movie)
        newSocket.on('content:changed', (data: { episodeId?: string; contentId?: string; contentType?: 'show' | 'movie'; videoState: VideoState }) => {
            console.log('🎬 Content changed received:', data);
            // Update roomInfo with new content
            setRoomInfo(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    episodeId: data.episodeId,
                    contentId: data.contentId || prev.contentId,
                    contentType: data.contentType || prev.contentType
                };
            });
            // Reset video state
            setVideoState(data.videoState);
        });

        // Subtitle sync - update subtitle index when host changes
        newSocket.on('video:subtitle', ({ subtitleIndex }: { subtitleIndex: number }) => {
            console.log('🎬 Subtitle sync received:', subtitleIndex);
            setVideoState(prev => prev ? { ...prev, currentSubtitleIndex: subtitleIndex } : prev);
        });

        // Chat
        newSocket.on('chat:receive', (msg: ChatMessage) => {
            setMessages(prev => [...prev, msg]);
            // Play modern notification sound for messages from other users
            if (msg.username !== 'System') {
                try {
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

                    // Create a modern "pop" sound
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    // Modern notification tone (like Discord)
                    oscillator.frequency.setValueAtTime(830, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.08);

                    oscillator.type = 'sine';

                    // Quick fade in and out
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.15);
                } catch { }
            }
        });

        // Reactions
        newSocket.on('reaction:show', (reaction: Reaction) => {
            setReactions(prev => [...prev, reaction]);
            // Remove reaction after 3 seconds
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reaction.id));
            }, 3000);
        });

        // Voice speaking state from other users
        newSocket.on('voice:user-speaking', ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
            setSpeakingUsers(prev => {
                const newSet = new Set(prev);
                if (isSpeaking) {
                    newSet.add(userId);
                } else {
                    newSet.delete(userId);
                }
                return newSet;
            });
        });

        // Poll events
        newSocket.on('poll:created', (poll: Poll) => {
            console.log('📊 Poll created:', poll.question);
            setPolls(prev => [...prev, poll]);
        });

        newSocket.on('poll:updated', (poll: Poll) => {
            console.log('📊 Poll updated:', poll.id);
            setPolls(prev => prev.map(p => p.id === poll.id ? poll : p));
        });

        newSocket.on('poll:closed', ({ pollId }: { pollId: string }) => {
            console.log('📊 Poll closed:', pollId);
            setPolls(prev => prev.map(p => p.id === pollId ? { ...p, isActive: false } : p));
        });

        newSocket.on('poll:list', (pollsList: Poll[]) => {
            console.log('📊 Received polls:', pollsList.length);
            setPolls(pollsList);
        });

        newSocket.on('poll:error', ({ message }: { message: string }) => {
            console.error('📊 Poll error:', message);
            setError(message);
        });

        setSocket(newSocket);

        return () => {
            stopActivity(); // Clear social activity on unmount
            newSocket.close();
        };
    }, [stopActivity]);

    // Actions
    const createRoom = useCallback((
        contentType: 'show' | 'movie' | 'anime',
        contentId: string,
        username: string,
        avatarUrl?: string,
        episodeId?: string,
        authUserId?: string,
        options?: {
            contentTitle?: string;
            contentPoster?: string;
            episodeTitle?: string;
            isPublic?: boolean;
            password?: string;
            description?: string;
            scheduledFor?: string;
        }
    ) => {
        const sessionId = getSessionId();
        socket?.emit('room:create', {
            contentType,
            contentId,
            username,
            avatarUrl,
            episodeId,
            sessionId,
            authUserId, // Pass authenticated user ID for friend requests
            contentTitle: options?.contentTitle || 'Untitled',
            contentPoster: options?.contentPoster,
            episodeTitle: options?.episodeTitle,
            isPublic: options?.isPublic ?? true,
            password: options?.password,
            description: options?.description,
            scheduledFor: options?.scheduledFor,
        });
    }, [socket]);

    const joinRoom = useCallback((roomCode: string, username: string, avatarUrl?: string, password?: string, authUserId?: string) => {
        const sessionId = getSessionId();
        socket?.emit('room:join', { roomCode: roomCode.toUpperCase(), username, avatarUrl, sessionId, password, authUserId });
    }, [socket]);

    const leaveRoom = useCallback(() => {
        socket?.emit('room:leave');
        stopActivity(); // Clear social activity
        setRoomInfo(null);
        setUsers([]);
        setCurrentUser(null);
        setVideoState(null);
        setMessages([]);
    }, [socket, stopActivity]);

    const sendMessage = useCallback((message: string) => {
        if (message.trim()) {
            socket?.emit('chat:message', { message: message.trim() });
        }
    }, [socket]);

    const sendReaction = useCallback((emoji: string) => {
        socket?.emit('reaction:send', { emoji });
    }, [socket]);

    const videoPlay = useCallback((currentTime: number) => {
        console.log('🎬 Context videoPlay - emitting video:play to server, time:', currentTime);
        socket?.emit('video:play', { currentTime });
    }, [socket]);

    const videoPause = useCallback((currentTime: number) => {
        console.log('🎬 Context videoPause - emitting video:pause to server, time:', currentTime);
        socket?.emit('video:pause', { currentTime });
    }, [socket]);

    const videoSeek = useCallback((currentTime: number) => {
        console.log('🎬 Context videoSeek - emitting video:seek to server, time:', currentTime);
        socket?.emit('video:seek', { currentTime });
    }, [socket]);

    const videoPlaybackRate = useCallback((rate: number) => {
        console.log('🎬 Context videoPlaybackRate - emitting video:playbackRate to server, rate:', rate);
        socket?.emit('video:playbackRate', { rate });
    }, [socket]);

    const videoSubtitle = useCallback((subtitleIndex: number) => {
        console.log('🎬 Context videoSubtitle - emitting video:subtitle to server, index:', subtitleIndex);
        socket?.emit('video:subtitle', { subtitleIndex });
    }, [socket]);

    const requestVideoState = useCallback(() => {
        socket?.emit('video:request-state');
    }, [socket]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const hostMuteUser = useCallback((targetUserId: string, isMuted: boolean) => {
        socket?.emit('voice:host-mute', { targetUserId, isMuted });
    }, [socket]);

    // Change content (episode/movie/anime) in room
    const changeContent = useCallback((episodeId?: string, contentId?: string, contentType?: 'show' | 'movie' | 'anime') => {
        console.log('🎬 Context changeContent - emitting video:change-content', { episodeId, contentId, contentType });
        socket?.emit('video:change-content', { episodeId, contentId, contentType });
    }, [socket]);

    // Poll actions
    const createPoll = useCallback((question: string, options: string[], expiresInMinutes?: number) => {
        console.log('📊 Creating poll:', question);
        socket?.emit('poll:create', { question, options, expiresInMinutes });
    }, [socket]);

    const votePoll = useCallback((pollId: string, optionId: string) => {
        console.log('📊 Voting on poll:', pollId, optionId);
        socket?.emit('poll:vote', { pollId, optionId });
    }, [socket]);

    const closePoll = useCallback((pollId: string) => {
        console.log('📊 Closing poll:', pollId);
        socket?.emit('poll:close', { pollId });
    }, [socket]);

    // Request polls when joining room
    useEffect(() => {
        if (socket && roomInfo) {
            socket.emit('poll:get');
        }
    }, [socket, roomInfo]);

    return (
        <WatchTogetherContext.Provider value={{
            socket,
            isConnected,
            roomInfo,
            users,
            speakingUsers,
            messages,
            reactions,
            videoState,
            isHost,
            currentUser,
            error,
            hostDisconnected,
            reconnectCountdown,
            createRoom,
            joinRoom,
            leaveRoom,
            sendMessage,
            sendReaction,
            videoPlay,
            videoPause,
            videoSeek,
            videoPlaybackRate,
            videoSubtitle,
            requestVideoState,
            hostMuteUser,
            changeContent,
            clearError,
            polls,
            createPoll,
            votePoll,
            closePoll
        }}>
            {children}
        </WatchTogetherContext.Provider>
    );
}
