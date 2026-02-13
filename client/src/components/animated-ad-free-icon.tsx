import { motion } from "framer-motion";

export function AnimatedAdFreeIcon({ className = "w-12 h-12" }: { className?: string }) {
    return (
        <div className={className}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                <motion.path
                    d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                />
                <motion.path
                    d="M7 7L17 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
                />
                <motion.text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fill="currentColor"
                    fontSize="6"
                    fontWeight="bold"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.8, repeat: Infinity, repeatDelay: 2.7 }}
                >
                    AD
                </motion.text>
            </svg>
        </div>
    );
}
