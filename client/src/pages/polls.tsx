import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart2, CheckCircle2, Clock, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface PollResult {
    optionIndex: number;
    count: number;
}

interface Poll {
    id: string;
    question: string;
    options: string[];
    endDate: string | null;
    featured: boolean;
    createdAt: string;
    results?: PollResult[];
    userVote?: number | null;
}

export default function PollsPage() {
    const { isAuthenticated } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [votingPollId, setVotingPollId] = useState<string | null>(null);

    const { data: polls, isLoading } = useQuery<Poll[]>({
        queryKey: ['/api/polls'],
    });

    const voteMutation = useMutation({
        mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
            return apiRequest(`/api/polls/${pollId}/vote`, {
                method: 'POST',
                body: JSON.stringify({ optionIndex }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
            toast({ title: 'Vote submitted!' });
            setVotingPollId(null);
        },
        onError: (error: any) => {
            toast({ title: error.message || 'Failed to vote', variant: 'destructive' });
            setVotingPollId(null);
        },
    });

    const handleVote = (pollId: string, optionIndex: number) => {
        if (!isAuthenticated) {
            toast({ title: 'Please log in to vote', variant: 'destructive' });
            return;
        }
        setVotingPollId(pollId);
        voteMutation.mutate({ pollId, optionIndex });
    };

    const PollCard = ({ poll }: { poll: Poll }) => {
        const [selectedPollData, setSelectedPollData] = useState<Poll | null>(null);

        // Fetch poll with results when needed
        const { data: pollWithResults } = useQuery<Poll>({
            queryKey: [`/api/polls/${poll.id}`],
            enabled: selectedPollData !== null || poll.userVote !== undefined,
        });

        const displayPoll = pollWithResults || poll;
        const hasVoted = displayPoll.userVote !== undefined && displayPoll.userVote !== null;
        const totalVotes = displayPoll.results?.reduce((sum, r) => sum + r.count, 0) || 0;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-xl border ${poll.featured
                        ? 'bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/30'
                        : 'bg-card/50 border-white/10'
                    }`}
            >
                {/* Poll header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        {poll.featured && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium mb-2">
                                Featured
                            </span>
                        )}
                        <h3 className="text-xl font-bold">{poll.question}</h3>
                    </div>
                    {poll.endDate && (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(poll.endDate), { addSuffix: true })}
                        </div>
                    )}
                </div>

                {/* Options */}
                <div className="space-y-3">
                    {displayPoll.options.map((option, index) => {
                        const result = displayPoll.results?.find(r => r.optionIndex === index);
                        const voteCount = result?.count || 0;
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const isSelected = displayPoll.userVote === index;
                        const isVoting = votingPollId === poll.id;

                        return (
                            <motion.button
                                key={index}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${hasVoted
                                        ? isSelected
                                            ? 'border-primary bg-primary/10'
                                            : 'border-white/10 bg-card/30'
                                        : 'border-white/10 bg-card/30 hover:border-primary/50 hover:bg-primary/5'
                                    }`}
                                onClick={() => !hasVoted && handleVote(poll.id, index)}
                                disabled={hasVoted || isVoting}
                                whileHover={!hasVoted ? { scale: 1.01 } : {}}
                                whileTap={!hasVoted ? { scale: 0.99 } : {}}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                        <span className="font-medium">{option}</span>
                                    </div>
                                    {hasVoted && (
                                        <span className="text-sm font-semibold">{percentage}%</span>
                                    )}
                                </div>

                                {hasVoted && (
                                    <div className="mt-2">
                                        <Progress
                                            value={percentage}
                                            className={`h-2 ${isSelected ? 'bg-primary/30' : 'bg-muted'}`}
                                        />
                                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                            <Users className="w-3 h-3" />
                                            {voteCount} vote{voteCount !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                )}

                                {isVoting && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Total votes */}
                {hasVoted && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</span>
                        <span>Created {formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}</span>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
                <BarChart2 className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Community Polls</h1>
                    <p className="text-muted-foreground">Vote on community topics and see what others think</p>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-muted/20 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : !polls || polls.length === 0 ? (
                <Card className="bg-card/50">
                    <CardContent className="py-12 text-center">
                        <BarChart2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Active Polls</h3>
                        <p className="text-muted-foreground">Check back later for new community polls!</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    <AnimatePresence>
                        {polls.map(poll => (
                            <PollCard key={poll.id} poll={poll} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
