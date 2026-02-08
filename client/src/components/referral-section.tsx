import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Copy, Gift, Trophy, Loader2, Check, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ReferralCode {
    code: string;
}

interface ReferralLeader {
    userId: string;
    username: string;
    referralCount: number;
}

interface ReferralSectionProps {
    showLeaderboard?: boolean;
}

export function ReferralSection({ showLeaderboard = true }: ReferralSectionProps) {
    const { user, refetchUser } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [applyCode, setApplyCode] = useState('');
    const [copied, setCopied] = useState(false);

    // Get user's referral code
    const { data: referralData, isLoading: loadingCode } = useQuery<ReferralCode>({
        queryKey: ['/api/user/referral-code'],
    });

    // Get referral leaderboard
    const { data: leaderboard } = useQuery<ReferralLeader[]>({
        queryKey: ['/api/referral-leaderboard'],
    });

    // Apply referral code mutation
    const applyMutation = useMutation({
        mutationFn: async (code: string) => {
            return apiRequest('POST', '/api/referral/apply', { code });
        },
        onSuccess: () => {
            queryClient.invalidateQueries();
            refetchUser();
            setApplyCode('');
            toast({
                title: '🎉 Referral Code Applied!',
                description: 'You earned 50 XP welcome bonus!',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to apply code',
                description: error.message || 'Invalid or already used code',
                variant: 'destructive',
            });
        },
    });

    const copyCode = () => {
        if (referralData?.code) {
            navigator.clipboard.writeText(referralData.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: 'Referral code copied!' });
        }
    };

    const hasUsedReferral = user?.referredBy !== undefined && user?.referredBy !== null;

    return (
        <div className="space-y-6">
            {/* Your referral code */}
            <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Your Referral Code
                    </CardTitle>
                    <CardDescription>
                        Share your code with friends. You earn 100 XP for each friend who joins!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Input
                                value={loadingCode ? 'Loading...' : referralData?.code || ''}
                                readOnly
                                className="bg-background/50 font-mono text-lg tracking-wider"
                            />
                        </div>
                        <Button onClick={copyCode} disabled={loadingCode}>
                            {copied ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </Button>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-background/30 flex items-center justify-between">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Your referrals:</span>
                            <span className="ml-2 font-bold text-primary">{user?.referralCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Gift className="w-4 h-4 text-yellow-400" />
                            <span>
                                <span className="font-bold text-yellow-400">{(user?.referralCount || 0) * 100}</span>
                                <span className="text-muted-foreground"> XP earned</span>
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Apply referral code (only if not used one already) */}
            {!hasUsedReferral && (
                <Card className="bg-card/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-yellow-400" />
                            Have a Referral Code?
                        </CardTitle>
                        <CardDescription>
                            Enter a friend's referral code to get 50 XP welcome bonus!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input
                                value={applyCode}
                                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                                placeholder="Enter code..."
                                className="bg-background/50 font-mono tracking-wider"
                                maxLength={8}
                            />
                            <Button
                                onClick={() => applyMutation.mutate(applyCode)}
                                disabled={!applyCode || applyMutation.isPending}
                            >
                                {applyMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Apply'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mini referral leaderboard */}
            {showLeaderboard && leaderboard && leaderboard.length > 0 && (
                <Card className="bg-card/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            Top Referrers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {leaderboard.slice(0, 5).map((leader, index) => (
                                <motion.div
                                    key={leader.userId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center justify-between p-2 rounded-lg bg-background/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                            index === 1 ? 'bg-gray-400/20 text-gray-300' :
                                                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-muted text-muted-foreground'
                                            }`}>
                                            {index + 1}
                                        </span>
                                        <span className="font-medium">{leader.username}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-semibold">{leader.referralCount}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
