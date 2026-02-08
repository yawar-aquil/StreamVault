import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastWatchDate: string | null;
}

export function StreakDisplay({ compact = false }: { compact?: boolean }) {
    const { data: streak, isLoading } = useQuery<StreakData>({
        queryKey: ['/api/user/streak'],
        enabled: true,
    });

    if (isLoading || !streak) {
        return null;
    }

    const hasActiveStreak = streak.currentStreak > 0;

    if (compact) {
        // Compact version for navbar
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-semibold ${hasActiveStreak
                                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400'
                                : 'bg-muted text-muted-foreground'
                                }`}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                        >
                            <Flame className={`w-4 h-4 ${hasActiveStreak ? 'text-orange-500' : ''}`} />
                            <span>{streak.currentStreak}</span>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{streak.currentStreak}-day streak</p>
                        <p className="text-xs text-muted-foreground">Best: {streak.longestStreak} days</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Full version for profile
    return (
        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-yellow-500/10 border border-orange-500/20">
            <div className="flex items-center gap-4">
                <motion.div
                    className={`p-3 rounded-full ${hasActiveStreak
                        ? 'bg-gradient-to-br from-orange-500 to-red-500'
                        : 'bg-muted'
                        }`}
                    animate={hasActiveStreak ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <Flame className="w-8 h-8 text-white" />
                </motion.div>

                <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-orange-400">{streak.currentStreak}</span>
                        <span className="text-muted-foreground">day streak</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Best: <span className="text-foreground font-medium">{streak.longestStreak} days</span>
                    </p>
                </div>

                {streak.currentStreak >= 7 && (
                    <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-medium">
                            🔥 On Fire!
                        </span>
                    </div>
                )}
            </div>

            {/* Streak milestones */}
            <div className="mt-4 flex gap-2">
                {[7, 30, 100, 365].map(milestone => (
                    <div
                        key={milestone}
                        className={`flex-1 text-center py-2 rounded-lg text-xs ${streak.currentStreak >= milestone
                            ? 'bg-orange-500/30 text-orange-300'
                            : 'bg-muted/50 text-muted-foreground'
                            }`}
                    >
                        {milestone}d {streak.currentStreak >= milestone ? '✓' : ''}
                    </div>
                ))}
            </div>
        </div>
    );
}
