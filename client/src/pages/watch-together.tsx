import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
    Users,
    MessageCircle,
    Copy,
    Check,
    Crown,
    ChevronLeft,
    Send,
    Smile,
    SkipBack,
    SkipForward,
    Mic,
    MicOff,
    X,
    Search,
    Paperclip,
    Music,
    Image,
    PlayCircle,
    AlertCircle,
    Smartphone,
    Minimize2,
    Maximize2,
    Maximize,
    Minimize,
    Share2,
    BarChart2,
    UserPlus,
    Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InviteFriendsModal } from "@/components/invite-friends-modal";
import { VoiceMessage } from '@/components/ui/voice-message';

import { AudioVisualizer } from '@/components/ui/audio-visualizer';
import { LinkPreview } from '@/components/link-preview';
import { useWatchTogether, WatchTogetherProvider } from '@/contexts/watch-together-context';
import { UserProfileModal } from '@/components/user-profile-modal';
import { useAuth } from '@/contexts/auth-context';
import { useVoiceChat } from '@/hooks/use-voice-chat';
import EmojiPicker, { Theme, SkinTonePickerLocation } from 'emoji-picker-react';
import { VideoPlayer, VideoPlayerRef } from '@/components/video-player';
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { RoleBadge } from "@/components/role-badge";
import { RoomPolls } from '@/components/room-polls';
import { useFriends } from '@/contexts/friends-context';
import { useToast } from '@/hooks/use-toast';
import { useSocialSocket } from '@/hooks/use-social-socket';
import { LanguageSelector } from '@/components/language-selector';
import { useChatTranslation } from '@/hooks/use-chat-translation';
import type { Show, Movie, Episode } from '@shared/schema';

// Emoji reactions
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '👏', '😢', '🎉'];

