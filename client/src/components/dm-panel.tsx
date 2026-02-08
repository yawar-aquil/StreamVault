import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Mic, MicOff, Paperclip, Smile, MessageCircle, Loader2, Send, X, FileText, Image as ImageIcon, Film, Star, Phone, PhoneOff, PhoneCall, PhoneIncoming } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notifications-context';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useSocialSocket } from '@/hooks/use-social-socket';
import { useVoiceCall } from '@/hooks/use-voice-call';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface DirectMessage {
    id: string;
    fromUserId: string;
    toUserId: string;
    message: string;
    attachmentType?: 'image' | 'video' | 'audio' | 'gif' | 'file' | 'call';
    attachmentUrl?: string;
    attachmentFilename?: string;
    attachmentSize?: number;
    attachmentMimeType?: string;
    audioDuration?: number;
    read: boolean;
    createdAt: string;
}

interface Friend {
    id: string;
    username: string;
    avatarUrl: string | null;
    badges?: any[];
    lastActive?: string | null;
}

interface DMPanelProps {
    friendId: string;
    friend: Friend | null;
    onClose: () => void;
}

// GIF interface for Tenor
interface TenorGif {
    id: string;
    title: string;
    media_formats: {
        gif: { url: string };
        tinygif: { url: string };
    };
}

