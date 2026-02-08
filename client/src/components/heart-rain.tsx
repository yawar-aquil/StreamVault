
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Heart SVG components for better control/coloring
const Heart = ({ color, size, style }: { color: string; size: number; style?: any }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        style={style}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
);

export function HeartRain() {
    const [hearts, setHearts] = useState<{ id: number; x: number; delay: number; size: number; duration: number; color: string }[]>([]);

    useEffect(() => {
        // Generate static set of hearts to fall
        const heartCount = 40; // Neither too much nor too low
        const newHearts = Array.from({ length: heartCount }).map((_, i) => ({
            id: i,
            x: Math.random() * 100, // percentage
            delay: Math.random() * 5, // random start delay
            size: Math.random() * (30 - 15) + 15, // size between 15 and 30
            duration: Math.random() * (6 - 3) + 3, // duration between 3 and 6 seconds
            color: Math.random() > 0.6 ? '#ffffff' : '#ff69b4', // Mix of pink and white
        }));
        setHearts(newHearts);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-lg">
            {hearts.map((heart) => (
                <motion.div
                    key={heart.id}
                    initial={{ y: -50, opacity: 0 }}
                    animate={{
                        y: [-20, 800], // Fall down 800px covering full modal height
                        opacity: [0, 1, 1, 0],
                        rotate: [0, Math.random() * 360 - 180] // Random rotation
                    }}
                    transition={{
                        duration: heart.duration,
                        repeat: Infinity,
                        delay: heart.delay,
                        ease: "linear"
                    }}
                    style={{
                        position: 'absolute',
                        left: `${heart.x}%`,
                        top: -20,
                    }}
                >
                    <Heart color={heart.color} size={heart.size} />
                </motion.div>
            ))}
        </div>
    );
}
