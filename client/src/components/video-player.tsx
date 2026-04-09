import { AudioLines, Check } from 'lucide-react';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import '@/jwplayer.css'; // Import Netflix-style red skin

// Export interface for external control
export interface VideoPlayerRef {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setPlaybackRate: (rate: number) => void;
    setCaptions: (index: number) => void; // -1 = off, 0+ = track index
    getCurrentTime: () => number;
    getPlaybackRate: () => number;
    isPaused: () => boolean;
}

interface SubtitleTrack {
    file: string;
    label: string;
    kind: 'captions' | 'subtitles';
    default?: boolean;
}

interface VideoMetadata {
    title?: string;
    description?: string;
    season?: number;
    episode?: number;
    episodeTitle?: string;
}

interface VideoPlayerProps extends VideoMetadata {
    videoUrl: string | null | undefined;
    className?: string;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
    onPlaybackRateChange?: (rate: number) => void;
    onSubtitleChange?: (subtitleIndex: number) => void; // Called when user changes subtitle
    autoplay?: boolean;
    isHost?: boolean; // If true, shows controls; if false, hide controls for viewers
    syncMode?: boolean; // If true, disables local controls for non-hosts
    subtitleTracks?: SubtitleTrack[]; // External subtitle tracks to load
    audioTracks?: { language: string; url: string }[];
}

// ... (keep helper functions unchanged: isGoogleDriveUrl, isJWPlayerUrl, etc.) ...

// URL type detection helpers
const isGoogleDriveUrl = (url: string): boolean => {
    return url.includes('drive.google.com') || url.includes('docs.google.com');
};

const isJWPlayerUrl = (url: string): boolean => {
    return url.includes('jwplatform.com') ||
        url.includes('cdn.jwplayer.com') ||
        url.includes('.jwp.') ||
        url.includes('jwpltx.com');
};

const isDirectVideoUrl = (url: string): boolean => {
    // Return true for blob URLs (local file playback)
    if (url.startsWith('blob:')) return true;

    const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mpd'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const isEmbedUrl = (url: string): boolean => {
    // Check for various embed patterns
    return url.includes('/embed') ||
        url.includes('/e/') ||
        url.includes('player.') ||
        url.includes('iframe');
};

// Check if URL requires proxy (protected external URLs)
const isProxyRequiredUrl = (url: string): boolean => {
    const proxyDomains = ['worthcrete.com', 'www.worthcrete.com'];
    return proxyDomains.some(domain => url.includes(domain));
};

// Get proxied URL for external videos
const getProxiedUrl = (url: string): string => {
    if (isProxyRequiredUrl(url)) {
        return `/api/proxy-video?url=${encodeURIComponent(url)}`;
    }
    return url;
};

// Extract Google Drive file ID
const extractDriveId = (url: string): string => {
    const match = url.match(/\/d\/([^/]+)/);
    if (match) return match[1];
    // Check for export format
    const exportMatch = url.match(/id=([^&]+)/);
    if (exportMatch) return exportMatch[1];
    return url;
};

// Placeholder IDs to check
const PLACEHOLDER_IDS = ['1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd', 'PLACEHOLDER', 'placeholder'];

// Declare global jwplayer type
declare global {
    interface Window {
        jwplayer: any;
    }
}

// JW Player Wrapper Component with ref for external control
interface JWPlayerWrapperProps extends VideoMetadata {
    videoUrl: string;
    className?: string;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onSeek?: (time: number) => void;
    onPlaybackRateChange?: (rate: number) => void;
    onSubtitleChange?: (subtitleIndex: number) => void;
    autoplay?: boolean;
    isHost?: boolean;
    syncMode?: boolean;
    subtitleTracks?: SubtitleTrack[];
    audioMenu?: React.ReactNode;
}