// Format message with GIFs and attachments rendered as media
function formatMessageWithMedia(text: string) {
    // Split by both GIF URLs and attachment tags
    const mediaRegex = /(https:\/\/media\.tenor\.com\/[^\s]+\.gif)|\[ATTACHMENT:(image|video|audio):([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = mediaRegex.exec(text)) !== null) {
        // Add text before this match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        // Check if it's a GIF URL
        if (match[1]) {
            parts.push(
                <img
                    key={`media-${keyIndex++}`}
                    src={match[1]}
                    alt="GIF"
                    className="max-w-[200px] max-h-[150px] rounded-lg my-1 block"
                    loading="lazy"
                />
            );
        }
        // Check if it's an attachment tag
        else if (match[2] && match[3]) {
            const type = match[2];
            const url = match[3];

            if (type === 'image') {
                parts.push(
                    <img
                        key={`media-${keyIndex++}`}
                        src={url}
                        alt="Shared image"
                        className="max-w-[200px] max-h-[150px] rounded-lg my-1 block object-cover"
                    />
                );
            } else if (type === 'video') {
                parts.push(
                    <video
                        key={`media-${keyIndex++}`}
                        src={url}
                        className="max-w-[200px] max-h-[150px] rounded-lg my-1 block"
                        controls
                    />
                );
            } else if (type === 'audio') {
                parts.push(
                    <div key={`media-${keyIndex++}`} className="my-1 block">
                        <VoiceMessage src={url} />
                    </div>
                );
            }
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
}

function WatchTogetherContent() {
    const [, params] = useRoute('/watch-together/:roomCode');
    const [, setLocation] = useLocation();
    const roomCode = params?.roomCode;

    // Auth check - require login to join watch parties
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    // Get password from URL if provided (for private room joins)
    const searchParams = new URLSearchParams(window.location.search);
    const urlPassword = searchParams.get('password');

    const {
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
        hostMuteUser,
        changeContent,
        clearError,
        polls,
        createPoll,
        votePoll,
        closePoll
    } = useWatchTogether();

    // Video player ref for sync control
    const videoPlayerRef = useRef<VideoPlayerRef>(null);

    // Custom modal state for mute/unmute notifications
    const [showMuteNotification, setShowMuteNotification] = useState(false);
    const [showUnmuteRequest, setShowUnmuteRequest] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false); // Invite modal state
    const [unmuteHandlers, setUnmuteHandlers] = useState<{ onAccept: () => void; onReject: () => void } | null>(null);

    // Voice chat with custom modal callbacks
    const {
        isMuted,
        isVoiceEnabled,
        isSpeaking,
        connectedPeers,
        error: voiceError,
        toggleMute,
        startVoice,
        stopVoice
    } = useVoiceChat({
        socket,
        roomUsers: users,
        currentUserId: currentUser?.id ?? null,
        onMutedByHost: () => {
            setShowMuteNotification(true);
            setTimeout(() => setShowMuteNotification(false), 3000);
        },
        onUnmuteRequest: (onAccept, onReject) => {
            setUnmuteHandlers({ onAccept, onReject });
            setShowUnmuteRequest(true);
        }
    });

    const [isTranslationEnabled, setIsTranslationEnabled] = useState(() => {
        const stored = localStorage.getItem('watch-together-translation-enabled');
        return stored !== 'false';
    });

    const toggleTranslation = (enabled: boolean) => {
        setIsTranslationEnabled(enabled);
        localStorage.setItem('watch-together-translation-enabled', enabled ? 'true' : 'false');
    };

    // Chat translation hook — translates messages to user's selected language
    const { getTranslatedMessage, isTranslationActive } = useChatTranslation(messages, isTranslationEnabled);

    const [username, setUsername] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(true);
    const [chatMessage, setChatMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [showPolls, setShowPolls] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [isLoadingGifs, setIsLoadingGifs] = useState(false);
    const gifNextPosRef = useRef<string | null>(null);
    const [isLoadingMoreGifs, setIsLoadingMoreGifs] = useState(false);
    const [selectedGif, setSelectedGif] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ file: File; preview: string; type: 'image' | 'video' | 'audio' } | null>(null);
    const [isPortrait, setIsPortrait] = useState(false);
    const [isSmallHeight, setIsSmallHeight] = useState(false);
    const [dismissedLandscapeHint, setDismissedLandscapeHint] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isOverlayChatMinimized, setIsOverlayChatMinimized] = useState(false);
    const [chatPosition, setChatPosition] = useState({ x: 16, y: 16 }); // top-right position in pixels from top-right
    const [pendingFriendRequests, setPendingFriendRequests] = useState<Set<string>>(new Set());
    const [selectedProfileUser, setSelectedProfileUser] = useState<{
        id?: number;
        username: string;
        avatarUrl?: string;
        authUserId?: string;
        isHost?: boolean;
        bio?: string;
        xp?: number;
        level?: number;
        badges?: any[];
        isModerator?: boolean;
        equippedSkin?: any;
        equippedProfileEffect?: any;
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
            anime?: Array<{ id: string; title: string; posterUrl: string | null }>;
        } | null;
    } | null>(null);

    // Friends system hooks
    const { sendFriendRequest, friends } = useFriends();
    const { toast } = useToast();
    const { startActivity, stopActivity } = useSocialSocket();
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const hasDraggedRef = useRef(false); // Track if actual drag motion happened
    const chatEndRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLIFrameElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const chatOverlayRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Countdown timer for scheduled rooms
    const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
    const [isScheduledRoomReady, setIsScheduledRoomReady] = useState(false);

    // Detect portrait mode on mobile
    useEffect(() => {
        const checkOrientation = () => {
            const isMobile = window.innerWidth < 768;
            const isPortraitMode = window.innerHeight > window.innerWidth;
            setIsPortrait(isMobile && isPortraitMode);
            setIsSmallHeight(window.innerHeight < 600); // Detect landscape mobile or small screens
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Detect fullscreen mode changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFS = !!(document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement);
            setIsFullscreen(isFS);
            // Reset minimized state when exiting fullscreen
            if (!isFS) {
                setIsOverlayChatMinimized(false);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);



    // Countdown timer for scheduled rooms
    useEffect(() => {
        if (!roomInfo?.scheduledFor) {
            setCountdown(null);
            setIsScheduledRoomReady(true);
            return;
        }

        const scheduledTime = new Date(roomInfo.scheduledFor).getTime();

        const updateCountdown = () => {
            const now = Date.now();
            const diff = scheduledTime - now;

            if (diff <= 0) {
                setCountdown(null);
                setIsScheduledRoomReady(true);
                return true; // Timer complete
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdown({ hours, minutes, seconds });
            setIsScheduledRoomReady(false);
            return false;
        };

        // Initial check
        if (updateCountdown()) return;

        // Update every second
        const interval = setInterval(() => {
            if (updateCountdown()) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [roomInfo?.scheduledFor]);

    // Voice recording functions
    const startRecordingMessage = async () => {
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

                // Convert blob to base64 for attachment
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    setAttachment({
                        file: new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' }),
                        preview: base64data,
                        type: 'audio'
                    });
                    // Auto-send could be implemented here, but let user preview/send explicitly
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingStream(stream);
            setRecordingDuration(0);

            recordingTimerRef.current = window.setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecordingMessage = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setRecordingStream(null);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        }
    };

    const cancelRecordingMessage = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setRecordingStream(null);
            audioChunksRef.current = []; // Clear chunks
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            // Ensure stream tracks are stopped
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
    };

    // Handle file attachment - convert to base64 for sharing
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 2MB for base64 efficiency)
        if (file.size > 2 * 1024 * 1024) {
            alert('File too large. Max 2MB allowed for sharing.');
            return;
        }

        let type: 'image' | 'video' | 'audio';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else {
            alert('Unsupported file type. Only images, videos, and audio allowed.');
            return;
        }

        // Convert to base64 data URL
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setAttachment({ file, preview: base64, type });
        };
        reader.readAsDataURL(file);
    };

    // Remove attachment
    const removeAttachment = () => {
        setAttachment(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Search GIFs from Tenor API
    const searchGifs = async (query: string, loadMore = false) => {
        if (!query.trim()) {
            setGifs([]);
            gifNextPosRef.current = null;
            return;
        }
        if (loadMore) {
            setIsLoadingMoreGifs(true);
        } else {
            setIsLoadingGifs(true);
        }
        try {
            const endpoint = query === 'trending' ? 'featured' : 'search';
            let url = `https://tenor.googleapis.com/v2/${endpoint}?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&client_key=streamvault&limit=30&media_filter=gif,tinygif`;
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
            console.error('GIF search error:', error);
            if (!loadMore) setGifs([]);
        }
        setIsLoadingGifs(false);
        setIsLoadingMoreGifs(false);
    };

    // Load more GIFs handler for infinite scroll
    const loadMoreGifs = () => {
        if (isLoadingMoreGifs || !gifNextPosRef.current) return;
        const query = gifSearch || 'trending';
        searchGifs(query, true);
    };

    // Load trending GIFs when GIF picker opens
    useEffect(() => {
        if (showGifPicker && gifs.length === 0 && !gifSearch) {
            searchGifs('trending');
        }
    }, [showGifPicker]);

    // Fetch all shows to find by ID (API doesn't support direct ID lookup)
    const { data: allShows } = useQuery<Show[]>({
        queryKey: ['/api/shows'],
        enabled: !!roomInfo && roomInfo.contentType === 'show'
    });
    const show = allShows?.find(s => s.id === roomInfo?.contentId);

    // Fetch all movies to find by ID
    const { data: allMovies } = useQuery<Movie[]>({
        queryKey: ['/api/movies'],
        enabled: !!roomInfo && roomInfo.contentType === 'movie'
    });
    const movie = allMovies?.find(m => m.id === roomInfo?.contentId);

    // Fetch all episodes for the show, then find the one we need
    const { data: episodes } = useQuery<Episode[]>({
        queryKey: ['/api/episodes', show?.id],
        enabled: !!show?.id
    });

    // Find the episode by ID from the episodes array
    const episode = episodes?.find(ep => ep.id === roomInfo?.episodeId);

    // Fetch blog posts to get IMDB links for subtitles
    const { data: blogPosts = [] } = useQuery<any[]>({
        queryKey: ['/api/blog'],
        enabled: !!(show?.id || movie?.id)
    });

    // Find matching blog post for this content to get external links
    const blogPost = (show || movie) ? blogPosts.find(
        (post) => post.contentId === (show?.id || movie?.id) || post.slug === (show?.slug || movie?.slug)
    ) : null;

    // Broadcast watch activity to friends
    useEffect(() => {
        if (roomInfo && isAuthenticated && roomCode) {
            // Get slug from show/movie if available
            const contentSlug = show?.slug || movie?.slug || undefined;

            // Start activity when room is joined
            startActivity({
                roomCode: roomInfo.roomCode,
                contentType: roomInfo.contentType,
                contentId: roomInfo.contentId,
                contentSlug: contentSlug,
                contentTitle: roomInfo.contentTitle || 'Unknown',
                contentPoster: roomInfo.contentPoster || undefined,
                episodeTitle: roomInfo.episodeTitle || undefined,
            });
        }

        // Stop activity when component unmounts or room changes
        return () => {
            if (isAuthenticated) {
                stopActivity();
            }
        };
    }, [roomInfo?.roomCode, roomInfo?.contentTitle, isAuthenticated, startActivity, stopActivity, show?.slug, movie?.slug]);

    // State for subtitle tracks
    const [subtitleTracks, setSubtitleTracks] = useState<Array<{
        file: string;
        label: string;
        kind: 'captions' | 'subtitles';
        default?: boolean;
    }>>([]);

    // Fetch subtitles when content loads
    useEffect(() => {
        const fetchSubtitles = async () => {
            if (!blogPost) return;

            try {
                // Parse IMDB ID from blog post external links
                const externalLinks = blogPost.externalLinks
                    ? (typeof blogPost.externalLinks === 'string'
                        ? JSON.parse(blogPost.externalLinks)
                        : blogPost.externalLinks)
                    : null;

                const imdbLink = externalLinks?.imdb;
                if (!imdbLink) {
                    console.log('No IMDB link found for Watch Together subtitle search');
                    return;
                }

                // Extract just the IMDB ID (tt1234567) from the link
                const imdbMatch = imdbLink.match(/tt\d+/);
                if (!imdbMatch) {
                    console.log('Invalid IMDB ID format');
                    return;
                }

                // For shows, include season and episode
                const season = episode?.season;
                const ep = episode?.episodeNumber;
                const searchUrl = (roomInfo?.contentType === 'show' || roomInfo?.contentType === 'anime') && season && ep
                    ? `/api/subtitles/saved?imdbId=${imdbMatch[0]}&season=${season}&episode=${ep}`
                    : `/api/subtitles/saved?imdbId=${imdbMatch[0]}`;

                console.log(`🔍 Fetching subtitles for Watch Together: ${imdbMatch[0]}`);

                const response = await fetch(searchUrl);

                if (!response.ok) {
                    console.error('Watch Together subtitle fetch failed');
                    return;
                }

                const data = await response.json();

                if (data.subtitles && data.subtitles.length > 0) {
                    console.log(`✅ Found ${data.subtitles.length} assigned subtitles for Watch Together`);

                    // Language code to full name mapping
                    const langNames: Record<string, string> = {
                        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
                        'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
                        'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
                        'tr': 'Turkish', 'pl': 'Polish', 'nl': 'Dutch', 'sv': 'Swedish'
                    };

                    // Convert to VideoPlayer format
                    const tracks = data.subtitles.map((sub: any, index: number) => ({
                        file: sub.url,
                        label: langNames[sub.language] || sub.language || 'Unknown',
                        kind: 'subtitles' as const,
                        default: sub.language === 'en' || index === 0
                    }));

                    setSubtitleTracks(tracks);
                } else {
                    console.log('No assigned subtitles found for Watch Together');
                }
            } catch (error) {
                console.error('Error fetching Watch Together subtitles:', error);
            }
        };

        fetchSubtitles();
    }, [blogPost, episode?.id, roomInfo?.contentType]);

    const content = roomInfo?.contentType === 'show' ? show : movie;
    const title = content?.title || 'Watch Together';

    // Parse audio tracks from episode/movie data (same as watch.tsx and watch-movie.tsx)
    const parsedAudioTracks = (episode?.audioTracks || movie?.audioTracks)
        ? JSON.parse((episode?.audioTracks || movie?.audioTracks) as string)
        : [];

    // Debug logging
    console.log('🎬 Watch Together Debug:', {
        'roomInfo.contentType': roomInfo?.contentType,
        'roomInfo.contentId': roomInfo?.contentId,
        'roomInfo.episodeId': roomInfo?.episodeId,
        allShowsCount: allShows?.length,
        'First show ID sample': allShows?.[0]?.id,
        showFound: show?.title,
        showId: show?.id,
        'contentId matches show': show?.id === roomInfo?.contentId,
        'String match': String(show?.id) === String(roomInfo?.contentId),
        episodesCount: episodes?.length,
        'First episode ID sample': episodes?.[0]?.id,
        episodeFound: episode?.title,
        googleDriveUrl: episode?.googleDriveUrl || movie?.googleDriveUrl
    });

    // Auto-create or auto-join if coming from create-room page
    useEffect(() => {
        const storedUsername = sessionStorage.getItem('watchTogether_username');
        const isCreator = sessionStorage.getItem('watchTogether_isCreator');
        const contentType = sessionStorage.getItem('watchTogether_contentType') as 'show' | 'movie' | 'anime' | null;
        const contentId = sessionStorage.getItem('watchTogether_contentId');
        const episodeId = sessionStorage.getItem('watchTogether_episodeId');
        const contentTitle = sessionStorage.getItem('watchTogether_contentTitle');
        const contentPoster = sessionStorage.getItem('watchTogether_contentPoster');
        const isPublicStr = sessionStorage.getItem('watchTogether_isPublic');
        const storedPassword = sessionStorage.getItem('watchTogether_password');
        const storedDescription = sessionStorage.getItem('watchTogether_description');
        const storedScheduledFor = sessionStorage.getItem('watchTogether_scheduledFor');

        if (!isConnected || roomInfo) return;

        // If this is a new room creation request
        if (roomCode === 'NEW' && isCreator === 'true' && storedUsername && contentType && contentId) {
            // Clear the stored data
            sessionStorage.removeItem('watchTogether_username');
            sessionStorage.removeItem('watchTogether_isCreator');
            sessionStorage.removeItem('watchTogether_contentType');
            sessionStorage.removeItem('watchTogether_contentId');
            sessionStorage.removeItem('watchTogether_episodeId');
            sessionStorage.removeItem('watchTogether_contentTitle');
            sessionStorage.removeItem('watchTogether_contentPoster');
            sessionStorage.removeItem('watchTogether_isPublic');
            sessionStorage.removeItem('watchTogether_password');
            sessionStorage.removeItem('watchTogether_description');
            sessionStorage.removeItem('watchTogether_scheduledFor');

            // Also clear auto-rejoin localStorage to prevent rejoining old room
            localStorage.removeItem('watch-together-username');
            localStorage.removeItem('watch-together-room');

            // Create the room with public/private settings
            setUsername(storedUsername);
            createRoom(
                contentType,
                contentId,
                storedUsername,
                user?.avatarUrl || undefined,
                episodeId || undefined,
                user?.id?.toString(), // authUserId
                {
                    contentTitle: contentTitle || 'Untitled',
                    contentPoster: contentPoster || undefined,
                    isPublic: isPublicStr !== 'false',
                    password: storedPassword || undefined,
                    description: storedDescription || undefined,
                    scheduledFor: storedScheduledFor || undefined,
                }
            );
            setShowJoinModal(false);
        }
        // If joining an existing room with stored username
        else if (roomCode && roomCode !== 'NEW' && storedUsername) {
            sessionStorage.removeItem('watchTogether_username');
            sessionStorage.removeItem('watchTogether_isCreator');

            setUsername(storedUsername);
            joinRoom(roomCode, storedUsername, user?.avatarUrl || undefined, urlPassword || undefined, user?.id?.toString());
            setShowJoinModal(false);
        }
    }, [isConnected, roomCode, roomInfo, joinRoom, createRoom, urlPassword]);

    // Update URL when room is created (replace /NEW with actual room code)
    useEffect(() => {
        if (roomInfo?.roomCode && roomCode === 'NEW') {
            window.history.replaceState({}, '', `/watch-together/${roomInfo.roomCode}`);
        }
    }, [roomInfo, roomCode]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-start voice chat when user joins (muted by default)
    useEffect(() => {
        if (currentUser && !isVoiceEnabled && socket) {
            console.log('🎤 Auto-starting voice chat (muted by default)...');
            startVoice();
        }
    }, [currentUser, socket]);

    // Auto-rejoin on page load if we have saved credentials
    useEffect(() => {
        // Skip auto-rejoin if we're creating a new room
        if (!isConnected || currentUser || !roomCode || roomCode === 'NEW') return;

        // Require authentication to join watch parties
        if (!authLoading && !isAuthenticated) {
            // Redirect to login with return URL
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            setLocation(`/login?redirect=${returnUrl}`);
            return;
        }

        // Use authenticated user's username if available
        if (isAuthenticated && user?.username) {
            console.log('🔐 Auto-joining with authenticated user:', user.username);
            setUsername(user.username);
            // Small delay to ensure socket is ready
            setTimeout(() => {
                joinRoom(roomCode, user.username, user.avatarUrl || undefined, undefined, user.id.toString());
                setShowJoinModal(false);
            }, 500);
        }
    }, [isConnected, currentUser, roomCode, joinRoom, isAuthenticated, authLoading, user, setLocation]);

    // Video sync effect - listen for sync events from host and apply to player
    useEffect(() => {
        // Only attach listener for non-host viewers
        if (!socket || isHost) return;

        const handleVideoSync = (state: { isPlaying: boolean; currentTime: number; playbackRate: number; currentSubtitleIndex?: number }) => {
            console.log('🎬 Received video sync:', state);

            const player = videoPlayerRef.current;
            if (!player) {
                console.log('🎬 VideoPlayer ref not available yet');
                return;
            }

            // Apply playback rate
            if (state.playbackRate !== player.getPlaybackRate()) {
                console.log('🎬 Applying playback rate:', state.playbackRate);
                player.setPlaybackRate(state.playbackRate);
            }

            // Sync position if difference is more than 2 seconds
            const currentTime = player.getCurrentTime();
            if (Math.abs(currentTime - state.currentTime) > 2) {
                console.log('🎬 Syncing position from', currentTime, 'to', state.currentTime);
                player.seek(state.currentTime);
            }

            // Sync play/pause state
            if (state.isPlaying && player.isPaused()) {
                console.log('🎬 Playing video (sync)');
                player.play();
            } else if (!state.isPlaying && !player.isPaused()) {
                console.log('🎬 Pausing video (sync)');
                player.pause();
            }

            // Sync subtitle state if present
            if (state.currentSubtitleIndex !== undefined) {
                console.log('🎬 Applying subtitle index (sync):', state.currentSubtitleIndex);
                player.setCaptions(state.currentSubtitleIndex);
            }
        };

        console.log('🎬 Attaching video:sync listener for viewer');
        socket.on('video:sync', handleVideoSync);

        // Listen for subtitle sync from host
        const handleSubtitleSync = (data: { subtitleIndex: number }) => {
            console.log('🎬 Received subtitle sync:', data.subtitleIndex, '(index -1 means off)');
            const player = videoPlayerRef.current;
            if (player) {
                console.log('🎬 Setting captions to index:', data.subtitleIndex);
                player.setCaptions(data.subtitleIndex);
            } else {
                console.log('🎬 VideoPlayer ref not ready for subtitle sync');
            }
        };
        socket.on('video:subtitle', handleSubtitleSync);

        return () => {
            console.log('🎬 Removing video:sync listener');
            socket.off('video:sync', handleVideoSync);
            socket.off('video:subtitle', handleSubtitleSync);
        };
    }, [socket, isHost]);

    // Initial sync for viewers
    useEffect(() => {
        if (!isHost && isConnected && videoState && videoPlayerRef.current) {
            console.log('🎬 Performing initial video state sync from context:', videoState);
            const player = videoPlayerRef.current;
            
            // Apply speed
            if (videoState.playbackRate !== player.getPlaybackRate()) {
                player.setPlaybackRate(videoState.playbackRate);
            }
            // Apply time
            if (Math.abs(player.getCurrentTime() - videoState.currentTime) > 2) {
                player.seek(videoState.currentTime);
            }
            // Apply subtitles
            if (videoState.currentSubtitleIndex !== undefined) {
                player.setCaptions(videoState.currentSubtitleIndex);
            }
            // Apply play state
            if (videoState.isPlaying && player.isPaused()) {
                player.play();
            } else if (!videoState.isPlaying && !player.isPaused()) {
                player.pause();
            }
        }
    }, [isHost, isConnected, videoState, roomInfo?.contentId, roomInfo?.episodeId]);

    // Listen for extension messages (for syncing with external Google Drive tabs)
    useEffect(() => {
        const handleExtensionMessage = (event: MessageEvent) => {
            // Only accept messages from our extension
            if (event.data?.source !== 'streamvault-extension') return;

            if (event.data?.type === 'VIDEO_SYNC') {
                console.log('📺 Extension sync event received:', event.data);

                // If we're host, broadcast to other viewers
                if (isHost) {
                    switch (event.data.action) {
                        case 'play':
                            videoPlay(event.data.time || 0);
                            break;
                        case 'pause':
                            videoPause(event.data.time || 0);
                            break;
                        case 'seek':
                            videoSeek(event.data.time || 0);
                            break;
                    }
                }
            }
        };

        window.addEventListener('message', handleExtensionMessage);

        // Notify extension that page is ready for sync
        console.log('📺 Watch Together page ready for extension sync');

        return () => {
            window.removeEventListener('message', handleExtensionMessage);
        };
    }, [isHost, videoPlay, videoPause, videoSeek]);

    // Handle join
    const handleJoin = () => {
        if (username.trim() && roomCode) {
            // Save to localStorage for auto-rejoin on page refresh
            localStorage.setItem('watch-together-username', username.trim());
            localStorage.setItem('watch-together-room', roomCode);

            // Pass URL password for private rooms, and auth user ID for friend requests
            joinRoom(roomCode, username.trim(), user?.avatarUrl || undefined, urlPassword || undefined, user?.id?.toString());
            setShowJoinModal(false);
        }
    };

    // Handle leave
    const handleLeave = () => {
        // Clear localStorage since user intentionally left
        localStorage.removeItem('watch-together-username');
        localStorage.removeItem('watch-together-room');
        leaveRoom();
        setLocation('/');
    };

    // Copy room code
    const copyRoomCode = () => {
        if (roomInfo?.roomCode) {
            navigator.clipboard.writeText(`${window.location.origin}/watch-together/${roomInfo.roomCode}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Add friend from watch room
    const handleAddFriend = async (userId: string, username: string) => {
        if (!isAuthenticated) {
            toast({
                title: 'Login Required',
                description: 'Please login to add friends',
                variant: 'destructive',
            });
            return;
        }

        // Check if already friends
        const isAlreadyFriend = friends.some(f => f.friendId === userId);
        if (isAlreadyFriend) {
            toast({
                title: 'Already Friends',
                description: `You are already friends with ${username}`,
            });
            return;
        }

        setPendingFriendRequests(prev => new Set(Array.from(prev).concat(userId)));

        try {
            await sendFriendRequest(userId);
            // Toasts are handled by the friends context
        } catch (error) {
            console.error('Failed to send friend request', error);
        }

        setPendingFriendRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
        });
    };

    // View user profile
    const handleViewProfile = async (roomUser: { username: string; avatarUrl?: string; authUserId?: string; isHost: boolean }) => {

        // If user has authUserId, fetch their full profile from API
        let bio: string | undefined;
        let xp: number | undefined;
        let level: number | undefined;
        let badges: any[] | undefined;
        let equippedSkin: any | undefined;
        let equippedProfileEffect: any | undefined;
        let socialLinks: any = null;
        let favorites: any = null;
        let isModerator: boolean | undefined;

        if (roomUser.authUserId) {
            try {
                const response = await fetch(`/api/users/${roomUser.authUserId}/profile`);
                if (response.ok) {
                    const profile = await response.json();
                    bio = profile.bio;
                    xp = profile.xp;
                    level = profile.level;
                    badges = profile.badges;
                    equippedSkin = profile.equippedSkin;
                    equippedProfileEffect = profile.equippedProfileEffect;
                    socialLinks = profile.socialLinks;
                    favorites = profile.favorites;
                    isModerator = profile.isModerator;
                }
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            }
        }

        setSelectedProfileUser({
            username: roomUser.username,
            avatarUrl: roomUser.avatarUrl,
            authUserId: roomUser.authUserId,
            isHost: roomUser.isHost,
            bio,
            xp,
            level,
            badges,
            equippedSkin,
            equippedProfileEffect,
            socialLinks,
            favorites,
            isModerator,
        });
    };

    // Share room link via WhatsApp
    const shareViaWhatsApp = () => {
        if (roomInfo?.roomCode) {
            const url = `${window.location.origin}/watch-together/${roomInfo.roomCode}`;
            const text = `🎬 Join my watch party on StreamVault!\n${url}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    // Share room link via Telegram
    const shareViaTelegram = () => {
        if (roomInfo?.roomCode) {
            const url = `${window.location.origin}/watch-together/${roomInfo.roomCode}`;
            const text = `🎬 Join my watch party on StreamVault!`;
            window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    // Share room link via Twitter/X
    const shareViaTwitter = () => {
        if (roomInfo?.roomCode) {
            const url = `${window.location.origin}/watch-together/${roomInfo.roomCode}`;
            const text = `🎬 Join my watch party on StreamVault!`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        }
    };

    // Send chat message
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();

        // Build message with optional attachment and GIF
        let messageToSend = chatMessage.trim();

        // If there's a selected GIF, include it in the message
        if (selectedGif) {
            messageToSend = messageToSend ? `${messageToSend} ${selectedGif}` : selectedGif;
        }

        // If there's an attachment, include its preview URL in the message
        if (attachment) {
            const attachmentTag = `[ATTACHMENT:${attachment.type}:${attachment.preview}]`;
            messageToSend = messageToSend ? `${messageToSend} ${attachmentTag}` : attachmentTag;
        }

        if (messageToSend) {
            sendMessage(messageToSend);
            setChatMessage('');
            setSelectedGif(null);
            removeAttachment();
        }
    };

    // Extract Google Drive ID (handles both full URLs and plain IDs)
    const extractDriveId = (url: string | undefined) => {
        if (!url) return null;
        // Check if it's a full URL with /d/ pattern
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        // Check for /file/d/ pattern
        const match2 = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match2) return match2[1];
        // If it's already just an ID (no slashes), return it directly
        if (!url.includes('/') && url.length > 10) return url;
        return null;
    };

    const driveId = episode?.googleDriveUrl
        ? extractDriveId(episode.googleDriveUrl)
        : movie?.googleDriveUrl
            ? extractDriveId(movie.googleDriveUrl)
            : null;

    // Toggle fullscreen for the entire watch container (so chat overlay stays visible)
    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!isFullscreen) {
                // Enter fullscreen
                if (containerRef.current.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                } else if ((containerRef.current as any).webkitRequestFullscreen) {
                    await (containerRef.current as any).webkitRequestFullscreen();
                } else if ((containerRef.current as any).mozRequestFullScreen) {
                    await (containerRef.current as any).mozRequestFullScreen();
                } else if ((containerRef.current as any).msRequestFullscreen) {
                    await (containerRef.current as any).msRequestFullscreen();
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                    await (document as any).mozCancelFullScreen();
                } else if ((document as any).msExitFullscreen) {
                    await (document as any).msExitFullscreen();
                }
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    // Unified drag handlers for Mouse and Touch
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!chatOverlayRef.current) return;
        // Don't prevent default on touch to allow scrolling inside the chat if needed
        // but we need to stop propagation to avoid triggering other click handlers
        e.stopPropagation();

        setIsDragging(true);
        hasDraggedRef.current = false; // Reset drag tracking
        const rect = chatOverlayRef.current.getBoundingClientRect();

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            e.preventDefault(); // Prevent text selection on mouse drag
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        let clientX, clientY;
        if ('touches' in e) {
            // Prevent scrolling page while dragging chat
            e.preventDefault();
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            e.preventDefault();
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        hasDraggedRef.current = true; // Mark that drag motion occurred
        const containerRect = containerRef.current.getBoundingClientRect();
        const chatWidth = chatOverlayRef.current?.offsetWidth || 320;
        const chatHeight = chatOverlayRef.current?.offsetHeight || 400;

        // Calculate new position (clamped to container bounds)
        let newX = clientX - containerRect.left - dragOffset.x;
        let newY = clientY - containerRect.top - dragOffset.y;

        // Clamp to bounds
        newX = Math.max(0, Math.min(containerRect.width - chatWidth, newX));
        newY = Math.max(0, Math.min(containerRect.height - chatHeight, newY));

        setChatPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    // Handle click on minimized chat - only expand if not dragged
    const handleMinimizedClick = () => {
        if (!hasDraggedRef.current) {
            setIsOverlayChatMinimized(false);
        }
        hasDraggedRef.current = false; // Reset for next interaction
    };

    // Error display
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-black flex items-center justify-center">
                <div className="text-center p-8 bg-card rounded-xl border border-border max-w-md">
                    <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => { clearError(); setLocation('/'); }}>
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    // Join modal
    if (showJoinModal && !roomInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background via-background to-black flex items-center justify-center p-4">
                <Helmet>
                    <title>Join Watch Party | StreamVault</title>
                    <meta name="description" content="Join a synchronized watch party and enjoy movies and TV shows together with friends in real-time. Chat, react, and use voice chat while watching!" />
                    <link rel="canonical" href="https://streamvault.live/watch-together" />
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content="Watch Together - StreamVault Watch Party" />
                    <meta property="og:description" content="Sync up with friends and watch movies or TV shows together in real-time. Chat, react with emojis, and use voice chat!" />
                    <meta property="og:image" content="https://streamvault.live/og-watch-together.png" />
                    <meta property="og:url" content="https://streamvault.live/watch-together" />
                    <meta property="og:site_name" content="StreamVault" />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="Watch Together - StreamVault Watch Party" />
                    <meta name="twitter:description" content="Sync up with friends and watch movies or TV shows together in real-time!" />
                    <meta name="twitter:image" content="https://streamvault.live/og-watch-together.png" />
                </Helmet>
                <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full">
                    <h1 className="text-3xl font-bold mb-2 text-center">🎬 Watch Together</h1>
                    <p className="text-muted-foreground text-center mb-6">
                        Join room: <span className="font-mono text-primary font-bold">{roomCode}</span>
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Your Name</label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your name..."
                                className="text-lg"
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            />
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleJoin}
                            disabled={!username.trim() || !isConnected}
                        >
                            {isConnected ? 'Join Room' : 'Connecting...'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`min-h-screen bg-gradient-to-b from-background via-background to-black ${isFullscreen ? 'bg-black' : ''}`}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
        >
            <Helmet>
                <title>Watch Together: {title} | StreamVault</title>
                <meta name="description" content={`Watch ${title} together with friends in a synchronized watch party. Chat, react, and enjoy together!`} />
                <link rel="canonical" href={`https://streamvault.live/watch-together/${roomInfo?.roomCode}`} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`Watch ${title} Together - StreamVault Party`} />
                <meta property="og:description" content={`Join this watch party and enjoy ${title} with friends in real-time sync!`} />
                <meta property="og:image" content="https://streamvault.live/og-watch-together.png" />
                <meta property="og:url" content={`https://streamvault.live/watch-together/${roomInfo?.roomCode}`} />
                <meta property="og:site_name" content="StreamVault" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`Watch ${title} Together`} />
                <meta name="twitter:description" content={`Join this watch party for ${title}!`} />
                <meta name="twitter:image" content="https://streamvault.live/og-watch-together.png" />
            </Helmet>

            {/* Landscape Mode Hint Overlay for Mobile */}
            {isPortrait && !dismissedLandscapeHint && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative">
                        <Smartphone className="w-16 h-16 text-primary rotate-90 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold mt-6 text-white">Rotate Your Phone</h2>
                    <p className="text-muted-foreground mt-2 max-w-xs">
                        For the best Watch Together experience, please switch to landscape mode
                    </p>
                    <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => setDismissedLandscapeHint(true)}
                    >
                        Continue Anyway
                    </Button>
                </div>
            )}

            {/* Custom Mute Notification */}
            {showMuteNotification && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100]">
                    <div className="bg-red-600 text-white px-8 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-pulse">
                        <MicOff className="w-6 h-6" />
                        <span className="font-semibold">The host has muted you</span>
                    </div>
                </div>
            )}

            {/* Custom Unmute Request Modal */}
            {showUnmuteRequest && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                                <Mic className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Unmute Request</h3>
                            <p className="text-muted-foreground mt-2">
                                The host is asking you to unmute your microphone. Do you want to speak?
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    unmuteHandlers?.onReject();
                                    setShowUnmuteRequest(false);
                                    setUnmuteHandlers(null);
                                }}
                            >
                                Stay Muted
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    unmuteHandlers?.onAccept();
                                    setShowUnmuteRequest(false);
                                    setUnmuteHandlers(null);
                                }}
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Unmute
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Reactions */}
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {reactions.map((reaction) => {
                    // Use reaction.id to generate a deterministic position
                    const hash = reaction.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const leftPos = (hash % 70) + 15;
                    return (
                        <div
                            key={reaction.id}
                            className="absolute text-4xl animate-bounce"
                            style={{
                                left: `${leftPos}%`,
                                bottom: '100px',
                                animation: 'floatUp 2s ease-out forwards'
                            }}
                        >
                            {reaction.emoji}
                        </div>
                    );
                })}
            </div>

            {/* Floating Fullscreen Exit Button (visible only in fullscreen) */}
            {isFullscreen && (
                <button
                    onClick={toggleFullscreen}
                    className="fixed top-4 right-4 z-[9999] w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-all shadow-xl hover:scale-110"
                    title="Exit Fullscreen"
                >
                    <Minimize className="h-5 w-5" />
                </button>
            )}

            {/* Header - Hidden in Fullscreen */}
            {!isFullscreen && (
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={handleLeave}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="font-bold">{title}</h1>
                                {episode && <p className="text-sm text-muted-foreground">S{episode.season} E{episode.episodeNumber}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Room Code */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyRoomCode}
                                className="font-mono"
                            >
                                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                {roomInfo?.roomCode}
                            </Button>

                            {/* Share Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={copyRoomCode} className="cursor-pointer">
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={shareViaWhatsApp} className="cursor-pointer">
                                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        WhatsApp
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={shareViaTelegram} className="cursor-pointer">
                                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                        </svg>
                                        Telegram
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={shareViaTwitter} className="cursor-pointer">
                                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                        Twitter / X
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>




                            {/* Users Count - Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <Users className="h-4 w-4 mr-2" />
                                        {users.length}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <div className="p-2 border-b border-border flex justify-between items-center">
                                        <span className="text-sm font-semibold">Viewers ({users.length})</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setShowInviteModal(true);
                                            }}
                                        >
                                            <UserPlus className="h-3 w-3 mr-1" />
                                            Invite
                                        </Button>
                                    </div>

                                    {/* Invite Modal */}
                                    <InviteFriendsModal
                                        roomCode={roomInfo?.roomCode || ''}
                                        roomTitle={title}
                                        open={showInviteModal}
                                        onOpenChange={setShowInviteModal}
                                    />
                                    <div className="max-h-64 overflow-y-auto">
                                        {users.map((roomUser) => {
                                            const isRoomUserSpeaking = roomUser.id === currentUser?.id
                                                ? (isSpeaking && !isMuted)
                                                : speakingUsers.has(roomUser.id);

                                            return (
                                                <div
                                                    key={roomUser.id}
                                                    className={`flex items-center justify-between p-2 hover:bg-accent/50 ${isRoomUserSpeaking ? 'bg-green-500/10' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        {/* Avatar - Clickable to view profile, with speaking glow ring */}
                                                        <div className="relative flex-shrink-0">
                                                            <button
                                                                onClick={() => handleViewProfile(roomUser)}
                                                                className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium overflow-hidden cursor-pointer transition-all ${isRoomUserSpeaking ? 'ring-2 ring-green-400 shadow-[0_0_10px_3px_rgba(74,222,128,0.6)]' : 'hover:ring-2 hover:ring-primary/50'}`}
                                                                title={`View ${roomUser.username}'s profile`}
                                                            >
                                                                {roomUser.avatarUrl ? (
                                                                    <img src={roomUser.avatarUrl} alt={roomUser.username} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    roomUser.username.slice(0, 2).toUpperCase()
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-col min-w-0 overflow-hidden">
                                                            {/* Single row: host crown + name + badges + friend + speaking bars - all nowrap */}
                                                            <div className="flex items-center gap-1 overflow-hidden">
                                                                {roomUser.isHost && <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                                                                <span className="text-sm font-medium whitespace-nowrap truncate">{roomUser.username}</span>
                                                                <RoleBadge role={(roomUser.username.toLowerCase() === 'admin' || (roomUser as any).isAdmin) ? 'admin' : (roomUser as any).isModerator ? "moderator" : null} />
                                                                {/* Badges - max 3 shown */}
                                                                {roomUser.badges && (
                                                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                                                        {roomUser.badges.filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin')).sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime()).slice(0, 3).map((badge: any) => (
                                                                            <div key={badge.id} title={badge.name}>
                                                                                <img
                                                                                    src={badge.imageUrl}
                                                                                    alt={badge.name}
                                                                                    className="w-3.5 h-3.5 object-contain"
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {/* Friend indicator */}
                                                                {isAuthenticated && roomUser.authUserId && roomUser.authUserId !== user?.id?.toString() && friends.some(f => f.friendId === roomUser.authUserId) && (
                                                                    <span className="text-green-500 flex-shrink-0" title={`${roomUser.username} is your friend`}>
                                                                        <Users className="h-3 w-3" />
                                                                    </span>
                                                                )}
                                                                {/* Speaking indicator — inline audio wave bars */}
                                                                {isRoomUserSpeaking && (
                                                                    <div className="flex items-end gap-[2px] flex-shrink-0 ml-0.5" style={{ height: '14px' }} title="Speaking...">
                                                                        <div className="w-[3px] rounded-sm bg-green-400" style={{ height: '6px', animation: 'audio-wave-anim 0.6s ease-in-out infinite', animationDelay: '0ms', transformOrigin: 'bottom', boxShadow: '0 0 4px rgba(74,222,128,0.8)' }} />
                                                                        <div className="w-[3px] rounded-sm bg-green-400" style={{ height: '10px', animation: 'audio-wave-anim 0.6s ease-in-out infinite', animationDelay: '100ms', transformOrigin: 'bottom', boxShadow: '0 0 4px rgba(74,222,128,0.8)' }} />
                                                                        <div className="w-[3px] rounded-sm bg-green-400" style={{ height: '14px', animation: 'audio-wave-anim 0.6s ease-in-out infinite', animationDelay: '200ms', transformOrigin: 'bottom', boxShadow: '0 0 4px rgba(74,222,128,0.8)' }} />
                                                                        <div className="w-[3px] rounded-sm bg-green-400" style={{ height: '10px', animation: 'audio-wave-anim 0.6s ease-in-out infinite', animationDelay: '300ms', transformOrigin: 'bottom', boxShadow: '0 0 4px rgba(74,222,128,0.8)' }} />
                                                                        <div className="w-[3px] rounded-sm bg-green-400" style={{ height: '6px', animation: 'audio-wave-anim 0.6s ease-in-out infinite', animationDelay: '400ms', transformOrigin: 'bottom', boxShadow: '0 0 4px rgba(74,222,128,0.8)' }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {/* Mute button - only for host to mute others */}
                                                        {isHost && roomUser.id !== currentUser?.id && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => hostMuteUser(roomUser.id, !roomUser.isMuted)}
                                                                className="h-7 w-7 p-0"
                                                                title={roomUser.isMuted ? 'Unmute user' : 'Mute user'}
                                                            >
                                                                {roomUser.isMuted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3" />}
                                                            </Button>
                                                        )}
                                                        {/* Add friend button - only for authenticated users with authUserId */}
                                                        {isAuthenticated && roomUser.authUserId && roomUser.authUserId !== user?.id?.toString() && (
                                                            (() => {
                                                                const isAlreadyFriend = friends.some(f => f.friendId === roomUser.authUserId);
                                                                const isPending = pendingFriendRequests.has(roomUser.authUserId!);
                                                                return (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className={`h-7 w-7 p-0 ${isAlreadyFriend ? 'text-green-500' : ''}`}
                                                                        title={isAlreadyFriend ? `Already friends with ${roomUser.username}` : `Add ${roomUser.username} as friend`}
                                                                        disabled={isAlreadyFriend || isPending}
                                                                        onClick={() => handleAddFriend(roomUser.authUserId!, roomUser.username)}
                                                                    >
                                                                        {isPending ? (
                                                                            <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                        ) : isAlreadyFriend ? (
                                                                            <Check className="h-3 w-3" />
                                                                        ) : (
                                                                            <UserPlus className="h-3 w-3" />
                                                                        )}
                                                                    </Button>
                                                                );
                                                            })()
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Voice Chat Toggle */}
                            <Button
                                variant={isMuted ? 'outline' : 'default'}
                                size="sm"
                                onClick={toggleMute}
                                disabled={!isVoiceEnabled}
                                className={`relative ${!isMuted ? 'bg-green-600 hover:bg-green-700' : ''} ${isSpeaking ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-background' : ''}`}
                                title={isMuted ? 'Unmute (click to speak)' : 'Mute'}
                            >
                                {isSpeaking && (
                                    <span className="absolute inset-0 rounded-md animate-ping bg-green-400 opacity-30" />
                                )}
                                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className={`h-4 w-4 ${isSpeaking ? 'animate-pulse' : ''}`} />}
                                {connectedPeers.length > 0 && (
                                    <span className="ml-1 text-xs">{connectedPeers.length}</span>
                                )}
                            </Button>

                            {/* Chat Toggle */}
                            <Button
                                variant={showChat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setShowChat(!showChat)}
                            >
                                <MessageCircle className="h-4 w-4" />
                            </Button>

                            {/* Language Selector (icon only) */}
                            <LanguageSelector iconOnly />

                            {/* Fullscreen Toggle */}
                            <Button
                                variant={isFullscreen ? 'default' : 'outline'}
                                size="sm"
                                onClick={toggleFullscreen}
                                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Chat stays visible)'}
                            >
                                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </header>
            )}

            <div className={`flex ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-65px)]'}`}>
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* Video Player - fills available space */}
                    <div className="flex-1 relative bg-black flex items-center justify-center min-h-0">
                        <div className="w-full h-full max-h-full flex items-center justify-center">
                            {/* Countdown overlay for scheduled rooms */}
                            {countdown && !isScheduledRoomReady && (
                                <div className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center">
                                    {/* Background pattern */}
                                    <div className="absolute inset-0 opacity-10">
                                        <div className="w-full h-full" style={{
                                            backgroundImage: `url(${episode?.thumbnailUrl || movie?.posterUrl || ''})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            filter: 'blur(20px)'
                                        }} />
                                    </div>

                                    {/* Content */}
                                    <div className="relative z-10 text-center px-4">
                                        <div className="mb-6">
                                            <span className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium">
                                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                                Scheduled Watch Party
                                            </span>
                                        </div>

                                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h2>
                                        {roomInfo?.description && (
                                            <p className="text-gray-400 mb-8 max-w-md">"{roomInfo.description}"</p>
                                        )}

                                        <p className="text-gray-400 mb-4 text-lg">Starting in</p>

                                        {/* Countdown Timer */}
                                        <div className="flex items-center justify-center gap-4 md:gap-6">
                                            <div className="flex flex-col items-center">
                                                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                                                    <span className="text-4xl md:text-5xl font-bold text-white font-mono">
                                                        {String(countdown.hours).padStart(2, '0')}
                                                    </span>
                                                </div>
                                                <span className="text-gray-400 text-sm mt-2">Hours</span>
                                            </div>
                                            <span className="text-4xl text-white/50 font-bold">:</span>
                                            <div className="flex flex-col items-center">
                                                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                                                    <span className="text-4xl md:text-5xl font-bold text-white font-mono">
                                                        {String(countdown.minutes).padStart(2, '0')}
                                                    </span>
                                                </div>
                                                <span className="text-gray-400 text-sm mt-2">Minutes</span>
                                            </div>
                                            <span className="text-4xl text-white/50 font-bold">:</span>
                                            <div className="flex flex-col items-center">
                                                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                                                    <span className="text-4xl md:text-5xl font-bold text-amber-400 font-mono animate-pulse">
                                                        {String(countdown.seconds).padStart(2, '0')}
                                                    </span>
                                                </div>
                                                <span className="text-gray-400 text-sm mt-2">Seconds</span>
                                            </div>
                                        </div>

                                        <p className="text-gray-500 mt-8 text-sm">
                                            {users.length} {users.length === 1 ? 'person' : 'people'} waiting
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Video Player - only render when ready */}
                            {isScheduledRoomReady && (
                                <VideoPlayer
                                    ref={videoPlayerRef}
                                    videoUrl={episode?.googleDriveUrl || movie?.googleDriveUrl}
                                    className="w-full h-full"
                                    isHost={isHost}
                                    syncMode={true}
                                    subtitleTracks={subtitleTracks}
                                    audioTracks={parsedAudioTracks}
                                    title={content?.title}
                                    description={episode?.description || movie?.description}
                                    season={episode?.season}
                                    episode={episode?.episodeNumber}
                                    episodeTitle={episode?.title}
                                    onPlay={() => {
                                        console.log('🎬 onPlay handler called - isHost:', isHost);
                                        if (isHost) {
                                            const time = videoPlayerRef.current?.getCurrentTime() || 0;
                                            console.log('🎬 Calling videoPlay with time:', time);
                                            videoPlay(time);
                                        }
                                    }}
                                    onPause={() => {
                                        console.log('🎬 onPause handler called - isHost:', isHost);
                                        if (isHost) {
                                            const time = videoPlayerRef.current?.getCurrentTime() || 0;
                                            console.log('🎬 Calling videoPause with time:', time);
                                            videoPause(time);
                                        }
                                    }}
                                    onSeek={(time) => {
                                        console.log('🎬 onSeek handler called - isHost:', isHost, 'time:', time);
                                        if (isHost) {
                                            videoSeek(time);
                                        }
                                    }}
                                    onPlaybackRateChange={(rate) => {
                                        console.log('🎬 onPlaybackRateChange handler called - isHost:', isHost, 'rate:', rate);
                                        if (isHost) {
                                            videoPlaybackRate(rate);
                                        }
                                    }}
                                    onSubtitleChange={(subtitleIndex) => {
                                        console.log('🎬 onSubtitleChange handler called - isHost:', isHost, 'index:', subtitleIndex);
                                        if (isHost) {
                                            videoSubtitle(subtitleIndex);
                                        }
                                    }}
                                />
                            )}
                        </div>

                        {/* Host indicator */}
                        {isHost && (
                            <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                You're the host
                            </div>
                        )}

                        {/* Manual Sync Controls for Google Drive videos - Host Only (Disabled) */}
                        {false && isHost && isScheduledRoomReady && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-lg rounded-full px-4 py-2 flex items-center gap-3 border border-white/10 shadow-lg">
                                <span className="text-xs text-gray-400 hidden sm:inline">Manual Sync:</span>
                                <button
                                    onClick={() => {
                                        console.log('🎬 Manual PLAY sync triggered');
                                        videoPlay(0);
                                    }}
                                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1"
                                    title="Tell all viewers to PLAY"
                                >
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    Play
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('🎬 Manual PAUSE sync triggered');
                                        videoPause(0);
                                    }}
                                    className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1"
                                    title="Tell all viewers to PAUSE"
                                >
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    Pause
                                </button>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                        id="sync-time-input"
                                        className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white text-center"
                                        title="Time in seconds"
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('sync-time-input') as HTMLInputElement;
                                            const time = parseInt(input?.value || '0', 10);
                                            console.log('🎬 Manual SEEK sync triggered to:', time);
                                            videoSeek(time);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium transition-colors"
                                        title="Sync all viewers to this time (in seconds)"
                                    >
                                        Seek
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Episode Selector Bar - Host Only (for shows) - Hidden in Fullscreen */}
                    {!isFullscreen && isHost && roomInfo?.contentType === 'show' && episodes && episodes.length > 1 && (
                        <div className="bg-card/95 backdrop-blur border-t border-border px-4 py-2 flex-shrink-0">
                            <div className="flex items-center justify-center gap-4">
                                {/* Previous Episode */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const currentEpIndex = episodes.findIndex(ep => ep.id === roomInfo?.episodeId);
                                        if (currentEpIndex > 0) {
                                            const prevEp = episodes[currentEpIndex - 1];
                                            changeContent(prevEp.id, roomInfo?.contentId, 'show');
                                        }
                                    }}
                                    disabled={!episodes || episodes.findIndex(ep => ep.id === roomInfo?.episodeId) <= 0}
                                    className="flex items-center gap-1"
                                >
                                    <SkipBack className="h-4 w-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                </Button>

                                {/* Current Episode Info */}
                                <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
                                    <span className="text-sm font-medium text-primary">
                                        S{episode?.season}E{episode?.episodeNumber}
                                    </span>
                                    <span className="text-sm text-muted-foreground max-w-[200px] truncate hidden sm:inline">
                                        {episode?.title}
                                    </span>
                                </div>

                                {/* Next Episode */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const currentEpIndex = episodes.findIndex(ep => ep.id === roomInfo?.episodeId);
                                        if (currentEpIndex < episodes.length - 1) {
                                            const nextEp = episodes[currentEpIndex + 1];
                                            changeContent(nextEp.id, roomInfo?.contentId, 'show');
                                        }
                                    }}
                                    disabled={!episodes || episodes.findIndex(ep => ep.id === roomInfo?.episodeId) >= episodes.length - 1}
                                    className="flex items-center gap-1"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <SkipForward className="h-4 w-4" />
                                </Button>

                                {/* Episode Dropdown */}
                                <select
                                    value={episode?.id || ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            changeContent(e.target.value, roomInfo?.contentId, 'show');
                                        }
                                    }}
                                    className="bg-muted text-foreground text-sm rounded-lg px-2 py-1 border border-border cursor-pointer hover:bg-muted/80 transition-colors"
                                >
                                    {episodes?.map((ep) => (
                                        <option key={ep.id} value={ep.id}>
                                            S{ep.season}E{ep.episodeNumber}: {ep.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Sidebar / Fullscreen Overlay */}
                {showChat && (
                    <div
                        ref={chatOverlayRef}
                        className={`flex flex-col transition-all ${isDragging ? 'duration-0' : 'duration-300'} ${isFullscreen
                            ? `fixed z-[9999] ${isOverlayChatMinimized ? 'w-12 h-12' : `w-72 md:w-80 ${isSmallHeight ? 'h-[85vh] max-h-[90vh]' : 'h-[60vh] max-h-[600px]'}`} rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl`
                            : 'w-80 flex-shrink-0 bg-card border-l border-border h-full'
                            }`}
                        style={isFullscreen ? { left: `${chatPosition.x}px`, top: `${chatPosition.y}px` } : undefined}
                    >
                        {/* Fullscreen Overlay: Drag Handle + Minimize Toggle */}
                        {isFullscreen && !isOverlayChatMinimized && (
                            <div
                                className="flex items-center justify-between px-3 py-2 border-b border-white/10 cursor-move select-none touch-none"
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                            >
                                <div className="flex items-center gap-2 text-white/60 text-xs">
                                    <span className="w-8 h-1 bg-white/30 rounded-full" />
                                    <span>Drag to move</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsOverlayChatMinimized(true); }}
                                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                    title="Minimize chat"
                                >
                                    <Minimize2 className="h-3 w-3 text-white/80" />
                                </button>
                            </div>
                        )}

                        {/* Minimized state - draggable icon */}
                        {isFullscreen && isOverlayChatMinimized ? (
                            <div
                                className="w-full h-full flex items-center justify-center cursor-move touch-none"
                                onMouseDown={handleDragStart}
                                onTouchStart={handleDragStart}
                                onClick={handleMinimizedClick}
                            >
                                <MessageCircle className="h-6 w-6 text-white/80" />
                                {messages.length > 0 && (
                                    <span className="absolute top-1 right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Tab Navigation - Chat/Polls */}
                                <div className={`flex items-center border-b ${isFullscreen ? 'border-white/10' : 'border-border'}`}>
                                    <button
                                        onClick={() => setShowPolls(false)}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${!showPolls
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Chat
                                    </button>
                                    <button
                                        onClick={() => setShowPolls(true)}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${showPolls
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <BarChart2 className="h-4 w-4" />
                                        Polls
                                        {polls.filter(p => p.isActive).length > 0 && (
                                            <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                                                {polls.filter(p => p.isActive).length}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {/* Polls Panel */}
                                {showPolls ? (
                                    <div className="flex-1 overflow-hidden">
                                        <RoomPolls
                                            polls={polls}
                                            isHost={isHost}
                                            onCreatePoll={createPoll}
                                            onVote={votePoll}
                                            onClosePoll={closePoll}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Messages */}
                                        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                                <Languages className="w-3.5 h-3.5" />
                                                Translate Chat
                                            </span>
                                            <Switch 
                                                checked={isTranslationEnabled} 
                                                onCheckedChange={toggleTranslation} 
                                            />
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                            {messages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className={`${msg.username === 'System' ? 'text-center text-muted-foreground text-sm italic' : 'flex gap-3'}`}
                                                >
                                                    {msg.username !== 'System' && (
                                                        <>
                                                            {/* Avatar */}
                                                            <button
                                                                onClick={() => {
                                                                    const sender = users.find(u => u.username === msg.username);
                                                                    handleViewProfile({
                                                                        username: msg.username,
                                                                        avatarUrl: msg.avatarUrl,
                                                                        authUserId: sender?.authUserId,
                                                                        isHost: sender?.isHost || false
                                                                    });
                                                                }}
                                                                className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium overflow-hidden shrink-0 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                                                            >
                                                                {msg.avatarUrl ? (
                                                                    <img src={msg.avatarUrl} alt={msg.username} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    msg.username.slice(0, 2).toUpperCase()
                                                                )}
                                                            </button>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                                    <button
                                                                        onClick={() => {
                                                                            const sender = users.find(u => u.username === msg.username);
                                                                            handleViewProfile({
                                                                                username: msg.username,
                                                                                avatarUrl: msg.avatarUrl,
                                                                                authUserId: sender?.authUserId,
                                                                                isHost: sender?.isHost || false
                                                                            });
                                                                        }}
                                                                        className="font-semibold text-primary hover:underline cursor-pointer text-sm"
                                                                    >
                                                                        {msg.username}
                                                                    </button>
                                                                    <RoleBadge role={(msg.username.toLowerCase() === 'admin' || (msg as any).isAdmin) ? 'admin' : (msg as any).isModerator ? "moderator" : null} />
                                                                    {/* Badges */}
                                                                    {msg.badges && (
                                                                        <div className="flex items-center gap-0.5">
                                                                            {msg.badges.filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin')).sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime()).map((badge: any) => (
                                                                                <div key={badge.id} title={badge.name}>
                                                                                    <img
                                                                                        src={badge.imageUrl}
                                                                                        alt={badge.name}
                                                                                        className="w-3.5 h-3.5 object-contain"
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <span className="text-muted-foreground ml-auto text-xs">
                                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-0.5 break-words">{formatMessageWithMedia(getTranslatedMessage(msg))}</p>
                                                                {(() => {
                                                                    const urlMatch = msg.message.match(/(https?:\/\/[^\s]+)/);
                                                                    // Do not show link preview for Tenor GIFs since they are rendered as media
                                                                    if (urlMatch && urlMatch[0].match(/https:\/\/media\.tenor\.com\/[^\s]+\.gif/i)) {
                                                                        return null;
                                                                    }
                                                                    return urlMatch ? <LinkPreview url={urlMatch[0]} /> : null;
                                                                })()}
                                                            </div>
                                                        </>
                                                    )}
                                                    {msg.username === 'System' && (
                                                        <p>{formatMessageWithMedia(getTranslatedMessage(msg))}</p>
                                                    )}
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Emoji Picker — Inside chat container, DM style */}
                                        {showEmojiPicker && (
                                            <div className="border-t border-border bg-card">
                                                <EmojiPicker
                                                    onEmojiClick={(emojiData) => {
                                                        setChatMessage(prev => prev + emojiData.emoji);
                                                    }}
                                                    theme={Theme.DARK}
                                                    width="100%"
                                                    height={280}
                                                    searchPlaceHolder="Search emoji..."

                                                    previewConfig={{ showPreview: false }}
                                                    skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
                                                />
                                            </div>
                                        )}

                                        {/* GIF Picker — Inside chat container, DM style */}
                                        {showGifPicker && (
                                            <div className="border-t border-border bg-card">
                                                <div className="p-3 h-[280px] flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                                                    <div className="relative mb-2">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <Input
                                                            type="text"
                                                            placeholder="Search GIFs..."
                                                            value={gifSearch}
                                                            onChange={(e) => {
                                                                setGifSearch(e.target.value);
                                                                if (e.target.value) {
                                                                    searchGifs(e.target.value);
                                                                } else {
                                                                    searchGifs('trending');
                                                                }
                                                            }}
                                                            className="pl-8 h-8 text-sm bg-muted/50 border-border/50"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div
                                                        className="flex-1 overflow-y-auto pr-1"
                                                        onScroll={(e) => {
                                                            const el = e.currentTarget;
                                                            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
                                                                loadMoreGifs();
                                                            }
                                                        }}
                                                    >
                                                        {isLoadingGifs ? (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>
                                                        ) : gifs.length > 0 ? (
                                                            <>
                                                                <div style={{ columns: 2, columnGap: '8px' }}>
                                                                    {gifs.map((gif: any) => (
                                                                        <div key={gif.id} className="relative group overflow-hidden rounded-lg bg-muted mb-2" style={{ breakInside: 'avoid' }}>
                                                                            <img
                                                                                src={gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url}
                                                                                alt={gif.content_description}
                                                                                className="w-full h-auto object-contain cursor-pointer transition-transform group-hover:scale-105 rounded-lg"
                                                                                onClick={() => {
                                                                                    const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
                                                                                    if (gifUrl) {
                                                                                        setSelectedGif(gifUrl);
                                                                                    }
                                                                                    setShowGifPicker(false);
                                                                                    setGifSearch('');
                                                                                }}
                                                                                loading="lazy"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {isLoadingMoreGifs && (
                                                                    <div className="flex items-center justify-center py-3">
                                                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                                                {gifSearch ? 'No GIFs found' : 'Search for GIFs'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
                                                        <span className="text-[10px] text-muted-foreground">Powered by Tenor</span>
                                                        <Button
                                                            type="button"
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

                                        {/* Chat Input */}
                                        <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                                            {/* Hidden file input */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                accept="image/*,video/*,audio/*"
                                                className="hidden"
                                            />

                                            {/* GIF Preview */}
                                            {selectedGif && (
                                                <div className="mb-3 relative inline-block">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedGif(null)}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 z-10"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <img
                                                        src={selectedGif}
                                                        alt="GIF Preview"
                                                        className="max-w-[200px] max-h-[150px] rounded-lg"
                                                    />
                                                </div>
                                            )}

                                            {/* Recording UI */}
                                            {isRecording && (
                                                <div className="flex items-center gap-3 bg-destructive/10 p-2 rounded-lg mb-2 animate-in slide-in-from-bottom-2">
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
                                                        onClick={cancelRecordingMessage}
                                                        className="h-6 w-6 p-0 hover:bg-destructive/20 text-destructive"
                                                        title="Cancel"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="default"
                                                        size="sm"
                                                        onClick={stopRecordingMessage}
                                                        className="h-6 px-2 text-xs bg-destructive hover:bg-destructive/90 text-white"
                                                    >
                                                        Stop
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Attachment Preview */}
                                            {attachment && (
                                                <div className="mb-3 relative inline-block">
                                                    <button
                                                        type="button"
                                                        onClick={removeAttachment}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 z-10"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    {attachment.type === 'image' && (
                                                        <img
                                                            src={attachment.preview}
                                                            alt="Preview"
                                                            className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                                                        />
                                                    )}
                                                    {attachment.type === 'video' && (
                                                        <video
                                                            src={attachment.preview}
                                                            className="max-w-[200px] max-h-[150px] rounded-lg"
                                                            controls
                                                        />
                                                    )}
                                                    {attachment.type === 'audio' && (
                                                        <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                                                            <VoiceMessage src={attachment.preview} isMe={true} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Reaction Emojis - above input, no visible container */}
                                            <div className="flex items-center justify-center gap-1 py-1">
                                                {REACTION_EMOJIS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => sendReaction(emoji)}
                                                        className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-accent/50"
                                                        title={`React with ${emoji}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex gap-1 items-center">
                                                {/* Emoji Button */}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                                                    className={`h-8 w-8 p-0 ${showEmojiPicker ? 'bg-muted' : ''}`}
                                                >
                                                    <Smile className="h-4 w-4" />
                                                </Button>

                                                {/* GIF Button */}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                                                    className={`h-8 w-8 p-0 ${showGifPicker ? 'bg-muted' : ''}`}
                                                >
                                                    <span className="text-[10px] font-bold">GIF</span>
                                                </Button>

                                                {/* Attachment Button */}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    title="Attach image, video, or audio"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Paperclip className="h-4 w-4" />
                                                </Button>

                                                <Input
                                                    value={chatMessage}
                                                    onChange={(e) => setChatMessage(e.target.value)}
                                                    placeholder="Type a message..."
                                                    className="flex-1 h-8"
                                                    disabled={isRecording}
                                                />

                                                {chatMessage.trim() || attachment || selectedGif ? (
                                                    <Button type="submit" size="sm" className="h-8 w-8 p-0">
                                                        <Send className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-8 w-8 p-0 ${isRecording ? 'text-destructive bg-destructive/10' : ''}`}
                                                        onClick={isRecording ? stopRecordingMessage : startRecordingMessage}
                                                        title="Voice Message"
                                                    >
                                                        <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                                                    </Button>
                                                )}
                                            </div>
                                        </form>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* CSS for floating animation */}
            <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-300px) scale(1.5);
          }
        }
      `}</style>

            {/* User Profile Modal */}
            {selectedProfileUser && (
                <UserProfileModal
                    isOpen={!!selectedProfileUser}
                    onClose={() => setSelectedProfileUser(null)}
                    user={selectedProfileUser}
                    // For friend check: we handle it in the modal or pass if needed.
                    // The original code was passing isFriend.
                    isFriend={selectedProfileUser.authUserId ? friends.some(f => f.friendId === selectedProfileUser.authUserId) : false}
                />
            )}

            <InviteFriendsModal
                roomCode={roomCode || ''}
                roomTitle={roomInfo?.contentTitle}
                open={showInviteModal}
                onOpenChange={setShowInviteModal}
            />
        </div>
    );
}

export default function WatchTogether() {
    return (
        <WatchTogetherProvider>
            <WatchTogetherContent />
        </WatchTogetherProvider>
    );
}
