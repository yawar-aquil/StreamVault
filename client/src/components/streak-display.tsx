import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, Trophy, Zap, Crown, Gift, Check, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import StreamCoin from '@/components/stream-coin';
import { useState } from 'react';

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastWatchDate: string | null;
    claimedMilestones?: number[];
}

const MILESTONES = [
    { days: 7, xp: 100, coins: 50, icon: '🔥', label: 'Week Warrior' },
    { days: 30, xp: 250, coins: 150, icon: '⚡', label: 'Monthly Master' },
    { days: 100, xp: 500, coins: 300, icon: '💎', label: 'Century Legend' },
    { days: 365, xp: 1000, coins: 500, icon: '👑', label: 'Year King' },
];

function getStreakTier(days: number) {
    if (days >= 365) return { name: 'Legendary!', color: 'from-yellow-400 via-amber-500 to-yellow-600', textColor: 'text-yellow-400', glowColor: 'shadow-yellow-500/40', ringColor: 'ring-yellow-500/50', bgGlow: 'bg-yellow-500' };
    if (days >= 100) return { name: 'Inferno!', color: 'from-purple-500 via-pink-500 to-red-500', textColor: 'text-purple-400', glowColor: 'shadow-purple-500/40', ringColor: 'ring-purple-500/50', bgGlow: 'bg-purple-500' };
    if (days >= 30) return { name: 'Blazing!', color: 'from-red-500 via-orange-500 to-yellow-500', textColor: 'text-red-400', glowColor: 'shadow-red-500/40', ringColor: 'ring-red-500/50', bgGlow: 'bg-red-500' };
    if (days >= 7) return { name: 'On Fire!', color: 'from-orange-500 to-red-500', textColor: 'text-orange-400', glowColor: 'shadow-orange-500/30', ringColor: 'ring-orange-500/40', bgGlow: 'bg-orange-500' };
    return { name: 'Starting Out', color: 'from-gray-500 to-gray-600', textColor: 'text-gray-400', glowColor: '', ringColor: 'ring-gray-500/20', bgGlow: 'bg-gray-500' };
}

