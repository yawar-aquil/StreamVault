import { useQuery } from "@tanstack/react-query";
import { Badge } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { icons, ShieldCheck, Lock, Star, Trophy, Zap, Clock, Users, Tv, Film } from "lucide-react";
import { useEffect } from "react";
import { motion } from "framer-motion";

interface AchievementDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    imageUrl?: string;
    category: "onboarding" | "viewing" | "genre" | "social" | "time" | "progression" | "secret";
}

const CATEGORY_CONFIG = {
    onboarding: { label: "Getting Started", icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    progression: { label: "Level Up", icon: Zap, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    viewing: { label: "Viewer Milestones", icon: Tv, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    genre: { label: "Genre Specialist", icon: Film, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    time: { label: "Habits", icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    social: { label: "Social", icon: Users, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
    secret: { label: "Secret", icon: Lock, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
};

export default function AchievementsPage() {
    const { user, refetchUser } = useAuth();

    useEffect(() => {
        refetchUser();
    }, [refetchUser]);

    const { data: allAchievements, isLoading } = useQuery<AchievementDef[]>({
        queryKey: ["/api/achievements"],
        queryFn: async () => {
            // Add cache-busting param to bypass browser 304 cache
            const res = await fetch(`/api/achievements?t=${Date.now()}`);
            if (!res.ok) throw new Error("Failed to fetch achievements");
            return res.json();
        },
        staleTime: 0, // Always refetch
    });

    const userBadges = user?.badges ? (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges) : [];
    const earnedBadgeIds = new Set(userBadges.map((b: Badge) => b.id));

    // Filter to count only SYSTEM achievements (exclude custom badges like VIP)
    const systemEarnedCount = allAchievements
        ? userBadges.filter((b: Badge) => allAchievements.some(a => a.id === b.id)).length
        : 0;

    const totalSystemCount = allAchievements?.length || 0;
    const progressPercentage = totalSystemCount > 0 ? (systemEarnedCount / totalSystemCount) * 100 : 0;

    // Group achievements by category
    const groupedAchievements = allAchievements?.reduce((acc, achievement) => {
        const cat = achievement.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(achievement);
        return acc;
    }, {} as Record<string, AchievementDef[]>) || {};

    const LucideIcon = ({ name, className }: { name: string; className?: string }) => {
        const PascalName = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
        const ResolvedIcon = (icons as any)[PascalName] || (icons as any)[name] || ShieldCheck;
        return <ResolvedIcon className={className} />;
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-purple-900/20 to-blue-900/10 border border-border">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 mb-2">
                        Achievements
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl">
                        Complete challenges, track your viewing habits, and earn badges to show off on your profile.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col items-end gap-2 w-full md:w-auto">
                    <div className="flex items-end gap-3 mb-1">
                        <span className="text-4xl font-bold font-mono text-purple-400">{systemEarnedCount}</span>
                        <span className="text-muted-foreground pb-1">/ {totalSystemCount} Unlocked</span>
                    </div>
                    <div className="w-full md:w-64 h-3 bg-secondary/50 rounded-full overflow-hidden backdrop-blur-sm border border-border">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-8 w-48 rounded-lg" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-40 rounded-2xl" />)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Debug Info - Remove in production */}
                    {/* <div className="p-4 bg-black/50 text-xs font-mono whitespace-pre-wrap">
                        {JSON.stringify(allAchievements?.[0], null, 2)}
                     </div> */}

                    {/* Define order of categories */}
                    {(['onboarding', 'progression', 'viewing', 'genre', 'time', 'social', 'secret', 'other'] as const).map((catKey) => {
                        const items = groupedAchievements[catKey];
                        if (!items?.length) return null;

                        const config = CATEGORY_CONFIG[catKey as keyof typeof CATEGORY_CONFIG] || { label: "Other Achievements", icon: Star, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/20" };
                        const CatIcon = config.icon;

                        return (
                            <section key={catKey} className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-border pb-4">
                                    <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
                                        <CatIcon className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">{config.label}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {items.map((achievement) => {
                                        const isUnlocked = earnedBadgeIds.has(achievement.id);
                                        const earnedData = userBadges.find((b: Badge) => b.id === achievement.id);

                                        return (
                                            <motion.div
                                                key={achievement.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                whileHover={{ y: -5 }}
                                                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${isUnlocked
                                                    ? `bg-gradient-to-br from-card to-card/50 ${config.border} shadow-lg shadow-black/20`
                                                    : "bg-card/30 border-border grayscale opacity-60 hover:grayscale-[0.5] hover:opacity-80"
                                                    }`}
                                            >
                                                {/* Card Background Glow */}
                                                {isUnlocked && (
                                                    <div className={`absolute -top-10 -right-10 w-32 h-32 ${config.bg} blur-[50px] rounded-full opacity-50`} />
                                                )}

                                                <div className="p-6 flex flex-col h-full relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`p-3 rounded-2xl ${isUnlocked ? `${config.bg} ${config.color}` : "bg-white/5 text-muted-foreground"}`}>
                                                            {achievement.imageUrl ? (
                                                                <img
                                                                    src={achievement.imageUrl}
                                                                    alt={achievement.name}
                                                                    className={`w-8 h-8 object-contain ${!isUnlocked ? "grayscale opacity-50" : ""}`}
                                                                />
                                                            ) : (
                                                                <LucideIcon name={achievement.icon} className="w-8 h-8" />
                                                            )}
                                                        </div>
                                                        {isUnlocked ? (
                                                            <div className="bg-green-500/20 text-green-400 p-1 rounded-full">
                                                                <Trophy className="w-3 h-3" />
                                                            </div>
                                                        ) : (
                                                            <Lock className="w-4 h-4 text-muted-foreground/30" />
                                                        )}
                                                    </div>

                                                    <div className="mt-auto">
                                                        <h3 className={`font-bold text-lg mb-1 leading-tight ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                                                            {achievement.name}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {achievement.description}
                                                        </p>
                                                    </div>

                                                    {isUnlocked && (
                                                        <div className="mt-4 pt-3 border-t border-border text-[10px] uppercase tracking-wider font-medium opacity-60">
                                                            Unlocked {new Date(earnedData.earnedAt).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