export function DMPanel({ friendId, friend, onClose }: DMPanelProps) {
    const { user } = useAuth();
    const { fetchNotifications } = useNotifications();
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Feature states
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState<TenorGif[]>([]);
    const [isSearchingGifs, setIsSearchingGifs] = useState(false);

    // Voice recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);

    // Audio playback states
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Message input ref for refocusing after send
    const inputRef = useRef<HTMLInputElement>(null);

    // Friends system hooks
    const { startTyping, stopTyping, typingFriends, isFriendOnline, socket } = useSocialSocket();

    // Handle missed call callback - now just triggers fetchMessages since calls are persisted to DB
    const handleMissedCall = useCallback(() => {
        // Refresh messages to get the new call log message from the database
        fetchMessages();
    }, []);

    // Voice calling hook with missed call callback
    const { callState, initiateCall, acceptCall, declineCall, endCall, toggleMute } = useVoiceCall(socket, user?.id, handleMissedCall);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle typing status
    useEffect(() => {
        if (!newMessage.trim()) {
            stopTyping(friendId);
            return;
        }

        const timeout = setTimeout(() => {
            stopTyping(friendId);
        }, 3000);

        startTyping(friendId);

        return () => clearTimeout(timeout);
    }, [newMessage, friendId, startTyping, stopTyping]);

    const fetchMessages = useCallback(async () => {
        try {
            const response = await fetch(`/api/messages/${friendId}`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data);
                // Refresh notifications to update read status
                fetchNotifications();
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setIsLoading(false);
        }
    }, [friendId, fetchNotifications]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Listen for real-time new messages (including call logs)
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMsg: DirectMessage) => {
            // Only add if this message is for this conversation
            if ((newMsg.fromUserId === friendId && newMsg.toUserId === user?.id) ||
                (newMsg.fromUserId === user?.id && newMsg.toUserId === friendId)) {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }
        };

        socket.on('dm:received', handleNewMessage);
        return () => {
            socket.off('dm:received', handleNewMessage);
        };
    }, [socket, friendId, user?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingFriends]);

    // Search GIFs with Tenor API
    const searchGifs = useCallback(async (query: string) => {
        if (!query.trim()) {
            setGifs([]);
            return;
        }

        setIsSearchingGifs(true);
        try {
            // Using Tenor API (free tier)
            const response = await fetch(
                `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=20&media_filter=gif,tinygif`
            );
            const data = await response.json();
            setGifs(data.results || []);
        } catch (error) {
            console.error('Failed to search GIFs:', error);
        } finally {
            setIsSearchingGifs(false);
        }
    }, []);

    // Debounced GIF search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (showGifPicker && gifSearch) {
                searchGifs(gifSearch);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [gifSearch, showGifPicker, searchGifs]);

    // Load trending GIFs when picker opens
    useEffect(() => {
        if (showGifPicker && !gifSearch) {
            searchGifs('trending');
        }
    }, [showGifPicker, gifSearch, searchGifs]);

    // Voice recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await sendVoiceMessage(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            recordingTimerRef.current = window.setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }
    };

    const sendVoiceMessage = async (audioBlob: Blob) => {
        setIsSending(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');
            formData.append('duration', recordingDuration.toString());

            const response = await fetch(`/api/messages/${friendId}/voice`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (response.ok) {
                const dm = await response.json();
                setMessages(prev => [...prev, dm]);
            }
        } catch (error) {
            console.error('Failed to send voice message:', error);
        } finally {
            setIsSending(false);
        }
    };

    // File upload handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSending(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/messages/${friendId}/attachment`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (response.ok) {
                const dm = await response.json();
                setMessages(prev => [...prev, dm]);
            }
        } catch (error) {
            console.error('Failed to upload file:', error);
        } finally {
            setIsSending(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Send GIF
    const sendGif = async (gif: TenorGif) => {
        setIsSending(true);
        setShowGifPicker(false);
        try {
            const response = await fetch(`/api/messages/${friendId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: '',
                    attachmentType: 'gif',
                    attachmentUrl: gif.media_formats.gif.url,
                }),
            });

            if (response.ok) {
                const dm = await response.json();
                setMessages(prev => [...prev, dm]);
            }
        } catch (error) {
            console.error('Failed to send GIF:', error);
        } finally {
            setIsSending(false);
        }
    };

    // Handle text send
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        // Stop typing immediately when sending
        stopTyping(friendId);

        setIsSending(true);
        try {
            const response = await fetch(`/api/messages/${friendId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: newMessage.trim() }),
            });

            if (response.ok) {
                const dm = await response.json();
                setMessages(prev => [...prev, dm]);
                setNewMessage('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
            // Refocus the input after sending (use setTimeout to wait for state update)
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    };

    // Play audio message
    const toggleAudio = (messageId: string, audioUrl: string) => {
        if (playingAudioId === messageId) {
            audioRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(audioUrl);
            audio.onended = () => setPlayingAudioId(null);
            audio.play();
            audioRef.current = audio;
            setPlayingAudioId(messageId);
        }
    };

    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Render attachment
    const renderAttachment = (msg: DirectMessage) => {
        if (!msg.attachmentType) return null;

        switch (msg.attachmentType) {
            case 'image':
                return (
                    <img
                        src={msg.attachmentUrl}
                        alt={msg.attachmentFilename || 'Image'}
                        className="max-w-full rounded-md mt-2 max-h-64 object-contain cursor-pointer transition-opacity hover:opacity-95"
                        onClick={() => window.open(msg.attachmentUrl, '_blank')}
                    />
                );
            case 'gif':
                return (
                    <img
                        src={msg.attachmentUrl}
                        alt="GIF"
                        className="max-w-full rounded-md mt-2 max-h-48"
                    />
                );
            case 'video':
                return (
                    <video
                        src={msg.attachmentUrl}
                        controls
                        className="max-w-full rounded-md mt-2 max-h-64"
                    />
                );
            case 'audio':
                return (
                    <div className="flex items-center gap-3 mt-2 bg-black/20 rounded-full p-2 pr-4 transition-colors hover:bg-black/30">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary"
                            onClick={() => toggleAudio(msg.id, msg.attachmentUrl!)}
                        >
                            {playingAudioId === msg.id ? (
                                <Pause className="h-4 w-4" />
                            ) : (
                                <Play className="h-4 w-4 ml-0.5" />
                            )}
                        </Button>
                        <div className="flex-1 min-w-[100px]">
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                {playingAudioId === msg.id && (
                                    <div className="h-full bg-primary animate-[wiggle_1s_ease-in-out_infinite]" />
                                )}
                            </div>
                        </div>
                        <span className="text-xs font-mono font-medium">
                            {msg.audioDuration ? formatDuration(msg.audioDuration) : '0:00'}
                        </span>
                    </div>
                );
            case 'file':
                return (
                    <a
                        href={msg.attachmentUrl}
                        download={msg.attachmentFilename}
                        className="flex items-center gap-3 mt-2 bg-black/20 rounded-lg p-3 hover:bg-black/30 transition-colors group"
                    >
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{msg.attachmentFilename}</p>
                            <p className="text-xs text-muted-foreground">
                                {msg.attachmentSize ? `${(msg.attachmentSize / 1024).toFixed(1)} KB` : 'File'}
                            </p>
                        </div>
                    </a>
                );
            case 'call':
                // WhatsApp/Instagram-style call log message
                const isIncoming = msg.fromUserId !== user?.id;
                return (
                    <div className="flex items-center gap-3 py-1">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isIncoming ? 'bg-red-500/10' : 'bg-red-500/10'}`}>
                            {isIncoming ? (
                                <PhoneIncoming className="h-4 w-4 text-red-500" />
                            ) : (
                                <PhoneOff className="h-4 w-4 text-red-500" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-500">
                                {isIncoming ? 'Missed voice call' : 'Voice call'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {isIncoming ? 'Tap to call back' : 'Not answered'}
                            </p>
                        </div>
                        {isIncoming && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                onClick={() => {
                                    if (friend && user) {
                                        initiateCall(friendId, friend.username, user.username, user.avatarUrl || undefined);
                                    }
                                }}
                            >
                                <Phone className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg h-[700px] max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-border/50">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b bg-muted/30 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-background">
                            {friend?.avatarUrl ? (
                                <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-medium">
                                    {friend?.username?.slice(0, 2).toUpperCase() || '??'}
                                </span>
                            )}
                        </div>
                        {isFriendOnline(friendId) && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background animate-in zoom-in duration-300" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{friend?.username || 'Loading...'}</h3>

                            {friend?.badges && friend.badges.length > 0 && (
                                <div className="flex items-center gap-1">
                                    {friend.badges
                                        .filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'feature')
                                        .map((badge: any) => (
                                            <TooltipProvider key={badge.id}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="relative group/tooltip cursor-help">
                                                            <img
                                                                src={badge.imageUrl}
                                                                alt={badge.name}
                                                                className="w-5 h-5 object-contain hover:scale-110 transition-transform"
                                                            />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-black/90 text-white border-white/10 text-xs max-w-[200px] whitespace-normal break-words z-[60]">
                                                        <p>{badge.name}</p>
                                                        {badge.description && <p className="text-[10px] opacity-70 mt-0.5">{badge.description}</p>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {typingFriends.has(friendId) ? (
                                <span className="text-primary animate-pulse font-medium">Typing...</span>
                            ) : (() => {
                                const isOnline = isFriendOnline(friendId);
                                const lastActiveDate = friend?.lastActive ? new Date(friend.lastActive) : null;
                                const showOnline = isOnline;

                                if (showOnline) {
                                    return <span className="text-green-500 font-medium">Online</span>;
                                } else if (lastActiveDate) {
                                    return <span>Active {formatDistanceToNow(lastActiveDate, { addSuffix: true })}</span>;
                                } else {
                                    return "Direct Message";
                                }
                            })()}
                        </p>
                    </div>

                    {/* Call button - only show if friend is online */}
                    {isFriendOnline(friendId) && !callState.isInCall && !callState.isCalling && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => initiateCall(friendId, friend?.username || 'Friend', user?.username || 'User', user?.avatarUrl || undefined)}
                            className="rounded-full hover:bg-green-500/10 hover:text-green-500"
                            title="Start voice call"
                        >
                            <Phone className="h-5 w-5" />
                        </Button>
                    )}

                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Incoming Call UI */}
                {callState.isReceivingCall && callState.callerId === friendId && (
                    <div className="p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border-b animate-pulse">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <PhoneIncoming className="h-6 w-6 text-green-500 animate-bounce" />
                                <div>
                                    <p className="font-semibold text-green-500">Incoming Call</p>
                                    <p className="text-sm text-muted-foreground">{callState.callerName} is calling...</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 rounded-full"
                                    onClick={acceptCall}
                                >
                                    <Phone className="h-4 w-4 mr-1" />
                                    Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-full"
                                    onClick={declineCall}
                                >
                                    <PhoneOff className="h-4 w-4 mr-1" />
                                    Decline
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Calling/Outgoing Call UI */}
                {callState.isCalling && callState.callerId === friendId && (
                    <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <PhoneCall className="h-6 w-6 text-blue-500 animate-pulse" />
                                <div>
                                    <p className="font-semibold text-blue-500">Calling...</p>
                                    <p className="text-sm text-muted-foreground">Waiting for {friend?.username} to answer</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="destructive"
                                className="rounded-full"
                                onClick={endCall}
                            >
                                <PhoneOff className="h-4 w-4 mr-1" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Active Call UI */}
                {callState.isInCall && callState.callerId === friendId && (
                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <div>
                                    <p className="font-semibold text-green-500">In Call</p>
                                    <p className="text-sm text-muted-foreground">
                                        {Math.floor(callState.callDuration / 60).toString().padStart(2, '0')}:
                                        {(callState.callDuration % 60).toString().padStart(2, '0')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={callState.isMuted ? "destructive" : "outline"}
                                    className="rounded-full"
                                    onClick={toggleMute}
                                >
                                    {callState.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-full"
                                    onClick={endCall}
                                >
                                    <PhoneOff className="h-4 w-4 mr-1" />
                                    End
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                                <MessageCircle className="h-10 w-10 opacity-50" />
                            </div>
                            <p className="font-medium text-lg">No messages yet</p>
                            <p className="text-sm">Say hello to {friend?.username}!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.fromUserId === user?.id;
                            const showAvatar = !isMe && (index === 0 || messages[index - 1].fromUserId !== msg.fromUserId);

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isMe && (
                                        <div className="w-8 h-8 flex-shrink-0 flex flex-col justify-end">
                                            {showAvatar ? (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden ring-1 ring-border">
                                                    {friend?.avatarUrl ? (
                                                        <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="w-full h-full flex items-center justify-center text-xs font-medium">
                                                            {friend?.username?.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <div className="w-8" />}
                                        </div>
                                    )}

                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                        <div
                                            className={`rounded-2xl px-4 py-2.5 shadow-sm ${isMe
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                : 'bg-muted rounded-tl-sm'
                                                } ${msg.attachmentType ? 'p-2' : ''}`}
                                        >
                                            {msg.message && (
                                                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.message}</p>
                                            )}
                                            {renderAttachment(msg)}
                                        </div>
                                        <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <span className="text-[10px] opacity-70">
                                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                            </span>
                                            {/* Seen receipt - show for last sent message that was read */}
                                            {isMe && msg.read && index === messages.length - 1 && (
                                                <span className="text-[10px] text-primary font-medium">• Seen</span>
                                            )}
                                            {/* Delivery indicator for unread messages */}
                                            {isMe && !msg.read && (
                                                <span className="text-[10px] opacity-50">• Sent</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Typing Indicator Bubble */}
                    {typingFriends.has(friendId) && (
                        <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="w-8 h-8 flex-shrink-0 flex flex-col justify-end">
                                <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden ring-1 ring-border">
                                    {friend?.avatarUrl ? (
                                        <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="w-full h-full flex items-center justify-center text-xs font-medium">
                                            {friend?.username?.slice(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
                                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.32s]" />
                                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.16s]" />
                                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <div className="absolute bottom-[80px] left-4 z-20 shadow-2xl rounded-xl overflow-hidden border animate-in zoom-in-95 duration-200">
                        <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(emoji) => {
                                setNewMessage(prev => prev + emoji.emoji);
                                setShowEmojiPicker(false);
                            }}
                            width={300}
                            height={350}
                            lazyLoadEmojis
                        />
                    </div>
                )}

                {/* GIF Picker */}
                {showGifPicker && (
                    <div className="absolute bottom-[80px] left-4 right-4 z-20 bg-card border rounded-xl shadow-2xl p-3 h-[320px] max-w-[400px] flex flex-col animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
                        <Input
                            placeholder="Search GIFs..."
                            value={gifSearch}
                            onChange={(e) => setGifSearch(e.target.value)}
                            className="mb-2"
                            autoFocus
                        />
                        <div className="flex-1 overflow-y-auto pr-1">
                            {isSearchingGifs ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {gifs.map((gif) => (
                                        <div key={gif.id} className="aspect-video relative group overflow-hidden rounded-md bg-muted">
                                            <img
                                                src={gif.media_formats.tinygif.url}
                                                alt={gif.title}
                                                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-110"
                                                onClick={() => sendGif(gif)}
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-2 border-t pt-2">
                            <span className="text-xs text-muted-foreground">Powered by Tenor</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setShowGifPicker(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}

                {/* Voice Recording Indicator */}
                {isRecording && (
                    <div className="px-4 py-3 bg-destructive/5 border-t flex items-center gap-3 animate-in slide-in-from-bottom-2">
                        <div className="relative flex items-center justify-center w-8 h-8">
                            <div className="absolute inset-0 bg-destructive/20 rounded-full animate-ping" />
                            <div className="relative w-3 h-3 bg-destructive rounded-full" />
                        </div>
                        <span className="text-sm font-medium text-destructive tabular-nums">
                            Recording... {formatDuration(recordingDuration)}
                        </span>
                        <div className="flex-1" />
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={stopRecording}
                            className="rounded-full px-4"
                        >
                            <Square className="h-3.5 w-3.5 mr-2 fill-current" />
                            Stop & Send
                        </Button>
                    </div>
                )}

                {/* Input Toolbar */}
                <div className="p-3 bg-background border-t space-y-2">
                    <div className="flex items-end gap-2 bg-muted/50 rounded-2xl p-1.5 transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-primary/20">
                        {/* Attach buttons */}
                        <div className="flex items-center gap-0.5 pb-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                                onClick={() => {
                                    setShowEmojiPicker(!showEmojiPicker);
                                    setShowGifPicker(false);
                                }}
                                title="Emoji"
                            >
                                <Smile className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                                onClick={() => fileInputRef.current?.click()}
                                title="Attach file"
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                                onChange={handleFileUpload}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                                onClick={() => {
                                    setShowGifPicker(!showGifPicker);
                                    setShowEmojiPicker(false);
                                }}
                                title="GIF"
                            >
                                <span className="text-[10px] font-bold border rounded px-1 min-w-[24px]">GIF</span>
                            </Button>
                        </div>

                        {/* Message input */}
                        <form onSubmit={handleSend} className="flex-1 relative flex items-end gap-2">
                            <Input
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                disabled={isSending || isRecording}
                                autoFocus
                                className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-2 py-2.5 h-auto max-h-32 min-h-[44px] resize-none overflow-y-auto"
                                style={{ boxShadow: 'none' }}
                                autoComplete="off"
                            />

                            <div className="flex items-center gap-1 pb-1">
                                {newMessage.trim() ? (
                                    <Button
                                        type="submit"
                                        disabled={isSending || isRecording}
                                        size="icon"
                                        className="h-8 w-8 rounded-full transition-all duration-200 hover:scale-105"
                                    >
                                        {isSending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4 ml-0.5" />
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant={isRecording ? "destructive" : "ghost"}
                                        size="icon"
                                        className={`h-8 w-8 rounded-full transition-all duration-200 ${isRecording ? 'opacity-0 scale-0 w-0 p-0' : 'text-muted-foreground hover:text-foreground hover:bg-background shadow-none'}`}
                                        onClick={startRecording}
                                        title="Voice message"
                                    >
                                        <Mic className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