// Fire particle component
function FireParticles({ intensity = 1 }: { intensity?: number }) {
    const count = Math.min(Math.floor(3 + intensity * 4), 12);
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: 3 + Math.random() * 4,
                        height: 3 + Math.random() * 4,
                        left: `${30 + Math.random() * 40}%`,
                        bottom: '20%',
                        background: `radial-gradient(circle, ${['#ff6b00', '#ff4500', '#ff8c00', '#ffa500', '#ffcc00'][i % 5]}, transparent)`,
                    }}
                    animate={{
                        y: [0, -30 - Math.random() * 40],
                        x: [0, (Math.random() - 0.5) * 20],
                        opacity: [0.8, 0],
                        scale: [1, 0.3],
                    }}
                    transition={{
                        duration: 1 + Math.random() * 1.5,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}

export function StreakDisplay({ compact = false }: { compact?: boolean }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

    const { data: streak, isLoading } = useQuery<StreakData>({
        queryKey: ['/api/user/streak'],
        enabled: true,
    });

    const claimMutation = useMutation({
        mutationFn: async (milestone: number) => {
            const res = await fetch('/api/user/claim-streak-reward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ milestone }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to claim reward');
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/user/streak'] });
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
            toast({
                title: `🎉 Milestone Reward Claimed!`,
                description: `You received ${data.xpAwarded} XP and ${data.coinsAwarded} StreamCoins!`,
            });
            setClaimingMilestone(null);
        },
        onError: (err: Error) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
            setClaimingMilestone(null);
        },
    });

    if (isLoading || !streak) {
        return null;
    }

    const hasActiveStreak = streak.currentStreak > 0;
    const tier = getStreakTier(streak.currentStreak);
    const claimed = streak.claimedMilestones || [];
    const intensity = Math.min(streak.currentStreak / 30, 3);

    // Find next milestone
    const nextMilestone = MILESTONES.find(m => streak.currentStreak < m.days);
    const progressToNext = nextMilestone
        ? Math.min((streak.currentStreak / nextMilestone.days) * 100, 100)
        : 100;

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold cursor-pointer ${hasActiveStreak
                                ? `bg-gradient-to-r ${tier.color} bg-opacity-20`
                                : 'bg-muted text-muted-foreground'
                                }`}
                            style={hasActiveStreak ? {
                                background: `linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,69,0,0.15))`,
                                boxShadow: streak.currentStreak >= 7 ? '0 0 12px rgba(255,107,0,0.3)' : undefined,
                            } : undefined}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                        >
                            {hasActiveStreak && streak.currentStreak >= 7 && <FireParticles intensity={0.5} />}
                            <motion.div
                                animate={hasActiveStreak ? { rotate: [0, -10, 10, -5, 5, 0] } : {}}
                                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                            >
                                <Flame className={`w-4 h-4 ${hasActiveStreak ? tier.textColor : 'text-muted-foreground'}`} />
                            </motion.div>
                            <span className={hasActiveStreak ? tier.textColor : ''}>{streak.currentStreak}</span>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="space-y-1">
                        <p className="font-bold">{streak.currentStreak}-day streak {tier.name}</p>
                        <p className="text-xs text-muted-foreground">Best: {streak.longestStreak} days</p>
                        {nextMilestone && (
                            <p className="text-xs text-orange-400">{nextMilestone.days - streak.currentStreak} days to {nextMilestone.label}!</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Full version for profile
    return (
        <div className="relative rounded-2xl border border-orange-500/20">
            {/* Animated gradient background */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${hasActiveStreak ? 'from-orange-500/10 via-red-500/8 to-yellow-500/10' : 'from-muted/30 to-muted/10'}`} />
            {hasActiveStreak && streak.currentStreak >= 7 && (
                <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                        className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full ${tier.bgGlow} blur-3xl`}
                        animate={{ opacity: [0.05, 0.15, 0.05] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        style={{ opacity: 0.1 }}
                    />
                </div>
            )}

            <div className="relative p-5 space-y-5">
                {/* Header: Fire icon + count + tier */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {hasActiveStreak && streak.currentStreak >= 3 && <FireParticles intensity={intensity} />}
                        <motion.div
                            className={`relative p-3.5 rounded-2xl ${hasActiveStreak
                                ? `bg-gradient-to-br ${tier.color} shadow-lg ${tier.glowColor}`
                                : 'bg-muted'
                                }`}
                            animate={hasActiveStreak ? {
                                scale: [1, 1.05, 1],
                                boxShadow: streak.currentStreak >= 7 ? [
                                    '0 0 15px rgba(255,107,0,0.2)',
                                    '0 0 25px rgba(255,107,0,0.4)',
                                    '0 0 15px rgba(255,107,0,0.2)',
                                ] : undefined,
                            } : {}}
                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        >
                            <motion.div
                                animate={hasActiveStreak ? { rotate: [0, -8, 8, -4, 4, 0] } : {}}
                                transition={{ repeat: Infinity, duration: 2, repeatDelay: 2 }}
                            >
                                <Flame className="w-8 h-8 text-white drop-shadow-md" />
                            </motion.div>
                        </motion.div>
                        {/* Pulsing ring */}
                        {hasActiveStreak && streak.currentStreak >= 7 && (
                            <motion.div
                                className={`absolute inset-0 rounded-2xl ring-2 ${tier.ringColor}`}
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                            <motion.span
                                className={`text-4xl font-black ${tier.textColor}`}
                                key={streak.currentStreak}
                                initial={{ scale: 1.3, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                {streak.currentStreak}
                            </motion.span>
                            <span className="text-muted-foreground font-medium">day streak</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${tier.color} text-white`}>
                                {tier.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Best: <span className="text-foreground font-bold">{streak.longestStreak}</span> days
                            </span>
                        </div>
                    </div>
                </div>

                {/* Next milestone progress */}
                {nextMilestone && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                                Next: <span className="font-semibold text-foreground">{nextMilestone.label}</span>
                            </span>
                            <span className="font-mono text-muted-foreground">
                                {streak.currentStreak}/{nextMilestone.days} days
                            </span>
                        </div>
                        <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden">
                            <motion.div
                                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${tier.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressToNext}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                            {/* Shimmer effect */}
                            {hasActiveStreak && (
                                <motion.div
                                    className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                    animate={{ x: ['-100%', '400%'] }}
                                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Milestone Rewards Track */}
                <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" /> Milestone Rewards
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MILESTONES.map((milestone) => {
                            const reached = streak.currentStreak >= milestone.days || streak.longestStreak >= milestone.days;
                            const isClaimed = claimed.includes(milestone.days);
                            const canClaim = reached && !isClaimed;

                            return (
                                <motion.div
                                    key={milestone.days}
                                    className={`relative rounded-xl p-3 border transition-all ${reached
                                        ? canClaim
                                            ? 'border-orange-500/50 bg-gradient-to-b from-orange-500/15 to-orange-500/5 shadow-md shadow-orange-500/10'
                                            : 'border-green-500/30 bg-gradient-to-b from-green-500/10 to-green-500/5'
                                        : 'border-border/50 bg-muted/20 opacity-60'
                                        }`}
                                    whileHover={canClaim ? { scale: 1.03, y: -2 } : {}}
                                >
                                    {/* Glow for claimable */}
                                    {canClaim && (
                                        <motion.div
                                            className="absolute inset-0 rounded-xl ring-2 ring-orange-500/30"
                                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                        />
                                    )}

                                    <div className="text-center space-y-1.5 relative z-10">
                                        <span className="text-xl">{milestone.icon}</span>
                                        <div className="text-[11px] font-bold text-foreground">
                                            {milestone.days}d
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium leading-tight">
                                            {milestone.label}
                                        </div>

                                        {/* Rewards display */}
                                        <div className="space-y-0.5 pt-1 border-t border-border/30">
                                            <div className="flex items-center justify-center gap-1 text-[10px]">
                                                <Zap className="w-3 h-3 text-blue-400" />
                                                <span className="text-blue-400 font-bold">{milestone.xp} XP</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1 text-[10px]">
                                                <StreamCoin size="sm" className="inline-block" />
                                                <span className="text-yellow-400 font-bold">{milestone.coins}</span>
                                            </div>
                                        </div>

                                        {/* Status / Claim button */}
                                        {isClaimed ? (
                                            <div className="flex items-center justify-center gap-1 text-[10px] text-green-400 font-bold pt-1">
                                                <Check className="w-3 h-3" /> Claimed
                                            </div>
                                        ) : canClaim ? (
                                            <Button
                                                size="sm"
                                                className="w-full h-6 text-[10px] mt-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 font-bold"
                                                disabled={claimingMilestone === milestone.days}
                                                onClick={() => {
                                                    setClaimingMilestone(milestone.days);
                                                    claimMutation.mutate(milestone.days);
                                                }}
                                            >
                                                {claimingMilestone === milestone.days ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                                        <Gift className="w-3 h-3" />
                                                    </motion.div>
                                                ) : (
                                                    <>
                                                        <Gift className="w-3 h-3 mr-1" /> Claim
                                                    </>
                                                )}
                                            </Button>
                                        ) : (
                                            <div className="text-[10px] text-muted-foreground pt-1">
                                                {milestone.days - streak.currentStreak}d left
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