const JWPlayerWrapper = forwardRef<VideoPlayerRef, JWPlayerWrapperProps>(({
    videoUrl,
    className = '',
    onTimeUpdate,
    onPlay,
    onPause,
    onSeek,
    onPlaybackRateChange,
    onSubtitleChange,
    autoplay = false,
    isHost = true,
    syncMode = false,
    subtitleTracks = [],
    audioMenu,
    title,
    description,
    season,
    episode,
    episodeTitle
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerIdRef = useRef<string>(`jwplayer-${Math.random().toString(36).substr(2, 9)}`);
    const playerRef = useRef<any>(null);
    const lastSeekTime = useRef<number>(0);
    const [isPaused, setIsPaused] = useState(!autoplay); // Default to paused unless autoplay
    const [isIdle, setIsIdle] = useState(true); // Track if player is idle/unstarted
    const [playerContainer, setPlayerContainer] = useState<HTMLElement | null>(null);

    // Refs for callbacks to avoid stale closures
    const callbacksRef = useRef({
        onPlay,
        onPause,
        onSeek,
        onPlaybackRateChange,
        onSubtitleChange,
        onTimeUpdate,
        isHost,
        syncMode
    });

    // Keep refs updated
    callbacksRef.current = {
        onPlay,
        onPause,
        onSeek,
        onPlaybackRateChange,
        onSubtitleChange,
        onTimeUpdate,
        isHost,
        syncMode
    };

    // Expose control methods via ref
    useImperativeHandle(ref, () => ({
        play: () => {
            console.log('🎬 VideoPlayer.play() called');
            playerRef.current?.play();
        },
        pause: () => {
            console.log('🎬 VideoPlayer.pause() called');
            playerRef.current?.pause();
        },
        seek: (time: number) => {
            console.log('🎬 VideoPlayer.seek() called:', time);
            lastSeekTime.current = time;
            playerRef.current?.seek(time);
        },
        setPlaybackRate: (rate: number) => {
            console.log('🎬 VideoPlayer.setPlaybackRate() called:', rate);
            playerRef.current?.setPlaybackRate(rate);
        },
        setCaptions: (index: number) => {
            console.log('🎬 VideoPlayer.setCaptions() called:', index);
            playerRef.current?.setCurrentCaptions?.(index + 1);
        },
        getCurrentTime: () => {
            return playerRef.current?.getPosition?.() || 0;
        },
        getPlaybackRate: () => {
            return playerRef.current?.getPlaybackRate?.() || 1;
        },
        isPaused: () => {
            const state = playerRef.current?.getState?.();
            return state !== 'playing';
        }
    }));

    useEffect(() => {
        if (!containerRef.current || !window.jwplayer) {
            console.warn('JW Player not loaded');
            return;
        }

        const playerId = playerIdRef.current;
        const finalVideoUrl = getProxiedUrl(videoUrl);
        const playerConfig: any = {
            file: finalVideoUrl,
            width: '100%',
            height: '100%',
            autostart: autoplay,
            controls: true,
        };

        if (finalVideoUrl.startsWith('blob:')) {
            playerConfig.type = 'mp4';
        }

        const player = window.jwplayer(playerId).setup({
            ...playerConfig,
            primary: 'html5',
            stretching: 'uniform',
            playbackRateControls: true,
            playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
            displaytitle: false,
            displaydescription: false,
            // HLS Settings
            qualityLabels: {},
            hlshtml: true,
            defaultBandwidthEstimate: 50000000,
            captions: {
                color: '#FFFFFF',
                fontSize: 14,
                fontFamily: 'Arial, sans-serif',
                fontOpacity: 100,
                backgroundColor: '#000000',
                backgroundOpacity: 0,
                edgeStyle: 'uniform',
                windowColor: '#000000',
                windowOpacity: 0
            },
            tracks: subtitleTracks.length > 0
                ? subtitleTracks.map((track, index) => ({
                    file: track.file,
                    label: track.label,
                    kind: track.kind,
                    'default': index === 0
                }))
                : [
                    {
                        file: 'data:text/vtt,WEBVTT',
                        label: 'No Subtitles Available',
                        kind: 'captions',
                        'default': false
                    }
                ],
            renderCaptionsNatively: false,
            skin: {
                name: 'seven'
            }
        });

        playerRef.current = player;

        // Wait for player to be ready to get container for Portal
        player.on('ready', () => {
            const element = document.getElementById(playerId);
            if (element) {
                // Try to inject into the wrapper or the element itself
                // JWPlayer structure: #id > .jw-wrapper > .jw-media
                // We want to be inside #id
                setPlayerContainer(element);
            }
            
            // Add native cinema mode button near CC
            try {
                const cinemaIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>';
                player.addButton(
                    cinemaIcon,
                    "Toggle Wide View",
                    () => { window.dispatchEvent(new CustomEvent("toggleCinemaMode")); },
                    "cinema-mode-button",
                    "jw-btn jw-icon"
                );
            } catch(e) { console.error(e); }
        });

        // --- Event Listeners ---

        player.on('time', (e: { position: number; duration: number }) => {
            callbacksRef.current.onTimeUpdate?.(e.position, e.duration);
        });

        player.on('play', () => {
            setIsPaused(false);
            setIsIdle(false);
            const { isHost, syncMode, onPlay } = callbacksRef.current;
            if (isHost || !syncMode) onPlay?.();
        });

        player.on('pause', () => {
            setIsPaused(true);
            const { isHost, syncMode, onPause } = callbacksRef.current;
            if (isHost || !syncMode) onPause?.();
        });

        player.on('idle', () => {
            setIsPaused(true);
        });

        player.on('seek', (e: { offset: number; position: number }) => {
            const { isHost, syncMode, onSeek } = callbacksRef.current;
            if ((isHost || !syncMode) && Math.abs(e.offset - lastSeekTime.current) > 1) {
                onSeek?.(e.offset);
            }
        });

        player.on('playbackRateChanged', (e: { playbackRate: number }) => {
            const { isHost, syncMode, onPlaybackRateChange } = callbacksRef.current;
            if (isHost || !syncMode) onPlaybackRateChange?.(e.playbackRate);
        });

        player.on('captionsChanged', (e: { track: number }) => {
            const { isHost, syncMode, onSubtitleChange } = callbacksRef.current;
            const subtitleIndex = e.track - 1;
            if (isHost || !syncMode) onSubtitleChange?.(subtitleIndex);
        });

        player.on('levels', (e: { levels: Array<{ label: string; bitrate: number }> }) => {
            if (e.levels && e.levels.length > 1) {
                const highestLevel = e.levels.length - 1;
                player.setCurrentQuality(highestLevel);
            }
        });

        return () => {
            playerRef.current = null;
            try {
                window.jwplayer(playerId).remove();
            } catch (e) { }
        };
    }, [videoUrl, autoplay, isHost, syncMode, subtitleTracks.length]);

    // Format helpers
    const formatSeasonEp = () => {
        if (season && episode) return `Season ${season}: Ep. ${episode}`;
        if (season) return `Season ${season}`;
        if (episode) return `Episode ${episode}`;
        return '';
    };

    // Render Overlay
    const Overlay = (
        <div
            className="absolute inset-0 z-10 flex flex-col justify-center px-12 pointer-events-none animate-in fade-in duration-300 bg-black/60"
        >
            <div className="max-w-3xl space-y-4">
                <span className="text-gray-300 font-medium text-lg uppercase tracking-wide drop-shadow-md">You're watching</span>

                {title && (
                    <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">{title}</h1>
                )}

                {(season || episode) && (
                    <div className="text-xl font-semibold text-gray-200 drop-shadow-md">
                        {formatSeasonEp()}
                    </div>
                )}

                {episodeTitle && (
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg">{episodeTitle}</h2>
                )}

                {description && (
                    <p className="text-gray-200 text-base max-w-2xl line-clamp-3 leading-relaxed mt-4 drop-shadow-md">
                        {description}
                    </p>
                )}
            </div>
            {/* Removed 'Paused' text as requested */}
        </div>
    );

    return (
        <>
            {/* Inject CSS to force progress bar above overlay */}
            <style>{`
                .jwplayer .jw-controlbar .jw-slider-time {
                    z-index: 50 !important;
                    position: relative !important;
                }
                .jwplayer .jw-controlbar .jw-group-bottom {
                     /* Maintain button visibility below if needed, but overlay covers controls except progress per user request */
                     /* User requested "just progress bar", so buttons (play/pause) should dim. */
                }
            `}</style>

            <div className={`w-full h-full ${className}`} style={{ position: 'relative' }}>
                <div
                    id={playerIdRef.current}
                    ref={containerRef}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                ></div>

                {/* Render Overlay via Portal if container is ready, otherwise inline (fallback) */}
                {isPaused && !isIdle && (title || episodeTitle) && (
                    playerContainer
                        ? createPortal(Overlay, playerContainer)
                        : Overlay
                )}
                {/* Render Audio Menu via Portal so it stays in fullscreen */}
                {audioMenu && (
                    playerContainer
                        ? createPortal(audioMenu, playerContainer)
                        : audioMenu
                )}
            </div>
        </>
    );
});

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
    videoUrl,
    className = '',
    onTimeUpdate,
    onPlay,
    onPause,
    onSeek,
    onPlaybackRateChange,
    onSubtitleChange,
    autoplay = false,
    isHost = true,
    syncMode = false,
    subtitleTracks = [],
    audioTracks = [],
    title,
    description,
    season,
    episode,
    episodeTitle
}, ref) => {
    // ... (rest of VideoPlayer implementation needs to use JWPlayerWrapper with new props)
    const jwPlayerRef = useRef<VideoPlayerRef>(null);
    const [playerType, setPlayerType] = useState<'drive' | 'jwplayer' | 'direct' | 'embed' | 'local' | 'none'>('none');
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>("Default");
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const lastTimeRef = useRef(0);

    useEffect(() => {
        const saved = localStorage.getItem("sv_audio_lang");
        if (saved) setSelectedLanguage(saved);
        
        const handleClickOutside = (e: MouseEvent) => {
            if (showAudioMenu && !((e.target as Element).closest('#audio-menu-container'))) {
                setShowAudioMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAudioMenu]);

    const effectiveVideoUrl = useMemo(() => {
        if (!audioTracks || audioTracks.length === 0 || selectedLanguage === "Default") return videoUrl;
        const track = audioTracks.find(t => t.language === selectedLanguage);
        return track && track.url ? track.url : videoUrl;
    }, [videoUrl, audioTracks, selectedLanguage]);

    const handleLanguageChange = (lang: string) => {
        // Save current time before switching
        if (playerType === 'direct') {
            lastTimeRef.current = jwPlayerRef.current?.getCurrentTime() || 0;
        }
        setSelectedLanguage(lang);
        localStorage.setItem("sv_audio_lang", lang);
        setShowAudioMenu(false);
    };


    useImperativeHandle(ref, () => ({
        play: () => jwPlayerRef.current?.play(),
        pause: () => jwPlayerRef.current?.pause(),
        seek: (time: number) => jwPlayerRef.current?.seek(time),
        setPlaybackRate: (rate: number) => jwPlayerRef.current?.setPlaybackRate(rate),
        setCaptions: (index: number) => jwPlayerRef.current?.setCaptions(index),
        getCurrentTime: () => jwPlayerRef.current?.getCurrentTime() || 0,
        getPlaybackRate: () => jwPlayerRef.current?.getPlaybackRate() || 1,
        isPaused: () => jwPlayerRef.current?.isPaused() ?? true
    }));

    useEffect(() => {
        // ... (URL detection logic unchanged) ...
        if (!effectiveVideoUrl) {
            setPlayerType('none');
            setProcessedUrl(null);
            return;
        }

        const isPlaceholder = PLACEHOLDER_IDS.some(id => effectiveVideoUrl.includes(id));
        if (isPlaceholder) {
            setPlayerType('none');
            setProcessedUrl(null);
            return;
        }

        const isAbsoluteUrl = effectiveVideoUrl.startsWith('http://') || videoUrl.startsWith('https://') || videoUrl.startsWith('blob:');
        const isDriveId = /^[a-zA-Z0-9_-]{20,60}$/.test(effectiveVideoUrl as string);

        if (isDriveId && !isAbsoluteUrl) {
            setPlayerType('drive');
            setProcessedUrl(`https://drive.google.com/file/d/${videoUrl}/preview?autoplay=0&controls=1&modestbranding=1`);
            return;
        }

        if (!isAbsoluteUrl) {
            setPlayerType('none');
            setProcessedUrl(null);
            return;
        }

        if (effectiveVideoUrl!.startsWith('blob:')) {
            setPlayerType('local');
            setProcessedUrl(effectiveVideoUrl as string);
        } else if (isGoogleDriveUrl(effectiveVideoUrl as string)) {
            setPlayerType('drive');
            const driveId = extractDriveId(effectiveVideoUrl as string);
            setProcessedUrl(`https://drive.google.com/file/d/${driveId}/preview?autoplay=0&controls=1&modestbranding=1`);
        } else if (isJWPlayerUrl(effectiveVideoUrl as string)) {
            setPlayerType('jwplayer');
            setProcessedUrl(effectiveVideoUrl as string);
        } else if (isDirectVideoUrl(effectiveVideoUrl as string) || isProxyRequiredUrl(effectiveVideoUrl as string)) {
            setPlayerType('direct');
            setProcessedUrl(effectiveVideoUrl as string);
        } else if (isEmbedUrl(effectiveVideoUrl as string)) {
            setPlayerType('embed');
            setProcessedUrl(effectiveVideoUrl as string);
        } else {
            setPlayerType('embed');
            setProcessedUrl(effectiveVideoUrl as string);
        }
    }, [effectiveVideoUrl]);

    if (playerType === 'none' || !processedUrl) {
        // ... (placeholder render unchanged) ...
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center text-white p-8 text-center bg-black ${className}`}>
                <div className="mb-6">
                    <svg className="w-20 h-20 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={2} />
                    </svg>
                    <h3 className="text-2xl font-bold mb-2">Video Not Available</h3>
                    <p className="text-muted-foreground mb-6">
                        This content is not available yet. We're working on adding it!
                    </p>
                </div>
                <Link href="/request">
                    <Button variant="default" size="lg" className="gap-2">
                        Request This Content
                    </Button>
                </Link>
            </div>
        );
    }


    const renderAudioMenu = () => {
        if (!audioTracks || audioTracks.length === 0) return null;
        return (
            <div id="audio-menu-container" className="absolute top-4 right-4 z-40">
                <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-black/80 hover:bg-black/90 text-white border border-white/20 gap-2 backdrop-blur-md"
                    onClick={() => setShowAudioMenu(!showAudioMenu)}
                >
                    <AudioLines className="w-4 h-4" />
                    <span>Language: {selectedLanguage}</span>
                </Button>
                
                {showAudioMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-white/10 rounded-md shadow-xl overflow-hidden backdrop-blur-lg animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-white/10">Audio Tracks</div>
                        <button 
                            className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors hover:bg-white/10 ${selectedLanguage === 'Default' ? 'text-primary font-medium bg-primary/10' : 'text-gray-200'}`}
                            onClick={() => handleLanguageChange("Default")}
                        >
                            Default
                            {selectedLanguage === 'Default' && <Check className="w-4 h-4" />}
                        </button>
                        {audioTracks.map((track) => (
                            <button 
                                key={track.language}
                                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors hover:bg-white/10 ${selectedLanguage === track.language ? 'text-primary font-medium bg-primary/10' : 'text-gray-200'}`}
                                onClick={() => handleLanguageChange(track.language)}
                            >
                                {track.language}
                                {selectedLanguage === track.language && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (playerType === 'drive') {
        return (
            <div className="w-full h-full relative">
                {renderAudioMenu()}
                <iframe
                src={processedUrl}
                className={`w-full h-full border-0 ${className}`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style={{ border: 'none' }}
                data-app-iframe="gdrive"
            />
            </div>
        );
    }

    if (playerType === 'local') {
        return (
            <div className="w-full h-full relative">
                {renderAudioMenu()}
                <video
                src={processedUrl!}
                className={`w-full h-full bg-black ${className}`}
                controls
                autoPlay={autoplay}
                playsInline
                controlsList="nodownload"
                />
            </div>
        );
    }

if (playerType === 'jwplayer') {
        let embedUrl = processedUrl;
        if (!processedUrl.includes('/embed') && processedUrl.includes('cdn.jwplayer.com')) {
            const mediaIdMatch = processedUrl.match(/\/([a-zA-Z0-9]{8})-/);
            if (mediaIdMatch) {
                const mediaId = mediaIdMatch[1];
                embedUrl = `https://cdn.jwplayer.com/players/${mediaId}-${mediaId}.html`;
            }
        }
        return (
            <div className="w-full h-full relative">
                {renderAudioMenu()}
                <iframe
                    src={embedUrl}
                    className={`w-full h-full border-0 ${className}`}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    style={{ border: 'none' }}
                    scrolling="no"
                />
            </div>
        );
    }

    if (playerType === 'direct') {
        return (
            <div className="w-full h-full relative">
                <JWPlayerWrapper
                    key={`jw-${subtitleTracks.length}-${selectedLanguage}`}
                    startTime={lastTimeRef.current}
                    ref={jwPlayerRef}
                    videoUrl={processedUrl!}
                    className={className}
                    onTimeUpdate={onTimeUpdate}
                    onPlay={onPlay}
                    onPause={onPause}
                    onSeek={onSeek}
                    onPlaybackRateChange={onPlaybackRateChange}
                    onSubtitleChange={onSubtitleChange}
                    autoplay={autoplay}
                    isHost={isHost}
                    syncMode={syncMode}
                    subtitleTracks={subtitleTracks}
                    audioMenu={renderAudioMenu()}
                    title={title}
                    description={description}
                    season={season}
                    episode={episode}
                    episodeTitle={episodeTitle}
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            {renderAudioMenu()}
            <iframe
                src={processedUrl}
                className={`w-full h-full border-0 ${className}`}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                style={{ border: 'none' }}
                scrolling="no"
            />
        </div>
    );
});

export default VideoPlayer;
