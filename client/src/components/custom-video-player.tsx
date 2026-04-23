import { useCallback, useEffect, useRef, useState } from "react";
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Settings,
    Subtitles,
    Upload,
    RotateCcw,
    RotateCw,
    Check,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomVideoPlayerProps {
    videoUrl: string;
    className?: string;
    autoplay?: boolean;
    fileName?: string;
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Converts an SRT subtitle file contents to WebVTT format so an HTML5
 * <track> element can consume it. Only lightweight transforms — replaces
 * comma timestamp separators with periods and prepends the WEBVTT header.
 */
function srtToVtt(srt: string): string {
    const normalized = srt.replace(/\r+/g, "");
    const converted = normalized.replace(
        /(\d{2}:\d{2}:\d{2}),(\d{3})\s-->\s(\d{2}:\d{2}:\d{2}),(\d{3})/g,
        "$1.$2 --> $3.$4"
    );
    return "WEBVTT\n\n" + converted;
}

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CustomVideoPlayer({
    videoUrl,
    className,
    autoplay = false,
    fileName,
}: CustomVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
    const [subtitleLabel, setSubtitleLabel] = useState<string>("");
    const [ccEnabled, setCcEnabled] = useState(true);
    const [seekingHover, setSeekingHover] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // --- video element event wiring ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onDurationChange = () => setDuration(video.duration || 0);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onVolumeChange = () => {
            setVolume(video.volume);
            setMuted(video.muted);
        };
        const onRateChange = () => setPlaybackRate(video.playbackRate);
        const onProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };
        const onWaiting = () => setLoading(true);
        const onCanPlay = () => setLoading(false);
        const onPlaying = () => setLoading(false);

        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("durationchange", onDurationChange);
        video.addEventListener("loadedmetadata", onDurationChange);
        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("volumechange", onVolumeChange);
        video.addEventListener("ratechange", onRateChange);
        video.addEventListener("progress", onProgress);
        video.addEventListener("waiting", onWaiting);
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("playing", onPlaying);

        return () => {
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("durationchange", onDurationChange);
            video.removeEventListener("loadedmetadata", onDurationChange);
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("volumechange", onVolumeChange);
            video.removeEventListener("ratechange", onRateChange);
            video.removeEventListener("progress", onProgress);
            video.removeEventListener("waiting", onWaiting);
            video.removeEventListener("canplay", onCanPlay);
            video.removeEventListener("playing", onPlaying);
        };
    }, []);

    // Whenever subtitle track source/enabled state changes, explicitly flip the
    // TextTrack mode. React's <track default> is unreliable — browsers often
    // leave the track mode as "disabled" without this.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const applyTrackState = () => {
            const tracks = video.textTracks;
            for (let i = 0; i < tracks.length; i++) {
                tracks[i].mode =
                    subtitleUrl && ccEnabled ? "showing" : "hidden";
            }
        };

        // textTracks list updates async after <track> renders — apply a few times
        applyTrackState();
        const t1 = setTimeout(applyTrackState, 100);
        const t2 = setTimeout(applyTrackState, 500);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [subtitleUrl, ccEnabled]);

    // Free blob URLs on unmount so we don't leak memory between uploads
    useEffect(() => {
        return () => {
            if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
        };
    }, [subtitleUrl]);

    // Fullscreen state sync (user might exit via Esc)
    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    // --- controls auto-hide ---
    const showControlsTemporarily = useCallback(() => {
        setControlsVisible(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (videoRef.current && !videoRef.current.paused) {
            controlsTimeoutRef.current = setTimeout(() => {
                setControlsVisible(false);
                setSettingsOpen(false);
            }, 2500);
        }
    }, []);

    useEffect(() => {
        showControlsTemporarily();
    }, [playing, showControlsTemporarily]);

    // --- keyboard shortcuts ---
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Don't hijack typing in form fields
            const target = e.target as HTMLElement;
            if (
                target &&
                (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
            ) {
                return;
            }
            const video = videoRef.current;
            if (!video) return;

            switch (e.key.toLowerCase()) {
                case " ":
                case "k":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "arrowleft":
                    e.preventDefault();
                    seekBy(-5);
                    break;
                case "arrowright":
                    e.preventDefault();
                    seekBy(5);
                    break;
                case "j":
                    e.preventDefault();
                    seekBy(-10);
                    break;
                case "l":
                    e.preventDefault();
                    seekBy(10);
                    break;
                case "arrowup":
                    e.preventDefault();
                    setVol(Math.min(1, video.volume + 0.1));
                    break;
                case "arrowdown":
                    e.preventDefault();
                    setVol(Math.max(0, video.volume - 0.1));
                    break;
                case "m":
                    e.preventDefault();
                    toggleMute();
                    break;
                case "f":
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case "c":
                    e.preventDefault();
                    if (subtitleUrl) setCcEnabled((v) => !v);
                    break;
            }
            showControlsTemporarily();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subtitleUrl]);

    // --- control actions ---
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => { });
        else video.pause();
    };

    const seekTo = (t: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = Math.max(0, Math.min(duration, t));
    };

    const seekBy = (delta: number) => {
        const video = videoRef.current;
        if (!video) return;
        seekTo(video.currentTime + delta);
    };

    const setVol = (v: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.volume = v;
        if (v > 0 && video.muted) video.muted = false;
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
    };

    const setRate = (r: number) => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = r;
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await containerRef.current.requestFullscreen();
            }
        } catch {
            // user denied or fullscreen unsupported
        }
    };

    // --- subtitle upload ---
    const handleSubtitleUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting same file
        if (!file) return;

        try {
            const text = await file.text();
            const lower = file.name.toLowerCase();
            const isSrt = lower.endsWith(".srt");
            const vttContent = isSrt ? srtToVtt(text) : text;
            const blob = new Blob([vttContent], { type: "text/vtt" });
            const url = URL.createObjectURL(blob);

            if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);

            setSubtitleUrl(url);
            setSubtitleLabel(file.name);
            setCcEnabled(true);
        } catch (err) {
            console.error("Failed to load subtitle file", err);
        }
    };

    const clearSubtitle = () => {
        if (subtitleUrl) URL.revokeObjectURL(subtitleUrl);
        setSubtitleUrl(null);
        setSubtitleLabel("");
    };

    // --- seek bar mouse handling ---
    const seekBarRef = useRef<HTMLDivElement>(null);
    const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!seekBarRef.current || duration === 0) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        seekTo(pct * duration);
    };
    const handleSeekBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!seekBarRef.current || duration === 0) return;
        const rect = seekBarRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setSeekingHover(pct * duration);
    };

    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative group bg-black overflow-hidden select-none",
                className
            )}
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => {
                if (playing) setControlsVisible(false);
            }}
            data-testid="custom-video-player"
        >
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain bg-black"
                autoPlay={autoplay}
                playsInline
                onClick={togglePlay}
                crossOrigin="anonymous"
            >
                {subtitleUrl && (
                    <track
                        kind="subtitles"
                        src={subtitleUrl}
                        srcLang="en"
                        label={subtitleLabel || "Uploaded subtitles"}
                        default
                    />
                )}
            </video>

            {/* Center loading spinner */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-primary animate-spin" />
                </div>
            )}

            {/* Big play button (when paused and controls visible) */}
            {!playing && !loading && (
                <button
                    onClick={togglePlay}
                    aria-label="Play"
                    className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-all"
                >
                    <Play className="h-10 w-10 text-white fill-white ml-1" />
                </button>
            )}

            {/* Top overlay: filename */}
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity",
                    controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
            >
                <div className="flex items-center justify-between gap-4">
                    <p className="text-white text-sm font-medium truncate">
                        {fileName || "Playing"}
                    </p>
                    {subtitleLabel && (
                        <div className="flex items-center gap-2 text-xs text-white/80 bg-white/10 backdrop-blur px-2 py-1 rounded">
                            <Subtitles className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">
                                {subtitleLabel}
                            </span>
                            <button
                                onClick={clearSubtitle}
                                aria-label="Remove subtitle"
                                className="hover:text-white"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom controls */}
            <div
                className={cn(
                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity",
                    controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Seek bar */}
                <div className="px-4 pt-8">
                    <div
                        ref={seekBarRef}
                        className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/seek hover:h-2 transition-all"
                        onClick={handleSeekBarClick}
                        onMouseMove={handleSeekBarHover}
                        onMouseLeave={() => setSeekingHover(null)}
                        role="slider"
                        aria-label="Seek"
                        aria-valuemin={0}
                        aria-valuemax={duration}
                        aria-valuenow={currentTime}
                    >
                        {/* Buffered */}
                        <div
                            className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
                            style={{ width: `${bufferedPct}%` }}
                        />
                        {/* Played */}
                        <div
                            className="absolute inset-y-0 left-0 bg-primary rounded-full"
                            style={{ width: `${progressPct}%` }}
                        />
                        {/* Scrubber knob */}
                        <div
                            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity"
                            style={{ left: `${progressPct}%` }}
                        />
                        {/* Hover time tooltip */}
                        {seekingHover !== null && (
                            <div
                                className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-black/90 rounded pointer-events-none"
                                style={{
                                    left: `${(seekingHover / duration) * 100}%`,
                                }}
                            >
                                {formatTime(seekingHover)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Control row */}
                <div className="px-4 py-3 flex items-center gap-2 sm:gap-3 text-white">
                    <button
                        onClick={togglePlay}
                        aria-label={playing ? "Pause" : "Play"}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        {playing ? (
                            <Pause className="h-5 w-5" />
                        ) : (
                            <Play className="h-5 w-5 fill-white" />
                        )}
                    </button>

                    <button
                        onClick={() => seekBy(-10)}
                        aria-label="Rewind 10 seconds"
                        className="hidden sm:flex p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <RotateCcw className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => seekBy(10)}
                        aria-label="Forward 10 seconds"
                        className="hidden sm:flex p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <RotateCw className="h-5 w-5" />
                    </button>

                    {/* Volume */}
                    <div className="group/vol flex items-center gap-2">
                        <button
                            onClick={toggleMute}
                            aria-label={muted ? "Unmute" : "Mute"}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            {muted || volume === 0 ? (
                                <VolumeX className="h-5 w-5" />
                            ) : (
                                <Volume2 className="h-5 w-5" />
                            )}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={muted ? 0 : volume}
                            onChange={(e) => setVol(parseFloat(e.target.value))}
                            aria-label="Volume"
                            className="w-0 group-hover/vol:w-20 transition-all duration-200 h-1 accent-primary cursor-pointer"
                        />
                    </div>

                    {/* Time */}
                    <div className="text-xs sm:text-sm tabular-nums ml-1">
                        <span>{formatTime(currentTime)}</span>
                        <span className="text-white/60"> / </span>
                        <span className="text-white/80">{formatTime(duration)}</span>
                    </div>

                    <div className="flex-1" />

                    {/* CC button */}
                    <button
                        onClick={() => {
                            if (subtitleUrl) {
                                setCcEnabled((v) => !v);
                            } else {
                                subtitleInputRef.current?.click();
                            }
                        }}
                        aria-label={
                            subtitleUrl
                                ? ccEnabled
                                    ? "Hide subtitles"
                                    : "Show subtitles"
                                : "Upload subtitles"
                        }
                        title={
                            subtitleUrl
                                ? ccEnabled
                                    ? "Subtitles on — click to hide"
                                    : "Subtitles off — click to show"
                                : "Upload subtitles (.srt or .vtt)"
                        }
                        className={cn(
                            "relative p-2 rounded-full transition-colors",
                            subtitleUrl && ccEnabled
                                ? "bg-white text-black hover:bg-white/90"
                                : "hover:bg-white/10"
                        )}
                    >
                        <Subtitles className="h-5 w-5" />
                        {!subtitleUrl && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-[8px] flex items-center justify-center">
                                +
                            </span>
                        )}
                    </button>

                    {/* Upload subtitle (distinct from CC toggle) */}
                    <button
                        onClick={() => subtitleInputRef.current?.click()}
                        aria-label="Upload subtitle file"
                        title="Upload subtitle file (.srt or .vtt)"
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <Upload className="h-5 w-5" />
                    </button>

                    {/* Settings (speed) */}
                    <div className="relative">
                        <button
                            onClick={() => setSettingsOpen((v) => !v)}
                            aria-label="Settings"
                            className={cn(
                                "p-2 rounded-full transition-colors",
                                settingsOpen
                                    ? "bg-white/20"
                                    : "hover:bg-white/10"
                            )}
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                        {settingsOpen && (
                            <div className="absolute bottom-full right-0 mb-2 min-w-[180px] bg-black/95 backdrop-blur border border-white/10 rounded-lg shadow-2xl overflow-hidden">
                                <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">
                                    Playback speed
                                </div>
                                <div className="py-1 max-h-64 overflow-y-auto">
                                    {PLAYBACK_RATES.map((r) => (
                                        <button
                                            key={r}
                                            onClick={() => {
                                                setRate(r);
                                                setSettingsOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-white/10 transition-colors"
                                        >
                                            <span>
                                                {r === 1 ? "Normal" : `${r}x`}
                                            </span>
                                            {playbackRate === r && (
                                                <Check className="h-4 w-4" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={toggleFullscreen}
                        aria-label={
                            isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                        }
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        {isFullscreen ? (
                            <Minimize className="h-5 w-5" />
                        ) : (
                            <Maximize className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Hidden subtitle file input */}
            <input
                ref={subtitleInputRef}
                type="file"
                accept=".vtt,.srt,text/vtt,application/x-subrip"
                className="hidden"
                onChange={handleSubtitleUpload}
            />
        </div>
    );
}
