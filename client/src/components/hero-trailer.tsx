import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroTrailerProps {
    youtubeId: string | null;
    backdropUrl: string;
    posterUrl: string;
    autoplay?: boolean;
}

const SETTINGS_KEY = 'streamvault_settings';

function getAutoplaySetting(): boolean {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            const settings = JSON.parse(raw);
            return settings.autoplayTrailers !== false; // default true
        }
    } catch { }
    return true;
}

export function HeroTrailer({ youtubeId, backdropUrl, posterUrl, autoplay = true }: HeroTrailerProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [showVideo, setShowVideo] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerContainerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`);

    const shouldAutoplay = autoplay && getAutoplaySetting() && !!youtubeId;

    // Load YouTube IFrame API
    useEffect(() => {
        if (!shouldAutoplay) return;

        // Check if API is already loaded
        if ((window as any).YT && (window as any).YT.Player) {
            setShowVideo(true);
            return;
        }

        // Check if script is already being loaded
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            // Wait for it to be ready
            const checkReady = setInterval(() => {
                if ((window as any).YT && (window as any).YT.Player) {
                    clearInterval(checkReady);
                    setShowVideo(true);
                }
            }, 100);
            return () => clearInterval(checkReady);
        }

        // Load the API
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);

        (window as any).onYouTubeIframeAPIReady = () => {
            setShowVideo(true);
        };

        return () => {
            // Don't remove the script since other instances might use it
        };
    }, [shouldAutoplay]);

    // Create player when API is ready and showVideo is true
    useEffect(() => {
        if (!showVideo || !youtubeId) return;

        const createPlayer = () => {
            if (!document.getElementById(playerContainerId.current)) return;

            try {
                playerRef.current = new (window as any).YT.Player(playerContainerId.current, {
                    videoId: youtubeId,
                    playerVars: {
                        autoplay: 1,
                        mute: 1,
                        controls: 0,
                        showinfo: 0,
                        modestbranding: 1,
                        rel: 0,
                        iv_load_policy: 3, // Hide annotations
                        fs: 0,
                        disablekb: 1,
                        playsinline: 1,
                        loop: 1,
                        playlist: youtubeId, // Required for loop to work
                        origin: window.location.origin,
                    },
                    events: {
                        onReady: (event: any) => {
                            event.target.playVideo();
                            // Small delay to avoid flash of black
                            setTimeout(() => setVideoReady(true), 500);
                        },
                        onStateChange: (event: any) => {
                            // If video ends, restart it
                            if (event.data === (window as any).YT.PlayerState.ENDED) {
                                event.target.playVideo();
                            }
                        },
                        onError: () => {
                            // On error, hide video and show backdrop
                            setShowVideo(false);
                            setVideoReady(false);
                        },
                    },
                });
            } catch {
                setShowVideo(false);
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(createPlayer, 100);

        return () => {
            clearTimeout(timer);
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch { }
                playerRef.current = null;
            }
        };
    }, [showVideo, youtubeId]);

    const toggleMute = useCallback(() => {
        if (!playerRef.current) return;
        try {
            if (isMuted) {
                playerRef.current.unMute();
                playerRef.current.setVolume(50);
            } else {
                playerRef.current.mute();
            }
            setIsMuted(!isMuted);
        } catch { }
    }, [isMuted]);

    return (
        <>
            {/* Mobile: Always show poster */}
            <div
                className="absolute inset-0 bg-cover bg-center md:hidden"
                style={{ backgroundImage: `url(${posterUrl})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            {/* Desktop: Video or backdrop */}
            <div className="absolute inset-0 hidden md:block">
                {/* Always render backdrop as base layer */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${backdropUrl})` }}
                />

                {/* YouTube video layer — pointer-events:none blocks YouTube's native UI overlays */}
                {shouldAutoplay && showVideo && (
                    <div
                        ref={containerRef}
                        className="absolute inset-0 overflow-hidden transition-opacity duration-1000"
                        style={{ opacity: videoReady ? 1 : 0, pointerEvents: 'none' }}
                    >
                        {/* Scale the iframe to cover the area like object-fit: cover */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                width: '100vw',
                                height: '56.25vw',
                                minHeight: '100%',
                                minWidth: '177.78vh',
                                transform: 'translate(-50%, -50%)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                id={playerContainerId.current}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Gradient overlays - always on top of video/backdrop */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
            </div>

            {/* Mute/Unmute button — high z-index to sit above hero content overlay */}
            {shouldAutoplay && videoReady && (
                <button
                    className="hidden md:flex items-center justify-center rounded-full w-11 h-11 transition-all hover:scale-110"
                    style={{
                        position: 'absolute',
                        bottom: '1.5rem',
                        right: '1.5rem',
                        zIndex: 50,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute trailer" : "Mute trailer"}
                >
                    {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                    ) : (
                        <Volume2 className="w-5 h-5" />
                    )}
                </button>
            )}
        </>
    );
}

/**
 * Extract a YouTube video ID from a blog post's trivia array.
 * Blog posts store trailer URLs as YouTube links in the trivia JSON array.
 */
export function extractTrailerFromBlogPost(blogPost: any): string | null {
    if (!blogPost?.trivia) return null;
    try {
        const triviaData: string[] = JSON.parse(blogPost.trivia);
        const trailerItem = triviaData.find((item: string) => item.includes('youtube.com/watch'));
        if (trailerItem) {
            const match = trailerItem.match(/https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
            if (match) return match[1];
        }
    } catch { }
    return null;
}
