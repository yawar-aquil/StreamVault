
import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    stream: MediaStream;
    isRecording: boolean;
    barColor?: string;
    gap?: number;
    barWidth?: number;
}

export function AudioVisualizer({
    stream,
    isRecording,
    barColor = "#ef4444", // default red-500
    gap = 2,
    barWidth = 4
}: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        if (!isRecording || !stream) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;

        // Create Analyser
        if (!analyserRef.current) {
            analyserRef.current = audioContext.createAnalyser();
            analyserRef.current.fftSize = 256; // Controls resolution
        }

        const analyser = analyserRef.current;

        // Create Source
        // Disconnect previous source if exists to avoid errors
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        sourceRef.current = audioContext.createMediaStreamSource(stream);
        sourceRef.current.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!isRecording) return;

            animationFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate number of bars that fit
            const totalBarWidth = barWidth + gap;
            const numBars = Math.floor(canvas.width / totalBarWidth);

            // We want to visualize roughly the speech frequency range (lower to mid)
            // So we pick a subset of dataArray or step through it
            const step = Math.floor(bufferLength / numBars);

            for (let i = 0; i < numBars; i++) {
                // Get average value for this chunk to make it smoother
                let sum = 0;
                for (let j = 0; j < step; j++) {
                    sum += dataArray[i * step + j] || 0;
                }
                const value = sum / step;

                // Normalize height
                const percent = value / 255;
                const height = Math.max(percent * canvas.height, 4); // Min height 4px

                // Draw rounded bar
                const x = i * totalBarWidth;
                const y = (canvas.height - height) / 2; // Center vertically

                ctx.fillStyle = barColor; // Use provided color

                // Rounded corners manual drawing or simple rect
                // For true rounded bars:
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, height, 50);
                ctx.fill();
            }
        };

        draw();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [stream, isRecording, barColor, gap, barWidth]);

    return (
        <canvas
            ref={canvasRef}
            width={160}
            height={40}
            className="w-full h-full"
        />
    );
}
