
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessageProps {
    src: string;
    duration?: number;
    isMe?: boolean;
}

export function VoiceMessage({ src, duration: initialDuration, isMe = false }: VoiceMessageProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const [waveform, setWaveform] = useState<number[]>([]);
    const [error, setError] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Format time (MM:SS)
    const formatTime = (time: number) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const audio = new Audio(src);
        audioRef.current = audio;

        // Wait for metadata to get duration if not provided
        audio.onloadedmetadata = () => {
            if (!initialDuration && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.ontimeupdate = () => {
            setCurrentTime(audio.currentTime);
        };

        audio.onerror = () => {
            console.error('Audio load error:', src);
            setError(true);
            setIsLoading(false);
        };

        // Analyze Audio for Waveform
        const analyzeAudio = async () => {
            try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                // Get raw PCM data
                const rawData = audioBuffer.getChannelData(0); // Left channel
                const samples = 25; // REDUCED: Number of bars to display for compact view
                const blockSize = Math.floor(rawData.length / samples);
                const filteredData = [];

                // Normalize data to 0-1 range for bar height
                for (let i = 0; i < samples; i++) {
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[i * blockSize + j]);
                    }
                    filteredData.push(sum / blockSize);
                }

                // Normalize relative to the loudest point
                const multiplier = Math.pow(Math.max(...filteredData), -1);
                const normalizedData = filteredData.map(n => Math.max(0.2, n * multiplier)); // Min height 20%

                setWaveform(normalizedData);
                setIsLoading(false);

                // Update duration if we have the precise buffer duration
                if (!initialDuration) {
                    setDuration(audioBuffer.duration);
                }

            } catch (err) {
                console.error('Waveform analysis failed:', err);
                // Fallback to random waveform if analysis fails (e.g., CORS or format issue)
                setWaveform(Array.from({ length: 25 }, () => Math.random() * 0.5 + 0.3));
                setIsLoading(false);
            }
        };

        analyzeAudio();

        return () => {
            audio.pause();
            audioRef.current = null;
        };
    }, [src]);

    useEffect(() => {
        if (!isPlaying || !audioRef.current) return;

        let animationFrame: number;

        const loop = () => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                animationFrame = requestAnimationFrame(loop);
            }
        };

        loop();

        return () => {
            cancelAnimationFrame(animationFrame);
        };
    }, [isPlaying]);

    const togglePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    if (error) {
        return (
            <div className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-xs",
                isMe ? "bg-red-500/20 text-red-200" : "bg-red-500/10 text-red-500"
            )}>
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load audio</span>
            </div>
        );
    }

    const primaryColor = isMe ? "bg-white" : "bg-primary";
    const secondaryColor = isMe ? "bg-white/40" : "bg-primary/30";

    return (
        <div className={cn(
            "flex items-center gap-2 p-2 rounded-2xl min-w-[120px] transition-all",
        )}>
            <Button
                type="button" // EXPLICIT: Prevent form submission
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 rounded-full shrink-0 transition-all", // Slightly smaller button
                    isMe
                        ? "bg-white/20 hover:bg-white/30 text-white"
                        : "bg-primary/10 hover:bg-primary/20 text-primary"
                )}
                onClick={togglePlay}
                disabled={isLoading}
            >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
            </Button>

            <div className="flex flex-col gap-1 flex-1">
                {/* Waveform Visualization */}
                <div className="flex items-center gap-[2px] h-8 w-full">
                    {isLoading ? (
                        // Loading Skeleton
                        Array.from({ length: 25 }).map((_, i) => (
                            <div
                                key={i}
                                className={cn("w-1 rounded-full animate-pulse", secondaryColor)}
                                style={{ height: '40%' }}
                            />
                        ))
                    ) : (
                        waveform.map((height, index) => {
                            const progress = (index / waveform.length) * duration;
                            const isPlayed = currentTime > progress;

                            return (
                                <div
                                    key={index}
                                    className={cn(
                                        "w-1 rounded-full transition-all duration-75",
                                        isPlayed ? primaryColor : secondaryColor
                                    )}
                                    style={{
                                        height: `${height * 100}%`,
                                        minHeight: '10%'
                                    }}
                                />
                            );
                        })
                    )}
                </div>

                {/* Timer */}
                <span className={cn(
                    "text-[10px] font-medium font-mono ml-0.5",
                    isMe ? "text-white/80" : "text-muted-foreground"
                )}>
                    {isPlaying ? formatTime(currentTime) : formatTime(duration)}
                </span>
            </div>
        </div>
    );
}
