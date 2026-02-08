import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Clock, Trophy, Star, Gift, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly';
    targetType: string;
    targetValue: number;
    xpReward: number;
    badgeReward: string | null;
    endDate: string;
    progress: number;
    completed: boolean;
    claimed: boolean;
}

export default function ChallengesPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

    const { data: challenges, isLoading } = useQuery<Challenge[]>({
        queryKey: ['/api/challenges'],
    });

    const claimMutation = useMutation({
        mutationFn: async (challengeId: string) => {
            return apiRequest(`/api/challenges/${challengeId}/claim`, { method: 'POST' });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
            toast({
                title: '🎉 Reward Claimed!',
                description: `You earned ${data.xpAwarded} XP${data.badgeAwarded ? ' and a new badge!' : '!'}`,
            });
        },
        onError: () => {
            toast({ title: 'Failed to claim reward', variant: 'destructive' });
        },
    });

    const dailyChallenges = challenges?.filter(c => c.type === 'daily') || [];
    const weeklyChallenges = challenges?.filter(c => c.type === 'weekly') || [];

    const getTargetLabel = (targetType: string) => {
        switch (targetType) {
            case 'watch_movie': return 'movies watched';
            case 'watch_show': return 'episodes watched';
            case 'watch_anime': return 'anime episodes watched';
            case 'watch_count': return 'items watched';
            default: return 'progress';
        }
    };

    const ChallengeCard = ({ challenge }: { challenge: Challenge }) => {
        const progressPercent = Math.min((challenge.progress / challenge.targetValue) * 100, 100);
        const timeLeft = formatDistanceToNow(new Date(challenge.endDate), { addSuffix: false });

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl border transition-all ${challenge.claimed
                        ? 'bg-green-500/10 border-green-500/30'
                        : challenge.completed
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-card/50 border-white/10'
                    }`}
            >
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${challenge.claimed
                                ? 'bg-green-500/20'
                                : challenge.completed
                                    ? 'bg-yellow-500/20'
                                    : 'bg-primary/20'
                            }`}>
                            <Target className={`w-5 h-5 ${challenge.claimed
                                    ? 'text-green-400'
                                    : challenge.completed
                                        ? 'text-yellow-400'
                                        : 'text-primary'
                                }`} />
                        </div>
                        <div>
                            <h4 className="font-semibold">{challenge.title}</h4>
                            <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </div>
                    </div>

                    {challenge.claimed ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Claimed
                        </span>
                    ) : (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Clock className="w-3 h-3" />
                            {timeLeft} left
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                    <Progress value={progressPercent} className="h-2" />
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            {challenge.progress}/{challenge.targetValue} {getTargetLabel(challenge.targetType)}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-4 h-4" />
                                {challenge.xpReward} XP
                            </span>
                            {challenge.badgeReward && (
                                <span className="flex items-center gap-1 text-purple-400">
                                    <Trophy className="w-4 h-4" />
                                    Badge
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Claim button */}
                {challenge.completed && !challenge.claimed && (
                    <Button
                        className="w-full mt-4"
                        onClick={() => claimMutation.mutate(challenge.id)}
                        disabled={claimMutation.isPending}
                    >
                        {claimMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Gift className="w-4 h-4 mr-2" />
                        )}
                        Claim Reward
                    </Button>
                )}
            </motion.div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
                <Target className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Challenges</h1>
                    <p className="text-muted-foreground">Complete challenges to earn XP and badges</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'daily' | 'weekly')}>
                <TabsList className="mb-6">
                    <TabsTrigger value="daily" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Daily ({dailyChallenges.length})
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Weekly ({weeklyChallenges.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="daily">
                    {isLoading ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 bg-muted/20 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : dailyChallenges.length === 0 ? (
                        <Card className="bg-card/50">
                            <CardContent className="py-12 text-center">
                                <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Daily Challenges</h3>
                                <p className="text-muted-foreground">Check back tomorrow for new challenges!</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {dailyChallenges.map(challenge => (
                                <ChallengeCard key={challenge.id} challenge={challenge} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="weekly">
                    {isLoading ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 bg-muted/20 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : weeklyChallenges.length === 0 ? (
                        <Card className="bg-card/50">
                            <CardContent className="py-12 text-center">
                                <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Weekly Challenges</h3>
                                <p className="text-muted-foreground">Check back next week for new challenges!</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {weeklyChallenges.map(challenge => (
                                <ChallengeCard key={challenge.id} challenge={challenge} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
