import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

// Random generator helpers
const random = (min: number, max: number) => Math.random() * (max - min) + min;

interface Petal {
    id: number;
    left: string;
    animationDuration: number;
    delay: number;
    scale: number;
}

export function AnimeMotion() {
    const [petals, setPetals] = useState<Petal[]>([]);

    useEffect(() => {
        // Generate a fixed set of petals on mount
        const initialPetals = Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: `${random(0, 100)}%`,
            animationDuration: random(5, 10),
            delay: random(0, 5),
            scale: random(0.5, 1.2),
        }));
        setPetals(initialPetals);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <AnimatePresence>
                {petals.map((petal) => (
                    <motion.div
                        key={petal.id}
                        initial={{
                            top: -20,
                            left: petal.left,
                            opacity: 0,
                            rotate: 0,
                        }}
                        animate={{
                            top: '120%',
                            opacity: [0, 1, 1, 0],
                            rotate: 360,
                            x: [0, 20, -20, 0], // Swaying motion
                        }}
                        transition={{
                            duration: petal.animationDuration,
                            repeat: Infinity,
                            delay: petal.delay,
                            ease: "linear",
                            times: [0, 0.1, 0.9, 1]
                        }}
                        className="absolute w-3 h-3 bg-pink-300/60 rounded-full rounded-tr-none shadow-sm shadow-pink-400/20 blur-[0.5px]"
                        style={{
                            scale: petal.scale,
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
