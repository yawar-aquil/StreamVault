import { AudioLines, Check, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
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

// Domains we proxy through our VPS (/api/stream). For archive.org: their US
// CDN is slow from India (200-400ms round-trip per range request). Proxying
// lets Cloudflare cache the response at its Mumbai edge, so the 2nd+ viewer
// of any episode loads instantly from CF and costs us zero VPS bandwidth.
const SHOULD_STREAM_PROXY_DOMAINS = [
    '.archive.org', // matches archive.org itself + any ia*.us.archive.org mirror
];

const shouldStreamProxy = (url: string): boolean => {
    try {
        const host = new URL(url).hostname;
        return SHOULD_STREAM_PROXY_DOMAINS.some((d) =>
            d.startsWith('.') ? host === d.slice(1) || host.endsWith(d) : host === d
        );
    } catch {
        return false;
    }
};

const base64UrlEncode = (s: string): string =>
    btoa(unescape(encodeURIComponent(s)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

type StreamMode = 'direct' | 'vps' | 'vps-cached';

// Get proxied URL for external videos. The /api/stream proxy is only used
// when the admin has enabled it AND the viewer is a registered user. The
// difference between 'vps' and 'vps-cached' is server-side (Cache-Control
// header); the client URL is identical for both.
// Probes /api/stream-probe once per session. If CF is blocking our proxy
// (Bot Fight Mode, WAF, etc.) this tells us immediately so we can fall back
// to direct URLs without ever trying the broken proxy path.
const PROXY_HEALTH_KEY = 'sv_proxy_health';
let probePromise: Promise<boolean> | null = null;
const probeProxyHealth = (): Promise<boolean> => {
    try {
        const cached = sessionStorage.getItem(PROXY_HEALTH_KEY);
        if (cached === 'ok') return Promise.resolve(true);
        if (cached === 'blocked') return Promise.resolve(false);
    } catch { /* ignore storage errors */ }

    if (probePromise) return probePromise;
    probePromise = (async () => {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3000);
            const r = await fetch(`/api/stream-probe?n=${Date.now()}`, {
                method: 'GET',
                signal: ctrl.signal,
                cache: 'no-store',
            });
            clearTimeout(timer);
            const ok = r.ok && r.headers.get('content-type') === 'application/octet-stream';
            try { sessionStorage.setItem(PROXY_HEALTH_KEY, ok ? 'ok' : 'blocked'); } catch {}
            console.log('[stream] Proxy health check:', ok ? 'OK' : 'BLOCKED');
            return ok;
        } catch (err) {
            console.warn('[stream] Proxy health check failed:', err);
            try { sessionStorage.setItem(PROXY_HEALTH_KEY, 'blocked'); } catch {}
            return false;
        }
    })();
    return probePromise;
};

const getProxiedUrl = (
    url: string,
    opts: { streamMode: StreamMode; isAuthenticated: boolean; proxyHealthy: boolean }
): string => {
    if (isProxyRequiredUrl(url)) {
        return `/api/proxy-video?url=${encodeURIComponent(url)}`;
    }
    if (
        opts.proxyHealthy &&
        shouldStreamProxy(url) &&
        opts.isAuthenticated &&
        (opts.streamMode === 'vps' || opts.streamMode === 'vps-cached')
    ) {
        return `/api/stream?u=${base64UrlEncode(url)}`;
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
    const [isBuffering, setIsBuffering] = useState(false); // Netflix-style buffering spinner
    const [showMobileControls, setShowMobileControls] = useState(false); // tap-to-reveal on mobile
    const mobileControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMobile = useIsMobile();
    const [playerContainer, setPlayerContainer] = useState<HTMLElement | null>(null);
    const [proxyHealthy, setProxyHealthy] = useState(false);

    // Admin-controlled streaming mode + current user auth state. Both influence
    // whether we route videoUrl through /api/stream (see getProxiedUrl).
    const { isAuthenticated } = useAuth();
    const { data: streamModeData } = useQuery<{ mode: StreamMode }>({
        queryKey: ['/api/config/stream-mode'],
        staleTime: 60 * 1000, // re-fetch at most once per minute
    });
    const streamMode: StreamMode = streamModeData?.mode || 'direct';

    // Probe proxy health once when the component mounts (or mode/auth changes)
    // so we know whether to route through /api/stream.
    useEffect(() => {
        if (streamMode === 'direct' || !isAuthenticated) {
            setProxyHealthy(false);
            return;
        }
        let cancelled = false;
        probeProxyHealth().then((ok) => {
            if (!cancelled) setProxyHealthy(ok);
        });
        return () => { cancelled = true; };
    }, [streamMode, isAuthenticated]);

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
        const finalVideoUrl = getProxiedUrl(videoUrl, {
            streamMode,
            isAuthenticated,
            proxyHealthy,
        });
        const playerConfig: any = {
            file: finalVideoUrl,
            width: '100%',
            height: '100%',
            autostart: autoplay,
            controls: true,
            // Start downloading bytes as soon as player mounts (instead of
            // waiting for play tap). Dramatically improves time-to-first-frame
            // when the source is a slow CDN like archive.org.
            preload: 'auto',
            // For HLS sources: buffer ahead far more than the 30s default so
            // transient network dips don't pause playback.
            hlsjsConfig: {
                maxBufferLength: 120,       // seconds of video to buffer ahead
                maxMaxBufferLength: 600,    // hard upper bound
                maxBufferSize: 120 * 1000 * 1000, // 120 MB cap
                lowLatencyMode: false,
                enableWorker: true,
            },
        };

        // Explicitly tell JWPlayer the file format. Since the proxy URL
        // (/api/stream?u=...) has no file extension, JWPlayer will fail with
        // Error 102630 if it cannot guess the format.
        if (videoUrl) {
            const lowerUrl = videoUrl.toLowerCase();
            if (lowerUrl.includes('.m3u8')) {
                playerConfig.type = 'hls';
            } else if (lowerUrl.includes('.mp4') || finalVideoUrl.startsWith('blob:')) {
                playerConfig.type = 'mp4';
            } else if (lowerUrl.includes('.webm')) {
                playerConfig.type = 'webm';
            } else {
                playerConfig.type = 'mp4'; // fallback
            }
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
                const cinemaIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>';
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
            setIsBuffering(false);
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

        // Netflix-style buffering spinner state
        player.on('buffer', () => setIsBuffering(true));
        player.on('bufferFull', () => setIsBuffering(false));
        player.on('time', () => setIsBuffering(false));

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

        // Log playback errors for debugging — no automatic fallback to direct
        // URL. The proxy is the intended path; if it fails we want to know.
        const handlePlaybackError = (e: { message?: string; code?: number }) => {
            console.error('[stream] JW playback error', e?.code, e?.message, 'file:', finalVideoUrl);
        };
        player.on('error', handlePlaybackError);
        player.on('setupError', handlePlaybackError);

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
    }, [videoUrl, autoplay, isHost, syncMode, subtitleTracks.length, streamMode, isAuthenticated, proxyHealthy]);

    // Format helpers
    const formatSeasonEp = () => {
        if (season && episode) return `Season ${season}: Ep. ${episode}`;
        if (season) return `Season ${season}`;
        if (episode) return `Episode ${episode}`;
        return '';
    };

    // --- Mobile center controls (Netflix-style: ⟲10  ▶/⏸  10⟳) ---
    const revealMobileControls = () => {
        setShowMobileControls(true);
        if (mobileControlsTimer.current) clearTimeout(mobileControlsTimer.current);
        mobileControlsTimer.current = setTimeout(() => setShowMobileControls(false), 3500);
    };

    const mobileTogglePlay = () => {
        const p = playerRef.current;
        if (!p) return;
        if (p.getState?.() === 'playing') p.pause(); else p.play();
        revealMobileControls();
    };

    const mobileSkip = (delta: number) => {
        const p = playerRef.current;
        if (!p) return;
        const pos = p.getPosition?.() || 0;
        const dur = p.getDuration?.() || 0;
        let next = pos + delta;
        if (next < 0) next = 0;
        if (dur && next > dur) next = dur;
        lastSeekTime.current = next;
        p.seek(next);
        revealMobileControls();
    };

    const MobileCenterControls = (
        <div
            className="absolute inset-0 z-30 md:hidden"
            onClick={revealMobileControls}
        >
            <div
                className={`absolute inset-0 flex items-center justify-center gap-8 transition-opacity duration-300 ${showMobileControls || isPaused || isBuffering ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Rewind 10s */}
                <button
                    onClick={(e) => { e.stopPropagation(); mobileSkip(-10); }}
                    className="relative flex items-center justify-center w-12 h-12 rounded-full bg-black/50 active:bg-black/70 text-white transition-transform active:scale-90"
                    aria-label="Rewind 10 seconds"
                >
                    <RotateCcw className="w-7 h-7" />
                    <span className="absolute text-[9px] font-bold">10</span>
                </button>

                {/* Play / Pause */}
                <button
                    onClick={(e) => { e.stopPropagation(); mobileTogglePlay(); }}
                    className="flex items-center justify-center w-16 h-16 rounded-full bg-black/50 active:bg-black/70 text-white transition-transform active:scale-90"
                    aria-label={isPaused ? 'Play' : 'Pause'}
                >
                    {isPaused ? <Play className="w-9 h-9 fill-white ml-1" /> : <Pause className="w-9 h-9 fill-white" />}
                </button>

                {/* Forward 10s */}
                <button
                    onClick={(e) => { e.stopPropagation(); mobileSkip(10); }}
                    className="relative flex items-center justify-center w-12 h-12 rounded-full bg-black/50 active:bg-black/70 text-white transition-transform active:scale-90"
                    aria-label="Forward 10 seconds"
                >
                    <RotateCw className="w-7 h-7" />
                    <span className="absolute text-[9px] font-bold">10</span>
                </button>
            </div>
        </div>
    );

    // Netflix-style red buffering spinner
    const BufferingSpinner = (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <svg className="sv-netflix-spinner" viewBox="0 0 100 100">
                <path d="M 50 6 A 44 44 0 1 0 93.33154113253715 42.35948018265508 L 93.33154113253715 42.35948018265508 L 93.56951842150025 44.13497904790192 L 93.73483947929266 45.91717735867647 L 93.82735370654136 47.7031057203878 L 93.84703170596498 49.48979359460872 L 93.7939651254764 51.2742742399326 L 93.66836630012381 53.05358963814906 L 93.47056769380507 54.824795397559484 L 93.20102114202378 56.584965625302424 L 92.86029689728363 58.331197760628385 L 92.44908247904482 60.060617361138966 L 91.96818133048856 61.7703828340981 L 91.41851128465393 63.457690105028966 L 90.80110284282483 65.11977721592592 L 90.11709726835286 66.75392884554294 L 89.36774449940447 68.35748074436165 L 88.5544008844164 69.92782407699627 L 87.67852674433236 71.46240966496146 L 86.74168376597714 72.95875212290365 L 85.74553223119597 74.41443388159001 L 84.69182808665562 75.82710909114553 L 83.58241985945935 77.19450739824111 L 82.41924542397622 78.51443759115716 L 81.20432862552529 79.78479110687573 L 79.93977576678276 81.00354539459589 L 78.62777196300021 82.16876713031539 L 77.27057737232948 83.27861527737882 L 75.87052330774866 84.33134398815801 L 74.43000823726749 85.32530534230445 L 72.95149367926832 86.25895191729218 L 71.4375 87.1308391872578 L 69.89060212039254 87.93962774643731 L 68.31342513950277 88.68408535379669 L 66.70863988202257 89.36308879575999 L 65.07895837740006 89.97562556424398 L 63.427129278222 90.52079534752389 L 61.75593322559502 90.9978113317693 L 60.068178169337905 91.40600131140977 L 58.36669465086025 91.74480860681082 L 56.654331056648815 92.01379278806567 L 54.933948850322295 92.21263020403256 L 53.20841779123262 92.34111431607465 L 51.48061114760362 92.39915583628513 L 49.753400912190195 92.38678267030764 L 48.02965302842544 92.30413966518651 L 46.31222263498971 92.15148816300697 L 44.60394933669334 91.92920536140684 L 42.907652509505304 91.63778348236218 L 41.22612664749054 91.27782875096659 L 39.56213675933569 90.85006018623704 L 37.91841382204531 90.35530820628996 L 36.29765029928442 89.79451305053624 L 34.702495731719964 89.16872302184427 L 33.135552406583244 88.47909255191578 L 31.599371113528463 87.72688009340753 L 30.096446993708334 86.91344584261591 L 28.629215488818197 86.0402492968158 L 27.200048396683435 85.1088466506153 L 25.811250039773952 84.12088803594749 L 24.465053552831854 83.07811461057378 L 23.163617295586977 81.98235550021732 L 21.909021396317875 80.83552459968004 L 20.70326443178553 79.63961723852245 L 19.548260248831784 78.39670671710228 L 18.445834932687045 77.10894071897253 L 17.39772392678013 75.77853760583706 L 16.40556930858031 74.40778260144495 L 15.470917225734489 72.99902387098028 L 14.59521549648722 71.55466850266599 L 13.779811378089768 70.07717839845142 L 13.025949506618808 68.5690660807941 L 12.33477001133194 67.03289042267167 L 11.707306806391685 65.47125230807717 L 11.144486062488319 63.886790230353306 L 10.64712486058724 62.2821758358114 L 10.215930029718997 60.660109420160055 L 9.851497170419584 59.023315385332225 L 9.554309865116302 57.374537664353696 L 9.324739076439997 55.71653512193469 L 9.163042734129462 54.05207693849256 L 9.069365510878008 52.38393798532951 L 9.043738787156322 50.71489419868721 L 9.086080804730535 49.04771796039173 L 9.196197008279874 47.38517349277403 L 9.373780574206037 45.730012275516344 L 9.618413125415202 44.08496849202298 L 9.929565630545994 42.45275451285177 L 10.306599485811482 40.83605642366681 L 10.74876777732198 39.23752960508588 L 11.255216721458368 37.65979437169539 L 11.824987280572472 36.105431677394705 L 12.45701695100415 34.57697889410735 L 13.15014172012198 33.076925670762265 L 13.903098188818745 31.607709879301606 L 14.714525855623556 30.171713654313407 L 15.582969558328813 28.771259532721235 L 16.50688206877632 27.408606699781824 L 17.48462683619733 26.085947347455708 L 18.514480874263715 24.8054031510148 L 19.59463778677507 23.569021869544937 L 20.72321092668479 22.378774075783472 L 21.898236682955822 21.236550020506407 L 23.11767788953287 20.14415663644569 L 24.37942735052477 19.103314686475475 L 25.681311475507595 18.115656060556592 L 27.021094018686227 17.18272122567226 L 28.396479915490694 16.305956832724824 L 29.805119210032093 15.486713484094487 L 31.244611066703673 14.726243665285857 L 32.71250785908485 14.025699843807985 L 34.2063193291886 13.386132738149087 L 35.7235168099891 12.808489759417725 L 37.26153750407252 12.293613627929702 L 38.817788811175255 11.842241166723078 L 40.3896526973032 11.455002273686041 L 41.974490098072266 11.13241907367967 L 43.56964534886426 10.874905251736237 L 45.1724506343636 10.682765568108131 L 46.7802304500195 10.556195555638674 L 48.39030606797384 10.49528139962014 L 50 10.5 A 2.25 2.25 0 0 1 50 6 Z" fill="#e50914" />
            </svg>
        </div>
    );

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
                /* Hide JW's default buffering icon — we render our own Netflix-style spinner */
                .jwplayer.jw-state-buffering .jw-icon-display .jw-svg-icon-buffer,
                .jwplayer .jw-icon-display .jw-svg-icon-buffer {
                    display: none !important;
                }
                /* Netflix-style red ring spinner */
                .sv-netflix-spinner {
                    width: 64px;
                    height: 64px;
                    animation: sv-netflix-spin 0.9s linear infinite;
                }
                @keyframes sv-netflix-spin {
                    to { transform: rotate(360deg); }
                }
                /* Hide custom audio menu when JWPlayer user is inactive */
                .jwplayer.jw-flag-user-inactive #audio-menu-container {
                    opacity: 0 !important;
                    pointer-events: none !important;
                    visibility: hidden !important;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
                }
                .jwplayer.jw-flag-user-active #audio-menu-container {
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    visibility: visible !important;
                    transition: opacity 0.3s ease, visibility 0.3s ease;
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
                {/* Netflix-style buffering spinner */}
                {isBuffering && (
                    playerContainer
                        ? createPortal(BufferingSpinner, playerContainer)
                        : BufferingSpinner
                )}
                {/* Mobile-only center controls: ⟲10  ▶/⏸  10⟳ */}
                {isMobile && !isIdle && (
                    playerContainer
                        ? createPortal(MobileCenterControls, playerContainer)
                        : MobileCenterControls
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
