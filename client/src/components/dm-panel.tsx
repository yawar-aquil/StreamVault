import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Mic, MicOff, Paperclip, Smile, MessageCircle, Loader2, Send, X, FileText, Image as ImageIcon, Film, Star, Phone, PhoneOff, PhoneCall, PhoneIncoming, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notifications-context';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import EmojiPicker, { Theme, SuggestionMode, SkinTonePickerLocation } from 'emoji-picker-react';
import { useSocialSocket } from '@/hooks/use-social-socket';
import { useVoiceCall } from '@/hooks/use-voice-call';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { VoiceMessage } from '@/components/ui/voice-message';
import { AudioVisualizer } from '@/components/ui/audio-visualizer';
import { LinkPreview } from '@/components/link-preview';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

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
    replyToId?: string;
    reactions?: { userId: string, emoji: string }[];
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

// Format message with GIFs rendered as media
function formatMessageWithMedia(text: string) {
    const mediaRegex = /(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = mediaRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        if (match[1]) {
            parts.push(
                <img
                    key={`media-${keyIndex++}`}
                    src={match[1]}
                    alt="GIF"
                    className="max-w-[250px] max-h-[250px] rounded-lg my-2 block object-contain"
                    loading="lazy"
                />
            );
        }
        lastIndex = mediaRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

// Compact link preview for reply context
function ReplyLinkPreview({ url, isMe }: { url: string; isMe: boolean }) {
    const [preview, setPreview] = useState<{ title?: string; image?: string; siteName?: string } | null>(null);

    useEffect(() => {
        let mounted = true;
        fetch('/api/preview-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        })
            .then(r => r.json())
            .then(data => { if (mounted) setPreview(data); })
            .catch(() => { });
        return () => { mounted = false; };
    }, [url]);

    const domain = (() => {
        try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
    })();

    if (!preview || (!preview.title && !preview.image)) {
        return <span className="opacity-75">🔗 {domain}</span>;
    }

    return (
        <div className="flex items-center gap-2 mt-0.5">
            {preview.image && (
                <img
                    src={preview.image}
                    alt=""
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
            )}
            <div className="min-w-0 flex-1">
                {preview.title && (
                    <p className={`text-[11px] font-medium truncate ${isMe ? 'text-primary-foreground/90' : 'text-foreground/80'}`}>
                        {preview.title}
                    </p>
                )}
                <p className={`text-[10px] truncate ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    🔗 {preview.siteName || domain}
                </p>
            </div>
        </div>
    );
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
    const gifNextPosRef = useRef<string | null>(null);
    const [isLoadingMoreGifs, setIsLoadingMoreGifs] = useState(false);
    const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);

    // Voice recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);
    const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string; duration: number } | null>(null);

    // Audio playback states
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Message input ref for refocusing after send
    const inputRef = useRef<HTMLInputElement>(null);

    // Friends system hooks
    const { startTyping, stopTyping, typingFriends, isFriendOnline, socket, onDMReaction } = useSocialSocket();

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

    const handleReply = (message: DirectMessage) => {
        setReplyingTo(message);
        inputRef.current?.focus();
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

    // Listen for reactions
    useEffect(() => {
        const removeListener = onDMReaction((updatedMsg) => {
            setMessages(prev => prev.map(msg =>
                msg.id === updatedMsg.id ? { ...msg, reactions: updatedMsg.reactions } : msg
            ));
        });
        return () => removeListener();
    }, [onDMReaction]);

    // Search GIFs with Tenor API
    const searchGifs = useCallback(async (query: string, loadMore = false) => {
        if (!query.trim()) {
            setGifs([]);
            gifNextPosRef.current = null;
            return;
        }

        if (loadMore) {
            setIsLoadingMoreGifs(true);
        } else {
            setIsSearchingGifs(true);
        }
        try {
            const endpoint = query === 'trending' ? 'featured' : 'search';
            let url = `https://tenor.googleapis.com/v2/${endpoint}?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=30&media_filter=gif,tinygif`;
            if (loadMore && gifNextPosRef.current) {
                url += `&pos=${gifNextPosRef.current}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            if (loadMore) {
                setGifs(prev => [...prev, ...(data.results || [])]);
            } else {
                setGifs(data.results || []);
            }
            gifNextPosRef.current = data.next || null;
        } catch (error) {
            console.error('Failed to search GIFs:', error);
        } finally {
            setIsSearchingGifs(false);
            setIsLoadingMoreGifs(false);
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

    // Load more GIFs handler for infinite scroll
    const loadMoreGifs = useCallback(() => {
        if (isLoadingMoreGifs || !gifNextPosRef.current) return;
        const query = gifSearch || 'trending';
        searchGifs(query, true);
    }, [gifSearch, searchGifs, isLoadingMoreGifs]);

    // Voice recording functions
    // Voice recording functions
    const handleReaction = async (messageId: string, emoji: string) => {
        try {
            // Optimistic update
            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    const currentReactions = msg.reactions || [];
                    const existingIndex = currentReactions.findIndex(r => r.userId === user?.id);
                    let newReactions = [...currentReactions];

                    if (existingIndex !== -1) {
                        if (currentReactions[existingIndex].emoji === emoji) {
                            newReactions.splice(existingIndex, 1); // Remove
                        } else {
                            newReactions[existingIndex] = { ...newReactions[existingIndex], emoji }; // Update
                        }
                    } else if (user?.id) {
                        newReactions.push({ userId: user.id, emoji }); // Add
                    }
                    return { ...msg, reactions: newReactions };
                }
                return msg;
            }));

            await fetch(`/api/messages/${messageId}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji }),
            });
        } catch (error) {
            console.error('Failed to add reaction:', error);
        }
    };

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
                const audioUrl = URL.createObjectURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());

                // Set preview instead of sending immediately
                setRecordedAudio({
                    blob: audioBlob,
                    url: audioUrl,
                    duration: recordingDuration
                });
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingStream(stream); // Set stream for visualizer
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
            setRecordingStream(null); // Clear stream
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }
    };

    const cancelRecording = () => {
        if (isRecording) {
            stopRecording();
        }
        if (recordedAudio) {
            URL.revokeObjectURL(recordedAudio.url);
            setRecordedAudio(null);
        }
        setRecordingDuration(0);
    };

    const confirmSendVoiceMessage = async () => {
        if (!recordedAudio) return;
        await sendVoiceMessage(recordedAudio.blob, recordedAudio.duration);
        URL.revokeObjectURL(recordedAudio.url);
        setRecordedAudio(null);
        setRecordingDuration(0);
    };

    const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
        setIsSending(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');
            formData.append('duration', duration.toString());

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

        const messageText = newMessage.trim();
        setNewMessage(''); // Clear input immediately for better UX
        setIsSending(true);
        try {
            const response = await fetch(`/api/messages/${friendId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: messageText,
                    replyToId: replyingTo?.id
                }),
            });

            if (response.ok) {
                const dm = await response.json();
                setMessages(prev => [...prev, dm]);
                setReplyingTo(null); // Clear reply state
            } else {
                // Restore message if send failed
                setNewMessage(messageText);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore message if send failed
            setNewMessage(messageText);
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
                    <div className="mt-2">
                        <VoiceMessage
                            src={msg.attachmentUrl!}
                            duration={msg.audioDuration}
                            isMe={msg.fromUserId === user?.id}
                        />
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
                                        .sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime())
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
                <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
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
                            const prevMsg = messages[index - 1];
                            const nextMsg = messages[index + 1];

                            // Calculate time differences for grouping
                            const isTimeGapPrev = prevMsg && differenceInMinutes(new Date(msg.createdAt), new Date(prevMsg.createdAt)) >= 10;
                            const isTimeGapNext = nextMsg && differenceInMinutes(new Date(nextMsg.createdAt), new Date(msg.createdAt)) >= 10;

                            const isFirstInGroup = !prevMsg || prevMsg.fromUserId !== msg.fromUserId || isTimeGapPrev;
                            const isLastInGroup = !nextMsg || nextMsg.fromUserId !== msg.fromUserId || isTimeGapNext;

                            // Avatar is shown at the bottom of the group for friends
                            const showAvatar = !isMe && isLastInGroup;

                            // Dynamic border radius for grouping effect
                            let borderRadiusClass = "rounded-2xl";
                            if (!isMe) {
                                // Friend's messages (Left aligned)
                                if (!isFirstInGroup) borderRadiusClass += " rounded-tl-sm";
                                if (!isLastInGroup) borderRadiusClass += " rounded-bl-sm";
                            } else {
                                // My messages (Right aligned)
                                if (!isFirstInGroup) borderRadiusClass += " rounded-tr-sm";
                                if (!isLastInGroup) borderRadiusClass += " rounded-br-sm";
                            }

                            // Spacing: very tight between group (1px), distinguishable between groups (2)
                            const marginBottom = isLastInGroup ? "mb-2" : "mb-[1px]";

                            // Find replied message
                            const replyMessage = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

                            // Emoji-only messages should not have a bubble (including replies)
                            const isEmojiOnly = !msg.attachmentType && msg.message &&
                                /^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(msg.message);

                            return (
                                <div
                                    key={msg.id}
                                    id={`msg-${msg.id}`}
                                    className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} ${marginBottom} group/msg relative`}
                                >
                                    <div className={`flex gap-2 max-w-[70%] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        {!isMe && (
                                            <div className="w-8 flex-shrink-0 flex flex-col justify-end">
                                                {showAvatar ? (
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden ring-1 ring-border shadow-sm">
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

                                        <div className="flex flex-col relative">
                                            {/* "X replied to Y" label — Instagram style, OUTSIDE bubble */}
                                            {msg.replyToId && (
                                                <p className={`text-[11px] mb-1 ${isMe ? 'text-right' : 'text-left'} text-muted-foreground`}>
                                                    {(() => {
                                                        const senderName = isMe ? 'You' : friend?.username;
                                                        if (!replyMessage) return `${senderName} replied to a message`;
                                                        const isSelfReply = msg.fromUserId === replyMessage.fromUserId;
                                                        if (isSelfReply) {
                                                            return `${isMe ? 'You' : friend?.username} replied to ${isMe ? 'yourself' : 'themself'}`;
                                                        }
                                                        const repliedToName = replyMessage.fromUserId === user?.id ? 'you' : friend?.username;
                                                        return `${senderName} replied to ${repliedToName}`;
                                                    })()}
                                                </p>
                                            )}

                                            <div
                                                className={`${isEmojiOnly
                                                    ? 'select-none'
                                                    : `px-4 py-2 shadow-sm relative group-hover/msg:shadow-md transition-shadow ${borderRadiusClass} ${isMe
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted'
                                                    } ${msg.attachmentType ? 'p-2' : ''} min-w-[80px] select-none`
                                                    }`}
                                                onDoubleClick={() => handleReaction(msg.id, '❤️')}
                                            >
                                                {/* Replied message preview — INSIDE bubble, Instagram style */}
                                                {msg.replyToId && (
                                                    <div
                                                        className="mb-1.5 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const el = document.getElementById(`msg-${msg.replyToId}`);
                                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            el?.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                                                            setTimeout(() => el?.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
                                                        }}
                                                    >
                                                        <div className={`rounded-lg px-2.5 py-1.5 text-xs overflow-hidden ${isMe ? 'bg-primary-foreground/10' : 'bg-background/30'}`}>
                                                            {replyMessage ? (
                                                                <>
                                                                    {/* Attachment preview in reply */}
                                                                    {replyMessage.attachmentType && (
                                                                        <div className="mb-1">
                                                                            {replyMessage.attachmentType === 'image' && replyMessage.attachmentUrl && (
                                                                                <img src={replyMessage.attachmentUrl} alt="Photo" className="w-full max-w-[180px] max-h-[100px] rounded object-cover" />
                                                                            )}
                                                                            {replyMessage.attachmentType === 'gif' && replyMessage.attachmentUrl && (
                                                                                <img src={replyMessage.attachmentUrl} alt="GIF" className="w-full max-w-[180px] max-h-[80px] rounded object-cover" />
                                                                            )}
                                                                            {replyMessage.attachmentType === 'video' && (
                                                                                <div className="flex items-center gap-1.5 opacity-75">
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                                                    <span>Video</span>
                                                                                </div>
                                                                            )}
                                                                            {replyMessage.attachmentType === 'audio' && replyMessage.attachmentUrl && (
                                                                                <div className="mt-0.5">
                                                                                    <VoiceMessage
                                                                                        src={replyMessage.attachmentUrl}
                                                                                        duration={replyMessage.audioDuration}
                                                                                        isMe={isMe}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            {replyMessage.attachmentType === 'file' && (
                                                                                <div className="flex items-center gap-1.5 opacity-75">
                                                                                    <FileText className="h-3.5 w-3.5" />
                                                                                    <span className="truncate">{replyMessage.attachmentFilename || 'File'}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {/* Text preview */}
                                                                    {replyMessage.message && (
                                                                        /^https?:\/\//i.test(replyMessage.message.trim())
                                                                            ? <ReplyLinkPreview url={replyMessage.message.trim()} isMe={isMe} />
                                                                            : <p className="truncate opacity-75 max-w-[200px]">{replyMessage.message}</p>
                                                                    )}
                                                                    {/* If no message and no attachment preview rendered */}
                                                                    {!replyMessage.message && !replyMessage.attachmentType && (
                                                                        <p className="truncate opacity-75">Message</p>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <p className="truncate opacity-75">Message deleted or unavailable</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {msg.message && (
                                                    <>
                                                        <p className={`${/^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(msg.message) && msg.message.length < 10
                                                            ? 'text-4xl leading-normal'
                                                            : 'text-sm leading-relaxed'
                                                            } break-words whitespace-pre-wrap`}>
                                                            {formatMessageWithMedia(msg.message)}
                                                        </p>
                                                        {(() => {
                                                            const urlMatch = msg.message.match(/(https?:\/\/[^\s]+)/);
                                                            if (urlMatch && urlMatch[0].match(/https:\/\/media\.tenor\.com\/[^\s]+\.gif/i)) {
                                                                return null;
                                                            }
                                                            return urlMatch ? <LinkPreview url={urlMatch[0]} /> : null;
                                                        })()}
                                                    </>
                                                )}
                                                {renderAttachment(msg)}
                                            </div>

                                            {/* Reactions Display - Instagram-style pill overlapping bubble */}
                                            {msg.reactions && msg.reactions.length > 0 && (
                                                <div className={`flex ${isMe ? 'justify-end pr-1' : 'justify-start pl-1'} -mt-2.5 relative z-10`}>
                                                    <div
                                                        className="flex items-center gap-0.5 bg-[#1c1c1e] rounded-full px-1.5 py-[3px] shadow-lg border border-white/[0.08] cursor-pointer"
                                                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                                                    >
                                                        {Array.from(new Set(msg.reactions.map(r => r.emoji))).slice(0, 3).map(emoji => (
                                                            <span key={emoji} className="text-[13px] leading-none hover:scale-125 transition-transform" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</span>
                                                        ))}
                                                        {msg.reactions.length > 1 && (
                                                            <span className="text-[11px] text-white/60 ml-0.5 leading-none">{msg.reactions.length}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reply Button (visible on hover or focus/active for touch) */}
                                        {/* Message Actions (Reaction + Reply) */}
                                        <div className={`flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 transition-opacity self-center shrink-0 ${isMe ? 'mr-1 order-first' : 'ml-1'}`}>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 rounded-full"
                                                        title="Add Reaction"
                                                    >
                                                        <Smile className="h-3 w-3 text-muted-foreground" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-1 flex gap-1 transform -translate-y-8" align="center" side="top">
                                                    {['❤️', '😂', '😮', '😢', '😡', '👍'].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            className="hover:bg-muted p-1.5 rounded text-lg transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                            onClick={() => handleReaction(msg.id, emoji)}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className="hover:bg-muted p-1.5 rounded text-muted-foreground hover:text-foreground">
                                                                +
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none">
                                                            <EmojiPicker
                                                                onEmojiClick={(emojiData) => handleReaction(msg.id, emojiData.emoji)}
                                                                theme={Theme.DARK}
                                                                emojiStyle="native"
                                                                lazyLoadEmojis={true}
                                                                suggestedEmojisMode={SuggestionMode.RECENT}
                                                                previewConfig={{ showPreview: false } as any}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </PopoverContent>
                                            </Popover>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 rounded-full"
                                                onClick={() => handleReply(msg)}
                                                title="Reply (Double-tap message)"
                                            >
                                                <Reply className="h-3 w-3 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Timestamps & Status - Outside the flex row to not affect avatar alignment */}
                                    {isLastInGroup && (
                                        <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'mr-1 justify-end' : 'ml-10 justify-start'} animate-in fade-in duration-300`}>
                                            <span className="text-[10px] opacity-70">
                                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                            </span>
                                            {isMe && msg.read && (
                                                <span className="text-[10px] text-primary font-medium">• Seen</span>
                                            )}
                                            {isMe && !msg.read && (
                                                <span className="text-[10px] opacity-50">• Sent</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {/* Typing Indicator Bubble — Instagram Style */}
                    {typingFriends.has(friendId) && (
                        <div className="flex gap-2.5 items-end justify-start animate-in fade-in slide-in-from-bottom-2 duration-300 mb-1">
                            <div className="w-7 h-7 flex-shrink-0 rounded-full bg-primary/10 overflow-hidden ring-1 ring-border/50">
                                {friend?.avatarUrl ? (
                                    <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold">
                                        {friend?.username?.slice(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="bg-[#2a2a2d] rounded-2xl rounded-bl-sm px-5 py-3 flex items-center gap-[5px] shadow-md">
                                <div className="w-[7px] h-[7px] bg-[#8e8e93] rounded-full" style={{ animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                                <div className="w-[7px] h-[7px] bg-[#8e8e93] rounded-full" style={{ animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                                <div className="w-[7px] h-[7px] bg-[#8e8e93] rounded-full" style={{ animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                            </div>
                            <style>{`
                                @keyframes typingDot {
                                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                                    30% { transform: translateY(-4px); opacity: 1; }
                                }
                            `}</style>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Emoji Picker — Inside modal with arrow */}
                {showEmojiPicker && (
                    <div className="relative border-t bg-card z-10" style={{ overflow: 'visible' }}>
                        {/* Arrow pointing down to emoji button */}
                        <div className="absolute" style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: 'none', borderTop: '8px solid hsl(var(--card))', bottom: '-8px', left: '28px', zIndex: 52 }} />
                        <div className="p-0 animate-in slide-in-from-bottom-2 duration-200">
                            <EmojiPicker
                                theme={Theme.DARK}
                                onEmojiClick={(emoji) => {
                                    setNewMessage(prev => prev + emoji.emoji);
                                }}
                                width="100%"
                                height={320}
                                lazyLoadEmojis
                                searchPlaceholder="Search emoji"
                                skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
                                previewConfig={{ showPreview: false } as any}
                            />
                        </div>
                    </div>
                )}

                {/* GIF Picker — Inside modal with arrow */}
                {showGifPicker && (
                    <div className="relative border-t bg-card z-10" style={{ overflow: 'visible' }}>
                        {/* Arrow pointing down to GIF button */}
                        <div className="absolute" style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: 'none', borderTop: '8px solid hsl(var(--card))', bottom: '-8px', left: '100px', zIndex: 52 }} />
                        <div className="p-3 h-[300px] flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                            <Input
                                placeholder="Search GIFs..."
                                value={gifSearch}
                                onChange={(e) => setGifSearch(e.target.value)}
                                className="mb-2 bg-muted/50 border-border/50"
                                autoFocus
                            />
                            <div
                                className="flex-1 overflow-y-auto pr-1"
                                onScroll={(e) => {
                                    const el = e.currentTarget;
                                    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
                                        loadMoreGifs();
                                    }
                                }}
                            >
                                {isSearchingGifs ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ columns: 2, columnGap: '8px' }}>
                                            {gifs.map((gif) => (
                                                <div key={gif.id} className="relative group overflow-hidden rounded-lg bg-muted mb-2" style={{ breakInside: 'avoid' }}>
                                                    <img
                                                        src={gif.media_formats.tinygif.url}
                                                        alt={gif.title}
                                                        className="w-full h-auto object-contain cursor-pointer transition-transform group-hover:scale-105 rounded-lg"
                                                        onClick={() => sendGif(gif)}
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {isLoadingMoreGifs && (
                                            <div className="flex items-center justify-center py-3">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
                                <span className="text-[10px] text-muted-foreground">Powered by Tenor</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => setShowGifPicker(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recording & Preview Section */}
                {(isRecording || recordedAudio) && (
                    <div className="px-4 pt-2">
                        {isRecording && (
                            <div className="flex items-center gap-3 bg-destructive/10 p-2 rounded-lg animate-in slide-in-from-bottom-2">
                                <div className="flex-1 h-6 flex items-center px-1 overflow-hidden">
                                    {recordingStream && (
                                        <AudioVisualizer
                                            stream={recordingStream}
                                            isRecording={isRecording}
                                            barColor="#ef4444"
                                            gap={2}
                                            barWidth={2}
                                        />
                                    )}
                                </div>
                                <span className="text-sm font-medium text-destructive tabular-nums whitespace-nowrap">
                                    {formatDuration(recordingDuration)}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelRecording}
                                    className="h-6 w-6 p-0 hover:bg-destructive/20 text-destructive"
                                    title="Cancel"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={stopRecording}
                                    className="h-6 px-2 text-xs bg-destructive hover:bg-destructive/90 text-white"
                                >
                                    Stop
                                </Button>
                            </div>
                        )}

                        {recordedAudio && (
                            <div className="relative inline-flex items-center gap-2 bg-muted p-2 rounded-lg animate-in fade-in zoom-in-95">
                                <button
                                    type="button"
                                    onClick={cancelRecording}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 z-10 shadow-sm"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <VoiceMessage src={recordedAudio.url} isMe={true} />
                                <Button
                                    type="button"
                                    size="icon"
                                    className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                                    onClick={confirmSendVoiceMessage}
                                    disabled={isSending}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Reply Banner */}
                {replyingTo && (
                    <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Reply className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-medium text-primary">
                                    Replying to {replyingTo.fromUserId === user?.id ? 'yourself' : friend?.username}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                    {replyingTo.message || (replyingTo.attachmentType ? `[${replyingTo.attachmentType}]` : 'Message')}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-background/80"
                            onClick={() => setReplyingTo(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-3 bg-background border-t mt-0 relative z-0">
                    <div className="flex items-end gap-2 bg-muted/50 rounded-2xl p-1.5 transition-colors focus-within:bg-muted focus-within:ring-1 focus-within:ring-primary/20">
                        {/* Attach buttons */}
                        <div className="flex items-center gap-0.5 pb-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                                            onClick={() => {
                                                setShowEmojiPicker(!showEmojiPicker);
                                                setShowGifPicker(false);
                                            }}
                                            disabled={isRecording || !!recordedAudio}
                                        >
                                            <Smile className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Emoji</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isRecording || !!recordedAudio}
                                        >
                                            <Paperclip className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Attach file</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                                onChange={handleFileUpload}
                            />

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background shadow-none"
                                            onClick={() => {
                                                setShowGifPicker(!showGifPicker);
                                                setShowEmojiPicker(false);
                                            }}
                                            disabled={isRecording || !!recordedAudio}
                                        >
                                            <span className="text-[10px] font-bold border rounded px-1 min-w-[24px]">GIF</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>GIFs</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Message input */}
                        <form onSubmit={handleSend} className="flex-1 relative flex items-end gap-2">
                            <Input
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={isRecording ? "Recording audio..." : "Type a message..."}
                                disabled={isSending || isRecording || !!recordedAudio}
                                autoFocus
                                className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-2 py-2.5 h-auto max-h-32 min-h-[44px] resize-none overflow-y-auto"
                                style={{ boxShadow: 'none' }}
                                autoComplete="off"
                            />

                            <div className="flex items-center gap-1 pb-1">
                                {newMessage.trim() ? (
                                    <Button
                                        type="submit"
                                        disabled={isSending}
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
                                        disabled={!!recordedAudio}
                                    >
                                        <Mic className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div >
        </div >
    );
}

